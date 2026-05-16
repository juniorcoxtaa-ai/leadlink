export interface LocalUser {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
}

const AUTH_KEY = "leadlink:local-auth";
const ADMIN_EMAIL = "admin@leadlink.com.br";
const ADMIN_PASSWORD = "Admin@Leadlink2026";

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getLocalUser(): LocalUser | null {
  if (typeof window === "undefined") return null;
  return safeJsonParse<LocalUser | null>(window.localStorage.getItem(AUTH_KEY), null);
}

export function setLocalUser(user: LocalUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(AUTH_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function localSignIn(email: string, password: string): LocalUser {
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
  const isKnownDemo = isAdmin || password.length >= 6;
  if (!isKnownDemo) {
    throw new Error("Senha inválida");
  }

  return {
    id: email.toLowerCase(),
    email,
    fullName: isAdmin ? "Admin Leadlink" : email.split("@")[0],
    isAdmin,
  };
}

export function localSignUp(email: string, fullName: string) {
  return {
    id: email.toLowerCase(),
    email,
    fullName: fullName || email.split("@")[0],
    isAdmin: email.toLowerCase() === ADMIN_EMAIL,
  } satisfies LocalUser;
}

export function signOutLocal() {
  setLocalUser(null);
}
