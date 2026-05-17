import assert from "node:assert/strict";
import { parsePropertyText } from "../src/lib/propertyTextParser";

const sandraText = `
Apartamento para locação anual
Tabuleiro das Oliveiras - Itapema - SC
a 300 metros do mar
1 suíte
1 dormitório
1 vaga
1 banheiro
mobiliado
split nos dormitórios
piscina adulto e piscina infantil aquecida
salão de festas
área de estar
área externa
salão de jogos
academia
brinquedoteca
playground
quadra de futebol society
valor com taxas R$ 4.537,05
`;

const parsed = parsePropertyText(sandraText);

assert.equal(parsed.type, "Apartamento");
assert.equal(parsed.propertyType, "apartment");
assert.equal(parsed.businessType, "Locação");
assert.equal(parsed.purpose, "annual_rent");
assert.equal(parsed.purposeLabel, "locação anual");
assert.equal(parsed.neighborhood, "Tabuleiro das Oliveiras");
assert.equal(parsed.city, "Itapema");
assert.equal(parsed.state, "SC");
assert.equal(parsed.distanceFromBeachMeters, 300);
assert.equal(parsed.suites, 1);
assert.equal(parsed.bedrooms, 1);
assert.equal(parsed.parking, 1);
assert.equal(parsed.parkingSpaces, 1);
assert.equal(parsed.bathrooms, 1);
assert.equal(parsed.furnished, true);
assert.equal(parsed.airConditioning, true);
assert.equal(parsed.feesIncluded, true);
assert.equal(parsed.price, 4537.05);
assert.equal(parsed.features?.piscinaAdulto, true);
assert.equal(parsed.features?.piscinaInfantil, true);
assert.equal(parsed.features?.piscinaAquecida, true);
assert.equal(parsed.features?.salaoFestas, true);
assert.equal(parsed.features?.areaEstar, true);
assert.equal(parsed.features?.areaExterna, true);
assert.equal(parsed.features?.salaoJogos, true);
assert.equal(parsed.features?.academia, true);
assert.equal(parsed.features?.brinquedoteca, true);
assert.equal(parsed.features?.playground, true);
assert.equal(parsed.features?.quadraFutebolSociety, true);
assert.match(parsed.title || "", /Apartamento/);
assert.match(parsed.title || "", /locação anual/);
assert.match(parsed.title || "", /Itapema/);
assert.match(parsed.description || "", /1 suíte/);
assert.match(parsed.description || "", /1 quarto|1 dormitório/);
assert.match(parsed.description || "", /Valor de R\$ 4\.537,05 com taxas inclusas\./);

const tolerantText = `Anual na meia Praia!!
Uma suíte
Um quarto
Duas vagas apto diferenciado!
Com terraço!
R$ 3.600 com taxas!`;

const tolerant = parsePropertyText(tolerantText);

assert.equal(tolerant.purpose, "annual_rent");
assert.equal(tolerant.businessType, "Locação");
assert.equal(tolerant.purposeLabel, "locação anual");
assert.equal(tolerant.neighborhood, "Meia Praia");
assert.equal(tolerant.city, "Itapema");
assert.equal(tolerant.state, "SC");
assert.equal(tolerant.suites, 1);
assert.equal(tolerant.bedrooms, 1);
assert.equal(tolerant.parkingSpaces, 2);
assert.equal(tolerant.parking, 2);
assert.equal(tolerant.propertyType, "apartment");
assert.equal(tolerant.type, "Apartamento");
assert.equal(tolerant.terrace, true);
assert.equal(tolerant.features?.terraco, true);
assert.equal(tolerant.price, 3600);
assert.equal(tolerant.feesIncluded, true);
assert.equal(tolerant.title, "Apartamento com terraço para locação anual na Meia Praia em Itapema");
assert.equal(
  tolerant.description,
  "Apartamento disponível para locação anual na Meia Praia, em Itapema. Conta com 1 suíte, 1 quarto, 2 vagas de garagem e terraço. Valor de R$ 3.600 com taxas inclusas.",
);
assert.deepEqual(tolerant.observations, ["apto diferenciado", "com terraço"]);

const venda = parsePropertyText(
  "Casa à venda no Centro - Curitiba - PR, semi mobiliado, 2 quartos, 2 vagas, R$ 850.000",
);
assert.equal(venda.businessType, "Venda");
assert.equal(venda.neighborhood, "Centro");
assert.equal(venda.city, "Curitiba");
assert.equal(venda.state, "PR");
assert.equal(venda.semiFurnished, true);
assert.equal(venda.furnished, undefined);
assert.equal(venda.price, 850000);
assert.equal(venda.features?.semiMobiliado, true);

console.log("[PASS] propertyTextParser");
