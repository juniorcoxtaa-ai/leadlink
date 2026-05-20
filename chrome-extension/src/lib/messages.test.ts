import { describe, expect, it } from "vitest";
import {
  buildPropertyMessage,
  defaultQuickReplies,
  formatDateBR,
  formatDateTimeBR,
  formatQuizAnswerValue,
  friendlyQuizLabel,
} from "@/lib/messages";

describe("message utils", () => {
  it("formats date in pt-BR", () => {
    expect(formatDateBR("2026-05-18T12:04:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("formats date time in pt-BR", () => {
    expect(formatDateTimeBR("2026-05-18T12:04:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/);
  });

  it("returns friendly quiz labels", () => {
    expect(friendlyQuizLabel("q-budget")).toBe("Orcamento");
  });

  it("formats booleans and empty answers", () => {
    expect(formatQuizAnswerValue(true)).toBe("Sim");
    expect(formatQuizAnswerValue(false)).toBe("Nao");
    expect(formatQuizAnswerValue(null)).toBe("Nao informado");
    expect(formatQuizAnswerValue("")).toBe("Nao informado");
  });

  it("formats arrays as comma separated text", () => {
    expect(formatQuizAnswerValue(["A", "B"])).toBe("A, B");
  });

  it("builds property message", () => {
    const result = buildPropertyMessage({
      property: { id: "p1", title: "Vista Mar", neighborhood: "Centro", city: "Santos", state: "SP", price: 500000 },
      leadName: "Joao",
    } as never);
    expect(result).toContain("Oi Joao!");
    expect(result).toContain("Vista Mar");
  });

  it("has default quick replies", () => {
    expect(defaultQuickReplies.length).toBeGreaterThan(0);
  });
});
