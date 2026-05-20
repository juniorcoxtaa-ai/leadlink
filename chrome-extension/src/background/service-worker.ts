type DetectorMessage =
  | { type: "WHATSAPP_PHONE_DETECTED"; phone: string | null }
  | { type: "WHATSAPP_CONVERSATION_CLOSED" };

type RuntimeMessage =
  | DetectorMessage
  | { type: "LEADLINK_GET_CURRENT_PHONE" }
  | { type: "LEADLINK_CLEAR_CURRENT_PHONE" }
  | { type: "LEADLINK_GET_WHATSAPP_STATE" }
  | { type: "LEADLINK_READ_WHATSAPP_MESSAGES" };

type WhatsappTabState = "WHATSAPP_TAB" | "NOT_WHATSAPP_TAB";

let currentPhone: string | null = null;
let activeTabState: WhatsappTabState = "NOT_WHATSAPP_TAB";
let currentWhatsappTabId: number | null = null;
let currentActiveTabId: number | null = null;
let currentFocusedWindowId: number | null = null;
let closeConversationTimer: number | undefined;
const isDev = import.meta.env.DEV;

function swLog(label: string, payload?: unknown) {
  if (!isDev) return;
  if (typeof payload === "undefined") {
    console.log(`[LeadLink][sw] ${label}`);
    return;
  }
  console.log(`[LeadLink][sw] ${label}`, payload);
}

function isWhatsappWebUrl(url?: string | null) {
  return typeof url === "string" && /^https:\/\/web\.whatsapp\.com\/?/i.test(url);
}

function clearConversationCloseTimer() {
  if (typeof closeConversationTimer === "number") {
    clearTimeout(closeConversationTimer);
    closeConversationTimer = undefined;
  }
}

async function broadcastState() {
  await chrome.runtime
    .sendMessage({
      type: "LEADLINK_WHATSAPP_STATE_CHANGED",
      tabState: activeTabState,
      phone: activeTabState === "WHATSAPP_TAB" ? currentPhone : null,
    })
    .catch(() => {});
}

async function setCurrentPhone(phone: string | null) {
  clearConversationCloseTimer();
  currentPhone = phone;
  await chrome.storage.local.set({ leadlinkCurrentPhone: phone });
  chrome.runtime.sendMessage({ type: "LEADLINK_CURRENT_PHONE_CHANGED", phone }).catch(() => {});
  await broadcastState();
  swLog("current phone updated", { phone, activeTabState });
}

async function setWhatsappTabState(tabState: WhatsappTabState) {
  activeTabState = tabState;
  if (tabState !== "WHATSAPP_TAB") {
    currentWhatsappTabId = null;
    await setCurrentPhone(null);
    return;
  }
  await broadcastState();
}

async function resolveActiveTabFromWindow(windowId?: number | null) {
  if (typeof windowId === "number" && windowId >= 0) {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    if (tabs[0]) return tabs[0];
  }

  if (typeof currentActiveTabId === "number") {
    try {
      return await chrome.tabs.get(currentActiveTabId);
    } catch {
      return null;
    }
  }

  const tabs = await chrome.tabs.query({ active: true });
  return tabs[0] ?? null;
}

async function syncActiveTabState(source = "unknown", hintedWindowId?: number | null) {
  const tab = await resolveActiveTabFromWindow(hintedWindowId ?? currentFocusedWindowId);
  swLog("active tab detected", {
    source,
    tabId: tab?.id,
    windowId: tab?.windowId,
    url: tab?.url,
    isWhatsapp: isWhatsappWebUrl(tab?.url),
  });

  const isWhatsapp = isWhatsappWebUrl(tab?.url);
  const wasWhatsapp = activeTabState === "WHATSAPP_TAB";
  const tabId = typeof tab?.id === "number" ? tab.id : null;
  currentActiveTabId = tabId;
  currentFocusedWindowId = typeof tab?.windowId === "number" ? tab.windowId : currentFocusedWindowId;

  if (isWhatsapp) {
    currentWhatsappTabId = tabId;
  }

  await setWhatsappTabState(isWhatsapp ? "WHATSAPP_TAB" : "NOT_WHATSAPP_TAB");

  // Ao voltar para o WhatsApp após estar em outra aba, o content script ainda
  // tem o telefone detectado em memória (lastPhone), mas o SW perdeu o valor
  // quando saiu. Enviamos FORCE_DETECT_CURRENT_CHAT para que o content script
  // publique imediatamente o telefone sem esperar por mutações do DOM.
  if (isWhatsapp && !wasWhatsapp && typeof tabId === "number") {
    swLog("transition NOT_WHATSAPP -> WHATSAPP_TAB; forcing re-detection", { tabId });
    chrome.tabs.sendMessage(tabId, { type: "FORCE_DETECT_CURRENT_CHAT" }).catch(() => {});
  }
}


chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  void chrome.storage.local.set({ leadlinkCurrentPhone: null });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (typeof tab.id !== "number") return;
  await setWhatsappTabState(isWhatsappWebUrl(tab.url) ? "WHATSAPP_TAB" : "NOT_WHATSAPP_TAB");
  await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});

chrome.runtime.onStartup.addListener(async () => {
  currentPhone = null;
  await chrome.storage.local.set({ leadlinkCurrentPhone: null });
  await syncActiveTabState("startup").catch(() => {});
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  currentActiveTabId = activeInfo.tabId;
  currentFocusedWindowId = activeInfo.windowId;
  swLog("tab activated", activeInfo);
  void syncActiveTabState("tabs.onActivated", activeInfo.windowId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active) return;
  currentActiveTabId = tabId;
  if (typeof tab.windowId === "number") currentFocusedWindowId = tab.windowId;
  if (changeInfo.status === "complete" || changeInfo.url) {
    swLog("active tab updated", { tabId: tab.id, status: changeInfo.status, url: tab.url });
    void syncActiveTabState("tabs.onUpdated", tab.windowId).catch(() => {});
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    swLog("window focus changed", { windowId, isWhatsapp: false });
    void setWhatsappTabState("NOT_WHATSAPP_TAB").catch(() => {});
    return;
  }
  currentFocusedWindowId = windowId;
  swLog("window focus changed", { windowId });
  void syncActiveTabState("windows.onFocusChanged", windowId).catch(() => {});
});

chrome.runtime.onConnect?.addListener?.((_port) => {
  swLog("runtime port connected");
  void syncActiveTabState("runtime.onConnect").catch(() => {});
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === "WHATSAPP_PHONE_DETECTED") {
    if (activeTabState !== "WHATSAPP_TAB") {
      sendResponse({ ok: false, ignored: true });
      return true;
    }
    swLog("phone detected", { phone: message.phone });
    void setCurrentPhone(message.phone || null);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "WHATSAPP_CONVERSATION_CLOSED") {
    swLog("conversation closed requested");
    clearConversationCloseTimer();
    closeConversationTimer = self.setTimeout(() => {
      if (activeTabState !== "WHATSAPP_TAB") {
        void setCurrentPhone(null);
        return;
      }
      swLog("conversation close grace elapsed; clearing current phone");
      void setCurrentPhone(null);
    }, 1200);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "LEADLINK_CLEAR_CURRENT_PHONE") {
    void setCurrentPhone(null);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "LEADLINK_GET_CURRENT_PHONE") {
    sendResponse({ phone: activeTabState === "WHATSAPP_TAB" ? currentPhone : null });
    return true;
  }

  if (message.type === "LEADLINK_GET_WHATSAPP_STATE") {
    void syncActiveTabState()
      .then(() => sendResponse({ tabState: activeTabState, phone: activeTabState === "WHATSAPP_TAB" ? currentPhone : null }))
      .catch(() => sendResponse({ tabState: activeTabState, phone: activeTabState === "WHATSAPP_TAB" ? currentPhone : null }));
    return true;
  }

  if (message.type === "LEADLINK_READ_WHATSAPP_MESSAGES") {
    // Usa currentWhatsappTabId em vez de re-consultar a aba ativa: quando o
    // sidepanel tem foco, chrome.tabs.query({ active, lastFocusedWindow })
    // pode retornar a janela errada e não encontrar o tab do WhatsApp Web.
    const tabIdToUse = currentWhatsappTabId;
    swLog("read whatsapp messages", { tabIdToUse });

    if (!tabIdToUse) {
      sendResponse({ type: "WHATSAPP_MESSAGES_READ", messages: [] });
      return true;
    }

    let responded = false;
    const timeoutId = self.setTimeout(() => {
      if (responded) return;
      responded = true;
      swLog("READ_WHATSAPP_MESSAGES timeout após 5s");
      sendResponse({ type: "WHATSAPP_MESSAGES_READ", messages: [] });
    }, 5000);

    chrome.tabs.sendMessage(
      tabIdToUse,
      { type: "READ_WHATSAPP_MESSAGES" },
      (response?: { type?: string; messages?: Array<{ from: "me" | "them"; text: string; time?: string }> }) => {
        if (responded) return;
        responded = true;
        self.clearTimeout(timeoutId);
        if (chrome.runtime.lastError || !response?.messages) {
          swLog("READ_WHATSAPP_MESSAGES erro ou resposta vazia", chrome.runtime.lastError);
          sendResponse({ type: "WHATSAPP_MESSAGES_READ", messages: [] });
          return;
        }
        swLog("READ_WHATSAPP_MESSAGES resposta recebida", { count: response.messages.length });
        sendResponse(response);
      },
    );
    return true;
  }

  return false;
});
