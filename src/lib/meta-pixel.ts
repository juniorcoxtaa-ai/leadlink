const META_PIXEL_ID_PATTERN = /^\d{5,20}$/;

declare global {
  interface Window {
    fbq?: MetaPixelFn;
    _fbq?: MetaPixelFn;
    __leadlinkMetaPixelIds?: Set<string>;
    __leadlinkMetaPageViews?: Set<string>;
  }
}

type MetaPixelCommand = "init" | "track" | "trackCustom" | "consent";
type MetaPixelFn = ((command: MetaPixelCommand, ...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  push?: (...args: unknown[]) => number;
  queue?: unknown[];
  version?: string;
};

export type MetaPixelTrackParams = Record<string, string | number | boolean | null | undefined>;

const META_PIXEL_SCRIPT_ID = "leadlink-meta-pixel-script";

function getWindow() {
  return typeof window === "undefined" ? null : window;
}

function ensureMetaPixelStub(win: Window) {
  if (typeof win.fbq === "function") return;

  const fbq: MetaPixelFn = ((...args: unknown[]) => {
    if (typeof fbq.callMethod === "function") {
      fbq.callMethod(...args);
      return;
    }
    fbq.queue = fbq.queue ?? [];
    fbq.queue.push(args);
  }) as MetaPixelFn;

  fbq.push = (...args: unknown[]) => {
    fbq(...args);
    return fbq.queue?.length ?? 0;
  };
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];

  win.fbq = fbq;
  win._fbq = fbq;
}

function ensureMetaPixelScript(win: Window) {
  if (win.document.getElementById(META_PIXEL_SCRIPT_ID)) return;

  const script = win.document.createElement("script");
  script.id = META_PIXEL_SCRIPT_ID;
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = win.document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
    return;
  }
  win.document.head.appendChild(script);
}

export function isValidMetaPixelId(pixelId: string) {
  return META_PIXEL_ID_PATTERN.test(pixelId.trim());
}

export function initMetaPixel(pixelId: string) {
  const normalizedPixelId = pixelId.trim();
  const win = getWindow();
  if (!win || !isValidMetaPixelId(normalizedPixelId)) return false;

  ensureMetaPixelStub(win);
  ensureMetaPixelScript(win);

  win.__leadlinkMetaPixelIds = win.__leadlinkMetaPixelIds ?? new Set<string>();
  if (win.__leadlinkMetaPixelIds.has(normalizedPixelId)) return true;

  win.fbq?.("init", normalizedPixelId);
  win.__leadlinkMetaPixelIds.add(normalizedPixelId);
  return true;
}

export function trackMetaEvent(eventName: string, params?: MetaPixelTrackParams) {
  const win = getWindow();
  if (!win?.fbq) return false;
  if (params && Object.keys(params).length > 0) {
    win.fbq("track", eventName, params);
    return true;
  }
  win.fbq("track", eventName);
  return true;
}

export function trackMetaCustomEvent(eventName: string, params?: MetaPixelTrackParams) {
  const win = getWindow();
  if (!win?.fbq) return false;
  if (params && Object.keys(params).length > 0) {
    win.fbq("trackCustom", eventName, params);
    return true;
  }
  win.fbq("trackCustom", eventName);
  return true;
}

export function trackMetaPageViewOnce(pixelId: string, pageKey: string) {
  const win = getWindow();
  const normalizedPixelId = pixelId.trim();
  if (!win || !isValidMetaPixelId(normalizedPixelId)) return false;
  if (!initMetaPixel(normalizedPixelId)) return false;

  win.__leadlinkMetaPageViews = win.__leadlinkMetaPageViews ?? new Set<string>();
  const dedupeKey = `${normalizedPixelId}:${pageKey}`;
  if (win.__leadlinkMetaPageViews.has(dedupeKey)) return false;

  win.__leadlinkMetaPageViews.add(dedupeKey);
  trackMetaEvent("PageView");
  return true;
}
