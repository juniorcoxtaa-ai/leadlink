import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener<T extends (...args: any[]) => any> = T | null;

const listeners: {
  onActivated: Listener<(activeInfo: { tabId: number; windowId: number }) => void>;
  onUpdated: Listener<(tabId: number, changeInfo: { status?: string; url?: string }, tab: chrome.tabs.Tab) => void>;
  onFocusChanged: Listener<(windowId: number) => void>;
  onMessage: Listener<(message: any, sender: chrome.runtime.MessageSender, sendResponse: (value?: any) => void) => boolean | void>;
  onStartup: Listener<() => void>;
  onInstalled: Listener<() => void>;
  onClicked: Listener<(tab: chrome.tabs.Tab) => void>;
  onConnect: Listener<(port: chrome.runtime.Port) => void>;
} = {
  onActivated: null,
  onUpdated: null,
  onFocusChanged: null,
  onMessage: null,
  onStartup: null,
  onInstalled: null,
  onClicked: null,
  onConnect: null,
};

const queryMock = vi.fn();
const getMock = vi.fn();
const sendTabMessageMock = vi.fn(() => Promise.resolve());
const runtimeSendMessageMock = vi.fn(() => Promise.resolve());
const storageSetMock = vi.fn(() => Promise.resolve());

function installChromeStub() {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      tabs: {
        query: queryMock,
        get: getMock,
        sendMessage: sendTabMessageMock,
        onActivated: { addListener: vi.fn((cb) => (listeners.onActivated = cb)) },
        onUpdated: { addListener: vi.fn((cb) => (listeners.onUpdated = cb)) },
      },
      windows: {
        WINDOW_ID_NONE: -1,
        onFocusChanged: { addListener: vi.fn((cb) => (listeners.onFocusChanged = cb)) },
      },
      runtime: {
        sendMessage: runtimeSendMessageMock,
        onMessage: { addListener: vi.fn((cb) => (listeners.onMessage = cb)) },
        onStartup: { addListener: vi.fn((cb) => (listeners.onStartup = cb)) },
        onInstalled: { addListener: vi.fn((cb) => (listeners.onInstalled = cb)) },
        onConnect: { addListener: vi.fn((cb) => (listeners.onConnect = cb)) },
        lastError: undefined,
      },
      action: {
        onClicked: { addListener: vi.fn((cb) => (listeners.onClicked = cb)) },
      },
      sidePanel: {
        setPanelBehavior: vi.fn(() => Promise.resolve()),
        open: vi.fn(() => Promise.resolve()),
      },
      storage: {
        local: {
          set: storageSetMock,
        },
      },
    },
  });
}

async function getWhatsappStateFromWorker() {
  return await new Promise<{ tabState?: string; phone?: string | null }>((resolve) => {
    listeners.onMessage?.({ type: "LEADLINK_GET_WHATSAPP_STATE" }, {} as chrome.runtime.MessageSender, resolve);
  });
}

describe("service worker whatsapp tab control", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    listeners.onActivated = null;
    listeners.onUpdated = null;
    listeners.onFocusChanged = null;
    listeners.onMessage = null;
    listeners.onStartup = null;
    listeners.onInstalled = null;
    listeners.onClicked = null;
    listeners.onConnect = null;
    installChromeStub();
    queryMock.mockReset();
    getMock.mockReset();
    sendTabMessageMock.mockReset();
    runtimeSendMessageMock.mockReset();
    storageSetMock.mockReset();
    await import("./service-worker");
  });

  it("switching to non-whatsapp tab broadcasts NOT_WHATSAPP_TAB immediately", async () => {
    queryMock.mockResolvedValueOnce([{ id: 2, windowId: 1, active: true, url: "https://www.google.com/" }]);

    listeners.onActivated?.({ tabId: 2, windowId: 1 });
    await Promise.resolve();
    await Promise.resolve();

    expect(storageSetMock).toHaveBeenCalledWith({ leadlinkCurrentPhone: null });
    await expect(getWhatsappStateFromWorker()).resolves.toEqual({ tabState: "NOT_WHATSAPP_TAB", phone: null });
  });

  it("returning to whatsapp forces re-detection without using lastFocusedWindow", async () => {
    queryMock
      .mockResolvedValueOnce([{ id: 2, windowId: 1, active: true, url: "https://www.google.com/" }])
      .mockResolvedValueOnce([{ id: 9, windowId: 3, active: true, url: "https://web.whatsapp.com/" }]);

    listeners.onActivated?.({ tabId: 2, windowId: 1 });
    await Promise.resolve();
    await Promise.resolve();

    listeners.onFocusChanged?.(3);
    await Promise.resolve();
    await Promise.resolve();

    expect(queryMock).toHaveBeenNthCalledWith(1, { active: true, windowId: 1 });
    expect(queryMock).toHaveBeenNthCalledWith(2, { active: true, windowId: 3 });
    await expect(getWhatsappStateFromWorker()).resolves.toEqual({ tabState: "WHATSAPP_TAB", phone: null });
  });
});
