import {
  extractVisibleConversationMessages,
  diagnoseDomForMessages,
  findConversationContainer,
  findActiveConversationHeader,
  extractBrazilianPhoneFromText,
  extractCusPhone,
  extractPhoneFromCandidates,
  normalizeCandidate,
  phoneFromUrlString,
} from "./whatsapp-detector-core";

Object.assign(window, {
  __leadlinkContentBoot: location.href,
});
console.log("[LeadLink][content] boot", location.href);

type DetectionMessage =
  | { type: "WHATSAPP_PHONE_DETECTED"; phone: string }
  | { type: "WHATSAPP_CONVERSATION_CLOSED" };

type ReadMessagesRequest = { type: "READ_WHATSAPP_MESSAGES" };
type ForceDetectRequest = { type: "FORCE_DETECT_CURRENT_CHAT" };
type ReadMessagesResponse = {
  type: "WHATSAPP_MESSAGES_READ";
  messages: Array<{ from: "me" | "them"; text: string; time?: string }>;
};

let lastPhone: string | null = null;
let debounceTimer: number | undefined;
let closeTimer: number | undefined;
const isDev = import.meta.env.DEV;
const DETECTION_DEBOUNCE_MS = 300;
const CLOSE_GRACE_MS = 1200;

function detectorLog(label: string, payload?: unknown) {
  if (!isDev) return;
  if (typeof payload === "undefined") {
    console.log(`[LeadLink][detector] ${label}`);
    return;
  }
  console.log(`[LeadLink][detector] ${label}`, payload);
}

/**
 * Verifica se o contexto da extensão ainda está válido.
 *
 * Quando a extensão é recarregada (chrome://extensions → atualizar) enquanto
 * o WhatsApp Web está aberto, o content script original continua rodando mas
 * chrome.runtime.id torna-se undefined e qualquer acesso a chrome.runtime.*
 * lança um TypeError síncrono ("Extension context invalidated").
 * O .catch() em Promises NÃO captura throws síncronos — por isso precisamos
 * verificar explicitamente antes de chamar qualquer API do chrome.runtime.
 */
function isContextValid(): boolean {
  try {
    return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

/**
 * Envia mensagem ao service worker de forma defensiva.
 *
 * Motivo de existir: chrome.runtime.sendMessage() lança SINCRONAMENTE com
 * "Extension context invalidated" quando o contexto é inválido. Isso não é
 * uma Promise rejeitada — é uma exceção síncrona que .catch() não captura.
 * Este wrapper garante que o content script nunca quebre por esse motivo.
 */
function safeSendMessage(message: DetectionMessage): void {
  if (!isContextValid()) {
    detectorLog("chrome.runtime indisponível; mensagem ignorada", { type: message.type });
    return;
  }
  try {
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch (error) {
    detectorLog("sendMessage lançou exceção síncrona (contexto provavelmente invalidado)", error);
  }
}

function activeHeader() {
  const conversation = findConversationContainer(document).element;
  return (
    findActiveConversationHeader(document) ||
    conversation?.querySelector<HTMLElement>("header, [data-testid='conversation-info-header']")?.closest("header") ||
    document.querySelector<HTMLElement>('#main header, header [data-testid="conversation-info-header"]')?.closest("header") ||
    null
  );
}

function phoneFromUrl() {
  return phoneFromUrlString(window.location.href);
}

function phoneFromDataIds() {
  const header = activeHeader();
  if (!header) return null;

  const candidates = [
    header.getAttribute("data-id"),
    ...Array.from(header.querySelectorAll<HTMLElement>("[data-id], [href], [aria-label], [title]"))
      .slice(0, 80)
      .flatMap((node) => [
        node.getAttribute("data-id"),
        node.getAttribute("href"),
        node.getAttribute("aria-label"),
        node.getAttribute("title"),
      ]),
  ];

  return extractPhoneFromCandidates(candidates);
}

function phoneFromCusLinks() {
  const header = activeHeader();
  if (!header) return null;

  const candidates = Array.from(header.querySelectorAll<HTMLAnchorElement | HTMLElement>("[href], [data-id], [title], [aria-label]"))
    .slice(0, 80)
    .flatMap((node) => [
      node.getAttribute("href"),
      node.getAttribute("data-id"),
      node.getAttribute("title"),
      node.getAttribute("aria-label"),
    ]);

  return extractPhoneFromCandidates(candidates);
}

function phoneFromHeader() {
  const header = activeHeader();
  if (!header) return null;

  const labels = [
    header.getAttribute("title"),
    header.getAttribute("aria-label"),
    ...Array.from(header.querySelectorAll<HTMLElement>("[title], [aria-label], span, div"))
      .slice(0, 80)
      .flatMap((node) => [node.getAttribute("title"), node.getAttribute("aria-label"), node.textContent]),
  ];

  detectorLog("header candidates", {
    text: header.textContent?.replace(/\s+/g, " ").trim().slice(0, 160) ?? "",
    title: header.getAttribute("title"),
    ariaLabel: header.getAttribute("aria-label"),
  });

  for (const label of labels) {
    const fromVisibleText = extractBrazilianPhoneFromText(label);
    if (fromVisibleText) {
      detectorLog("header phone extracted", { text: label, phone: fromVisibleText });
      return fromVisibleText;
    }
    const phone = normalizeCandidate(label);
    if (phone) return phone;
  }

  return null;
}

function hasOpenConversation() {
  const header = activeHeader();
  const conversation = findConversationContainer(document).element;
  return Boolean(header && conversation && !header.hasAttribute("hidden"));
}

function detectPhone() {
  if (!hasOpenConversation()) return null;
  const fromUrl = phoneFromUrl();
  const fromDataId = phoneFromDataIds();
  const fromCusLink = phoneFromCusLinks();
  const fromHeader = phoneFromHeader();
  const detected = fromDataId || fromCusLink || fromUrl || fromHeader;

  detectorLog("detection snapshot", {
    url: window.location.href,
    hasConversation: hasOpenConversation(),
    phoneFromUrl: fromUrl,
    phoneFromDataId: fromDataId,
    phoneFromCusLink: fromCusLink,
    phoneFromHeader: fromHeader,
    detected,
  });

  return detected;
}

// Alias mantido por legibilidade — toda saída passa por safeSendMessage.
const send = safeSendMessage;

function readVisibleMessages(): ReadMessagesResponse {
  try {
    const conversationMatch = findConversationContainer(document);
    const conversation = conversationMatch.element;

    detectorLog("conversation container match", {
      selector: conversationMatch.selector,
      rows: conversationMatch.rows,
      size: { width: conversationMatch.width, height: conversationMatch.height },
      discarded: conversationMatch.debug.filter((item) => !item.accepted),
    });
    const rejectedMain = conversationMatch.debug.find((item) => item.selector === "#main" && !item.accepted);
    if (rejectedMain) {
      detectorLog("Rejected #main: not a conversation container", { reason: rejectedMain.reason });
    }

    // Diagnóstico detalhado em dev: ajuda a identificar a causa quando o
    // array retorna vazio (ex.: seletores desatualizados, nova estrutura DOM).
    if (isDev && conversation) {
      const diag = diagnoseDomForMessages(conversation);
      detectorLog("DOM scan before extraction", {
        containerSelector: conversationMatch.selector,
        containerRows: conversationMatch.rows,
        containerSize: { width: conversationMatch.width, height: conversationMatch.height },
        strategy1_primaryContainers: diag.primaryContainers,
        strategy2_prePlainText: diag.prePlainTextNodes,
        strategy3_roleRowTotal: diag.roleRowTotal,
        strategy3_roleRowDataId: diag.roleRowDataId,
        textLeaves: diag.textLeaves,
        spanDirCount: diag.spanDirCount,
        sampleTexts: diag.sampleTexts,
      });
    }

    const messages = conversation ? extractVisibleConversationMessages(conversation, { limit: 20, maxTextChars: 4000 }) : [];
    detectorLog("messages read", {
      selector: conversationMatch.selector,
      count: messages.length,
      sample: messages.slice(0, 3).map((m) => ({ from: m.from, text: m.text.slice(0, 60) })),
    });
    return { type: "WHATSAPP_MESSAGES_READ", messages };
  } catch (error) {
    detectorLog("failed to read messages", error);
    return { type: "WHATSAPP_MESSAGES_READ", messages: [] };
  }
}

function publishDetection() {
  const phone = detectPhone();
  const hasConversation = hasOpenConversation();
  if (phone === lastPhone) return;

  if (phone) {
    window.clearTimeout(closeTimer);
    lastPhone = phone;
    detectorLog("publishing detected phone", { phone });
    send({ type: "WHATSAPP_PHONE_DETECTED", phone });
    return;
  }

  if (hasConversation && lastPhone) {
    detectorLog("header active but phone not resolved yet; keeping previous phone", { lastPhone });
    return;
  }

  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    if (detectPhone()) return;
    if (hasOpenConversation()) {
      detectorLog("close grace elapsed but conversation still appears active");
      return;
    }
    lastPhone = null;
    detectorLog("publishing conversation closed");
    send({ type: "WHATSAPP_CONVERSATION_CLOSED" });
  }, CLOSE_GRACE_MS);
}

function scheduleDetection(reason = "mutation") {
  window.clearTimeout(debounceTimer);
  detectorLog("schedule detection", { reason });
  debounceTimer = window.setTimeout(publishDetection, DETECTION_DEBOUNCE_MS);
}

const observer = new MutationObserver(() => scheduleDetection("mutation"));
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-id", "aria-selected", "title", "aria-label"],
});

window.addEventListener("popstate", () => scheduleDetection("popstate"));
window.addEventListener("hashchange", () => scheduleDetection("hashchange"));
window.addEventListener("focus", () => scheduleDetection("focus"));

// Log de boot apenas em dev — útil para confirmar que o script carregou.
detectorLog("detector iniciado", { url: window.location.href });
scheduleDetection("boot");

/**
 * Listener para leitura de mensagens sob demanda (apenas quando o corretor
 * clicar em "Consulte a IA" no sidepanel). Nunca lê mensagens automaticamente.
 *
 * Envolvido em try/catch porque chrome.runtime.onMessage.addListener() lança
 * sincronamente se o contexto da extensão já estiver invalidado no momento da
 * inicialização do módulo — o que causaria o erro "line 1" no arquivo minificado.
 */
try {
  chrome.runtime.onMessage.addListener((message: ReadMessagesRequest | ForceDetectRequest, _sender, sendResponse) => {
    if (message.type === "READ_WHATSAPP_MESSAGES") {
      sendResponse(readVisibleMessages());
      return true;
    }

    if (message.type === "FORCE_DETECT_CURRENT_CHAT") {
      // O service worker solicita re-detecção imediata após o usuário voltar
      // à aba do WhatsApp. Cancela o debounce pendente e publica agora.
      detectorLog("FORCE_DETECT_CURRENT_CHAT recebido; publicando detecção imediata");
      window.clearTimeout(debounceTimer);
      publishDetection();
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });
  detectorLog("listener de mensagens registrado");
} catch (error) {
  // Contexto provavelmente invalidado no momento do carregamento.
  // O detector continua funcionando para detecção de número; apenas a
  // leitura de mensagens para IA ficará indisponível até a próxima recarga.
  detectorLog("falha ao registrar onMessage listener (contexto invalidado?)", error);
}
