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
assert.equal(parsed.businessType, "Locação");
assert.equal(parsed.purposeLabel, "locação anual");
assert.equal(parsed.neighborhood, "Tabuleiro das Oliveiras");
assert.equal(parsed.city, "Itapema");
assert.equal(parsed.state, "SC");
assert.equal(parsed.distanceFromBeachMeters, 300);
assert.equal(parsed.suites, 1);
assert.equal(parsed.bedrooms, 1);
assert.equal(parsed.parking, 1);
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
assert.equal(parsed.title, "Apartamento mobiliado para locação anual a 300m da praia em Itapema");
assert.match(parsed.description || "", /1 suíte/);
assert.match(parsed.description || "", /1 dormitório/);
assert.match(parsed.description || "", /Valor de R\$ 4\.537,05 com taxas inclusas\./);

const venda = parsePropertyText(
  "Casa à venda no Centro - Curitiba - PR, semi mobiliado, 2 quartos, 2 vagas, R$ 850.000",
);
assert.equal(venda.businessType, "Venda");
assert.equal(venda.semiFurnished, true);
assert.equal(venda.furnished, undefined);
assert.equal(venda.price, 850000);
assert.equal(venda.features?.semiMobiliado, true);

console.log("[PASS] propertyTextParser");
