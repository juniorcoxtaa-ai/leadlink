import { strict as assert } from "node:assert";
import { validateBrazilPhone, toWhatsappNumber } from "../src/lib/phone";
import { buildLeadWhatsappUrl } from "../src/lib/lead-whatsapp";
import { shouldRunGlobalSearch } from "../src/lib/global-search";
import { normalizeVitrineConfig } from "../src/lib/vitrine-config";
import { normalizeMeuLinkConfig } from "../src/lib/meu-link-store";
import { propertyUpdateValues } from "../src/server-fns/properties";

assert.equal(validateBrazilPhone("(11) 99999-1234").ok, true);
assert.equal(toWhatsappNumber("+5511999991234"), "5511999991234");
assert.equal(validateBrazilPhone("asdfasdf").ok, false);

const whatsappUrl = buildLeadWhatsappUrl({ name: "Ana Pereira", phone: "11999991234" });
assert.ok(whatsappUrl?.startsWith("https://wa.me/5511999991234?text="));
assert.ok(decodeURIComponent(whatsappUrl || "").includes("Olá, Ana!"));
assert.equal(buildLeadWhatsappUrl({ name: "Ana", phone: "sem telefone" }), null);

assert.deepEqual(
  normalizeVitrineConfig({ coverUrl: " data:image/jpeg;base64,abc ", accentColor: "rose" }),
  { coverUrl: "", accentColor: "rose" },
);
assert.equal(normalizeVitrineConfig({ accentColor: "invalid" }).accentColor, "navy");

const meuLink = normalizeMeuLinkConfig(
  {
    bgImage: "data:image/jpeg;base64,bg",
    bgStyle: "noir",
    vitrine: { coverUrl: "cover", accentColor: "emerald" },
  },
  "ana",
);
assert.equal(meuLink.bgImage, "data:image/jpeg;base64,bg");
assert.equal(meuLink.bgStyle, "noir");
assert.equal(meuLink.vitrine.coverUrl, "cover");
assert.equal(meuLink.vitrine.accentColor, "emerald");

const updatePayload = propertyUpdateValues({
  title: " Apartamento editado ",
  price: 350000,
  area: 82,
  city: "São Paulo",
  status: "Disponível",
});
assert.equal(updatePayload.title, "Apartamento editado");
assert.equal(updatePayload.price, 350000);
assert.equal(updatePayload.area, 82);
assert.equal(updatePayload.city, "São Paulo");
assert.equal(updatePayload.status, "Disponível");
assert.equal("neighborhood" in updatePayload, false);

assert.equal(shouldRunGlobalSearch(""), false);
assert.equal(shouldRunGlobalSearch(" a "), false);
assert.equal(shouldRunGlobalSearch("ana"), true);

console.log("Smoke P0/P1 passed");
