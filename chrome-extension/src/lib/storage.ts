export type ExtensionUser = {
  id: string;
  name: string;
  email: string;
  initials?: string | null;
  planSlug?: string | null;
  slug?: string | null;
};

const KEYS = {
  token: "leadlinkToken",
  user: "leadlinkUser",
  currentPhone: "leadlinkCurrentPhone",
  quickReplies: "leadlinkQuickReplies",
} as const;

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

async function getValue<T>(key: string): Promise<T | null> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T | undefined) ?? null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

async function setValue<T>(key: string, value: T | null) {
  if (hasChromeStorage()) {
    if (value === null) {
      await chrome.storage.local.remove(key);
      return;
    }
    await chrome.storage.local.set({ [key]: value });
    return;
  }

  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getToken() {
  return getValue<string>(KEYS.token);
}

export function setToken(token: string) {
  return setValue(KEYS.token, token);
}

export async function clearAuth() {
  await Promise.all([setValue(KEYS.token, null), setValue(KEYS.user, null)]);
}

export function getUser() {
  return getValue<ExtensionUser>(KEYS.user);
}

export function setUser(user: ExtensionUser) {
  return setValue(KEYS.user, user);
}

export function getCurrentPhone() {
  return getValue<string>(KEYS.currentPhone);
}

export function setCurrentPhone(phone: string | null) {
  return setValue(KEYS.currentPhone, phone);
}

export function getQuickReplies() {
  return getValue<string[]>(KEYS.quickReplies);
}

export function setQuickReplies(replies: string[] | null) {
  return setValue(KEYS.quickReplies, replies);
}
