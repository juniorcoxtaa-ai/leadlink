import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAuth,
  getQuickReplies,
  getToken,
  setQuickReplies,
  setToken,
} from "@/lib/storage";

describe("storage utils", () => {
  beforeEach(() => {
    const store = new Map<string, unknown>();
    (chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>) = vi.fn(async (key: string) => ({ [key]: store.get(key) }));
    (chrome.storage.local.set as unknown as ReturnType<typeof vi.fn>) = vi.fn(async (values: Record<string, unknown>) => {
      Object.entries(values).forEach(([key, value]) => store.set(key, value));
    });
    (chrome.storage.local.remove as unknown as ReturnType<typeof vi.fn>) = vi.fn(async (key: string) => {
      store.delete(key);
    });
  });

  it("stores and reads token", async () => {
    await setToken("abc");
    await expect(getToken()).resolves.toBe("abc");
  });

  it("adds, removes and restores quick replies", async () => {
    await setQuickReplies(["um", "dois"]);
    await expect(getQuickReplies()).resolves.toEqual(["um", "dois"]);
    await setQuickReplies(null);
    await expect(getQuickReplies()).resolves.toBeNull();
  });

  it("clears auth", async () => {
    await setToken("abc");
    await clearAuth();
    await expect(getToken()).resolves.toBeNull();
  });
});
