export type ParsedPropertyText = {
  title?: string;
  description?: string;
  type?: string;
  propertyType?: "apartment" | "house" | "commercial" | "studio" | "penthouse";
  businessType?: "Venda" | "Locação" | "Temporada";
  purpose?: "annual_rent" | "sale" | "seasonal_rent";
  purposeLabel?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  parkingSpaces?: number;
  suites?: number;
  neighborhood?: string;
  city?: string;
  state?: string;
  distanceFromBeachMeters?: number;
  furnished?: boolean;
  semiFurnished?: boolean;
  airConditioning?: boolean;
  feesIncluded?: boolean;
  terrace?: boolean;
  observations?: string[];
  features?: Record<string, boolean>;
};

const PURPOSE_ALIASES = {
  annualRent: [
    "anual",
    "locação anual",
    "aluguel anual",
    "aluga anual",
    "para morar",
    "contrato anual",
  ],
  seasonalRent: ["temporada"],
  sale: ["venda", "à venda", "a venda"],
};

const PROPERTY_TYPE_ALIASES = {
  apartment: ["apto", "apartamento", "ap"],
  house: ["casa"],
  commercial: ["comercial", "sala comercial"],
  studio: ["studio"],
  penthouse: ["cobertura"],
};

const NEIGHBORHOOD_ALIASES: Record<string, { city: string; state: string; aliases: string[] }> = {
  "Meia Praia": { city: "Itapema", state: "SC", aliases: ["meia praia", "mei praia"] },
  "Tabuleiro das Oliveiras": {
    city: "Itapema",
    state: "SC",
    aliases: ["tabuleiro das oliveiras", "tabuleiro"],
  },
  Centro: { city: "Itapema", state: "SC", aliases: ["centro"] },
  Morretes: { city: "Itapema", state: "SC", aliases: ["morretes"] },
  Ilhota: { city: "Itapema", state: "SC", aliases: ["ilhota"] },
  "Casa Branca": { city: "Itapema", state: "SC", aliases: ["casa branca"] },
  Várzea: { city: "Itapema", state: "SC", aliases: ["varzea", "várzea"] },
  Sertãozinho: { city: "Itapema", state: "SC", aliases: ["sertaozinho", "sertãozinho"] },
  "Alto São Bento": {
    city: "Itapema",
    state: "SC",
    aliases: ["alto sao bento", "alto são bento"],
  },
  "Canto da Praia": { city: "Itapema", state: "SC", aliases: ["canto da praia"] },
};

const NUMBER_WORDS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
};

const amenityPatterns: Array<[string, RegExp]> = [
  ["piscinaAdulto", /\bpiscina\s+adulto\b/],
  ["piscinaInfantil", /\bpiscina\s+infantil\b/],
  ["piscinaAquecida", /\bpiscina(?:\s+\w+){0,2}\s+aquecida\b/],
  ["salaoFestas", /\bsalao\s+de\s+festas\b/],
  ["areaEstar", /\barea\s+de\s+estar\b/],
  ["areaExterna", /\barea\s+externa\b/],
  ["salaoJogos", /\bsalao\s+de\s+jogos\b/],
  ["academia", /\bacademia\b/],
  ["brinquedoteca", /\bbrinquedoteca\b/],
  ["playground", /\bplayground\b/],
  ["quadraFutebolSociety", /\bquadra\s+de\s+futebol\s+society\b/],
  ["quadra", /\bquadra\b/],
  ["churrasqueira", /\bchurrasqueira\b/],
  ["elevador", /\belevador(?:es)?\b/],
  ["sacada", /\bsacada\b/],
  ["varanda", /\bvaranda\b/],
  ["terraco", /\bterraco\b/],
  ["vistaMar", /\bvista\s+(?:para\s+o\s+)?mar\b/],
  ["frenteMar", /\bfrente\s+mar\b|\bfrente\s+ao\s+mar\b/],
  ["aceitaPet", /\bpet\s+friendly\b|\baceita\s+pet\b/],
];

const amenityLabels: Record<string, string> = {
  piscinaAdulto: "piscina adulto",
  piscinaInfantil: "piscina infantil",
  piscinaAquecida: "piscina aquecida",
  salaoFestas: "salão de festas",
  areaEstar: "área de estar",
  areaExterna: "área externa",
  salaoJogos: "salão de jogos",
  academia: "academia",
  brinquedoteca: "brinquedoteca",
  playground: "playground",
  quadraFutebolSociety: "quadra de futebol society",
  quadra: "quadra",
  churrasqueira: "churrasqueira",
  elevador: "elevador",
  sacada: "sacada",
  varanda: "varanda",
  terraco: "terraço",
  vistaMar: "vista para o mar",
  frenteMar: "frente mar",
  aceitaPet: "pet friendly",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s$.,-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBrazilianNumber(value: string) {
  const clean = value.replace(/[^\d,.]/g, "");
  if (!clean) return undefined;
  if (clean.includes(",")) return Number(clean.replace(/\./g, "").replace(",", "."));
  return Number(clean.replace(/\./g, ""));
}

function numberTokenPattern() {
  return String.raw`(\d+|um|uma|dois|duas|tres|três|quatro|cinco)`;
}

function tokenToNumber(value?: string) {
  if (!value) return undefined;
  const normalized = normalize(value);
  return NUMBER_WORDS[normalized] ?? Number(normalized);
}

function firstNumberFor(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  const value = match?.slice(1).find(Boolean);
  const parsed = tokenToNumber(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function containsAlias(normalizedText: string, aliases: string[]) {
  return aliases.some((alias) => new RegExp(`\\b${normalize(alias)}\\b`).test(normalizedText));
}

function detectPurpose(
  normalizedText: string,
): Pick<ParsedPropertyText, "businessType" | "purpose" | "purposeLabel"> {
  if (containsAlias(normalizedText, PURPOSE_ALIASES.seasonalRent)) {
    return { businessType: "Temporada", purpose: "seasonal_rent", purposeLabel: "temporada" };
  }
  if (containsAlias(normalizedText, PURPOSE_ALIASES.annualRent)) {
    return { businessType: "Locação", purpose: "annual_rent", purposeLabel: "locação anual" };
  }
  if (containsAlias(normalizedText, PURPOSE_ALIASES.sale)) {
    return { businessType: "Venda", purpose: "sale", purposeLabel: "venda" };
  }
  return {};
}

function detectPrice(text: string) {
  const pricePattern =
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d{4,}(?:,\d{2})?)(?=\s*(?:com\s+taxas|taxas|$))/i;
  const explicitPrice = text.match(/r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d{4,}(?:,\d{2})?)/i);
  const candidate = explicitPrice?.[1] ?? text.match(pricePattern)?.[1];
  return candidate ? parseBrazilianNumber(candidate) : undefined;
}

function detectHyphenLocation(text: string) {
  const match = text.match(
    /([A-ZÀ-Úa-zà-ú][^-|\n\r]{2,})\s+-\s+([A-ZÀ-Úa-zà-ú][^-|\n\r]{2,})\s+-\s+([A-Z]{2})\b/,
  );
  if (!match) return {};
  return {
    neighborhood: match[1]?.trim().replace(/^.*\b(?:no|na|em)\s+/i, ""),
    city: match[2]?.trim(),
    state: match[3]?.trim().toUpperCase(),
  };
}

function detectKnownNeighborhood(normalizedText: string) {
  for (const [neighborhood, data] of Object.entries(NEIGHBORHOOD_ALIASES)) {
    if (containsAlias(normalizedText, data.aliases)) {
      return { neighborhood, city: data.city, state: data.state };
    }
  }
  return {};
}

function detectType(normalizedText: string): Pick<ParsedPropertyText, "type" | "propertyType"> {
  if (containsAlias(normalizedText, PROPERTY_TYPE_ALIASES.penthouse))
    return { type: "Cobertura", propertyType: "penthouse" };
  if (containsAlias(normalizedText, PROPERTY_TYPE_ALIASES.studio))
    return { type: "Studio", propertyType: "studio" };
  if (containsAlias(normalizedText, PROPERTY_TYPE_ALIASES.house))
    return { type: "Casa", propertyType: "house" };
  if (containsAlias(normalizedText, PROPERTY_TYPE_ALIASES.commercial))
    return { type: "Comercial", propertyType: "commercial" };
  if (containsAlias(normalizedText, PROPERTY_TYPE_ALIASES.apartment))
    return { type: "Apartamento", propertyType: "apartment" };
  return {};
}

function plural(count: number, singular: string, pluralText: string) {
  return `${count} ${count === 1 ? singular : pluralText}`;
}

function formatCurrencyBRL(value: number) {
  return value
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    })
    .replace(/\u00a0/g, " ");
}

function buildTitle(data: ParsedPropertyText) {
  const parts = [data.type || "Imóvel"];
  if (data.terrace) parts.push("com terraço");
  if (data.furnished) parts.push("mobiliado");
  else if (data.semiFurnished) parts.push("semi mobiliado");
  if (data.purposeLabel) parts.push(`para ${data.purposeLabel}`);
  if (data.distanceFromBeachMeters) parts.push(`a ${data.distanceFromBeachMeters}m da praia`);
  if (data.neighborhood) parts.push(`na ${data.neighborhood}`);
  if (data.city) parts.push(`em ${data.city}`);
  return parts.join(" ");
}

function buildDescription(data: ParsedPropertyText) {
  const sentences: string[] = [];
  const location = [
    data.neighborhood ? `na ${data.neighborhood}` : "",
    data.city ? `em ${data.city}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const opening = [
    data.type || "Imóvel",
    data.purposeLabel ? `disponível para ${data.purposeLabel}` : "disponível",
    location,
    data.distanceFromBeachMeters ? `a apenas ${data.distanceFromBeachMeters} metros da praia` : "",
  ].filter(Boolean);
  sentences.push(`${opening.join(" ")}.`);

  const details = [
    data.suites ? plural(data.suites, "suíte", "suítes") : "",
    data.bedrooms ? plural(data.bedrooms, "quarto", "quartos") : "",
    data.parking ? `${plural(data.parking, "vaga", "vagas")} de garagem` : "",
    data.bathrooms ? plural(data.bathrooms, "banheiro", "banheiros") : "",
    data.terrace ? "terraço" : "",
    data.furnished ? "mobiliado" : "",
    data.semiFurnished ? "semi mobiliado" : "",
    data.airConditioning ? "ar-condicionado" : "",
  ].filter(Boolean);
  if (details.length)
    sentences.push(`Conta com ${details.join(", ").replace(/, ([^,]*)$/, " e $1")}.`);

  const amenities = Object.entries(data.features || {})
    .filter(([key, value]) => value && amenityLabels[key] && key !== "terraco")
    .map(([key]) => amenityLabels[key]);
  if (amenities.length) sentences.push(`O condomínio oferece ${amenities.join(", ")}.`);

  if (data.price) {
    sentences.push(
      `Valor de ${formatCurrencyBRL(data.price)}${data.feesIncluded ? " com taxas inclusas" : ""}.`,
    );
  }

  return sentences.join(" ");
}

function detectObservations(normalizedText: string) {
  const observations: string[] = [];
  if (/\bapto\s+diferenciado\b|\bapartamento\s+diferenciado\b/.test(normalizedText)) {
    observations.push("apto diferenciado");
  }
  if (/\bcom\s+terraco\b|\bterraco\b/.test(normalizedText)) {
    observations.push("com terraço");
  }
  return observations;
}

export function parsePropertyText(text: string): ParsedPropertyText {
  const normalizedText = normalize(text);
  const parsed: ParsedPropertyText = {
    ...detectPurpose(normalizedText),
    ...detectKnownNeighborhood(normalizedText),
    ...detectHyphenLocation(text),
    ...detectType(normalizedText),
  };
  const numberToken = numberTokenPattern();

  parsed.distanceFromBeachMeters = firstNumberFor(
    normalizedText,
    new RegExp(
      String.raw`\ba\s+${numberToken}\s*(?:m|metros?)\s+do\s+mar\b|\b${numberToken}\s*(?:m|metros?)\s+da\s+praia\b`,
    ),
  );
  if (!parsed.distanceFromBeachMeters) {
    parsed.distanceFromBeachMeters = firstNumberFor(
      normalizedText,
      new RegExp(String.raw`\ba\s+${numberToken}\s*(?:m|metros?)\s+da\s+praia\b`),
    );
  }

  parsed.suites = firstNumberFor(
    normalizedText,
    new RegExp(String.raw`\b${numberToken}\s+suites?\b`),
  );
  parsed.bedrooms = firstNumberFor(
    normalizedText,
    new RegExp(String.raw`\b${numberToken}\s+(?:dormitorios?|quartos?)\b`),
  );
  parsed.parking = firstNumberFor(
    normalizedText,
    new RegExp(String.raw`\b${numberToken}\s+(?:vagas?|garagens?)\b`),
  );
  if (!parsed.parking && /\bgaragem\b/.test(normalizedText)) parsed.parking = 1;
  parsed.parkingSpaces = parsed.parking;
  parsed.bathrooms = firstNumberFor(
    normalizedText,
    new RegExp(String.raw`\b${numberToken}\s+banheiros?\b`),
  );
  parsed.price = detectPrice(text);
  if (
    !parsed.type &&
    (parsed.suites || parsed.bedrooms || parsed.parking) &&
    !/\bcasa\b|\bterreno\b|\bsala\s+comercial\b/.test(normalizedText)
  ) {
    parsed.type = "Apartamento";
    parsed.propertyType = "apartment";
  }
  if (/\bsemi\s*mobiliado\b|\bsemimobiliado\b/.test(normalizedText)) parsed.semiFurnished = true;
  if (!parsed.semiFurnished && /\bmobiliado\b/.test(normalizedText)) parsed.furnished = true;
  if (/\bsplit\b|\bar[-\s]?condicionado\b/.test(normalizedText)) parsed.airConditioning = true;
  if (/\bcom\s+taxas\b|\btaxas\s+inclusas\b|\bvalor\s+com\s+taxas\b/.test(normalizedText))
    parsed.feesIncluded = true;
  parsed.terrace = /\bterraco\b/.test(normalizedText) || undefined;
  parsed.observations = detectObservations(normalizedText);

  const features: Record<string, boolean> = {};
  for (const [key, pattern] of amenityPatterns) {
    if (pattern.test(normalizedText)) features[key] = true;
  }
  if (features.quadraFutebolSociety) delete features.quadra;
  if (parsed.furnished) features.mobiliado = true;
  if (parsed.semiFurnished) features.semiMobiliado = true;
  if (parsed.airConditioning) features.arCondicionado = true;
  if (parsed.feesIncluded) features.taxasInclusas = true;
  if (parsed.terrace) features.terraco = true;
  parsed.features = features;

  parsed.title = buildTitle(parsed);
  parsed.description = buildDescription(parsed);

  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([, value]) =>
        value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0),
    ),
  ) as ParsedPropertyText;
}
