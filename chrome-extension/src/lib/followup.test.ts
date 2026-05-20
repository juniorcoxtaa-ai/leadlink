import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareFollowUpPriority, followUpForLead } from "@/lib/followup";
import type { Lead } from "@/lib/api";

function makeLead(partial: Partial<Lead>): Lead {
  return {
    id: "1",
    name: "Maria",
    phone: "11999999999",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("follow-up rules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("classifies urgent lead", () => {
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z"));
    const item = followUpForLead(
      makeLead({ lastContact: "2026-05-15T10:00:00Z" }),
      "Quente",
    );
    expect(item?.category).toBe("Urgente");
  });

  it("classifies no response", () => {
    const item = followUpForLead(makeLead({ lastContact: null }), "Frio");
    expect(item?.category).toBe("Sem resposta");
  });

  it("classifies opportunity", () => {
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z"));
    const item = followUpForLead(
      makeLead({ createdAt: "2026-05-16T10:00:00Z", lastContact: "2026-05-17T10:00:00Z" }),
      "Morno",
    );
    expect(item?.category).toBe("Oportunidade");
  });

  it("classifies reactivation", () => {
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z"));
    const item = followUpForLead(
      makeLead({ lastContact: "2026-05-01T10:00:00Z" }),
      "Frio",
    );
    expect(item?.category).toBe("Reativacao");
  });

  it("keeps priority order", () => {
    const urgent = followUpForLead(makeLead({ lastContact: "2026-05-01T10:00:00Z" }), "Quente")!;
    const noResponse = followUpForLead(makeLead({ id: "2", lastContact: null }), "Frio")!;
    expect(compareFollowUpPriority(urgent, noResponse)).toBeLessThan(0);
  });
});
