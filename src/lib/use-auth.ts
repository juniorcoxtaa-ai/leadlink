import { authClient } from "@/lib/auth-client";

export function useAuth() {
  const { data: session, isPending: loading } = authClient.useSession();
  const user = session?.user ?? null;
  const isAdmin = (user as any)?.role === "admin";
  return { user, session, isAdmin, loading };
}

export async function signOut() {
  await authClient.signOut();
  window.location.href = "/login";
}
