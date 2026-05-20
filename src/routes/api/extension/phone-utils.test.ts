import { describe, expect, it } from "vitest";
import { matchBrazilianPhones } from "./-utils";

describe("backend phone matcher", () => {
  it("matches with and without country code and ninth digit", () => {
    expect(matchBrazilianPhones("5511998765432", "1198765432")).toBe(true);
    expect(matchBrazilianPhones("11998765432", "1198765432")).toBe(true);
    expect(matchBrazilianPhones("551198765432", "1198765432")).toBe(true);
  });

  it("does not match short random numbers", () => {
    expect(matchBrazilianPhones("12345", "1198765432")).toBe(false);
  });
});
