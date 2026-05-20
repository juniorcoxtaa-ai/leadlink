import { describe, expect, it } from "vitest";
import {
  matchBrazilianPhones,
  normalizePhoneDigits,
  possiblePhoneVariants,
  stripBrazilCountryCode,
} from "@/lib/phone";

describe("phone utils", () => {
  it("normalizes digits", () => {
    expect(normalizePhoneDigits("(11) 99876-5432")).toBe("11998765432");
  });

  it("strips brazil country code", () => {
    expect(stripBrazilCountryCode("5511998765432")).toBe("11998765432");
  });

  it("generates variants with and without 55 and ninth digit", () => {
    const variants = possiblePhoneVariants("1134567890");
    expect(variants).toContain("1134567890");
    expect(variants).toContain("551134567890");
    expect(variants).toContain("11934567890");
    expect(variants).toContain("5511934567890");
  });

  it("matches brazilian phones with and without 55", () => {
    expect(matchBrazilianPhones("5511998765432", "(11) 99876-5432")).toBe(true);
  });

  it("matches with and without ninth digit", () => {
    expect(matchBrazilianPhones("1134567890", "11934567890")).toBe(true);
  });

  it("matches explicit extension false negative cases", () => {
    expect(matchBrazilianPhones("5511998765432", "1198765432")).toBe(true);
    expect(matchBrazilianPhones("11998765432", "1198765432")).toBe(true);
    expect(matchBrazilianPhones("551198765432", "1198765432")).toBe(true);
  });

  it("does not match short random numbers", () => {
    expect(matchBrazilianPhones("12345", "1198765432")).toBe(false);
  });
});
