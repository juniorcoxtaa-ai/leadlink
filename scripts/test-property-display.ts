import assert from "node:assert/strict";
import {
  buildFeaturesList,
  buildPropertyDescription,
  formatPropertyLocation,
  formatPropertyPrice,
  getPropertyDetails,
  propertySearchText,
  purposeBadgeLabel,
  purposePriceLabel,
  repairText,
} from "../src/lib/property-display";

const rental = {
  title: "Apartamento mobiliado",
  type: "Apartamento",
  businessType: "Locação",
  status: "Disponível",
  price: 4537,
  area: 0,
  bedrooms: 1,
  bathrooms: 0,
  parking: 1,
  neighborhood: "Tabuleiro das Oliveiras",
  city: "Itapema",
  state: "SC",
  description: "Apartamento disponível para locação anual.",
  features: {
    suites: 1,
    distanceFromBeachMeters: 300,
    piscinaAdulto: true,
    piscinaInfantil: true,
    piscinaAquecida: true,
    semiMobiliado: false,
    taxasInclusas: true,
  },
};

assert.equal(purposeBadgeLabel(rental.businessType), "Locação");
assert.equal(purposePriceLabel(rental.businessType), "Para locação por");
assert.equal(formatPropertyPrice(rental.price), "R$ 4.537");
assert.equal(formatPropertyLocation(rental), "Tabuleiro das Oliveiras, Itapema, SC");
assert.deepEqual(
  getPropertyDetails(rental).map((item) => item.key),
  ["bedrooms", "suites", "parking", "distanceFromBeachMeters"],
);
assert.deepEqual(buildFeaturesList(rental.features), [
  "Piscina adulto",
  "Piscina infantil",
  "Piscina aquecida",
  "Taxas inclusas",
]);
assert.equal(buildPropertyDescription(rental), "Apartamento disponível para locação anual.");
assert.match(propertySearchText(rental), /locação/);

assert.equal(repairText("ImÃ³vel para LocaÃ§Ã£o com mÂ²"), "Imóvel para Locação com m²");
assert.equal(purposeBadgeLabel("LocaÃ§Ã£o"), "Locação");
assert.equal(purposePriceLabel("temporada"), "Temporada por");
assert.equal(formatPropertyPrice(0), "Valor sob consulta");

console.log("[PASS] propertyDisplay");
