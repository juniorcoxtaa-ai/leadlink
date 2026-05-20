import { strict as assert } from "node:assert";
import { validateBrazilPhone } from "../src/lib/phone";
import { buildLeadWhatsappUrl } from "../src/lib/lead-whatsapp";
import { normalizeVitrineConfig, VITRINE_COLOR_VALUES } from "../src/lib/vitrine-config";

const phone = validateBrazilPhone("(11) 99999-1234");
assert.equal(phone.ok, true);
assert.equal(phone.ok ? phone.phone : "", "5511999991234");
assert.equal(validateBrazilPhone("asdfasdf").ok, false);

const whatsappUrl = buildLeadWhatsappUrl({
  name: "Maria Silva",
  phone: "(11) 99999-1234",
});
assert.ok(whatsappUrl?.startsWith("https://wa.me/5511999991234?text="));
assert.ok(decodeURIComponent(whatsappUrl || "").includes("Olá, Maria!"));
assert.equal(buildLeadWhatsappUrl({ name: "Lead", phone: "asdfasdf" }), null);

const vitrine = normalizeVitrineConfig({
  coverUrl: "  data:image/jpeg;base64,abc  ",
  accentColor: "violet",
});
assert.equal(vitrine.coverUrl, "");
assert.equal(vitrine.accentColor, "violet");
assert.equal(normalizeVitrineConfig({ accentColor: "invalid" }).accentColor, "navy");
assert.ok(VITRINE_COLOR_VALUES.navy);
assert.ok((VITRINE_COLOR_VALUES as Record<string, string>).noir === undefined);

console.log("P1 core tests passed");
