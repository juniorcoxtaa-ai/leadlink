export type ParsedPropertyText = {
  title?: string;
  description?: string;
  type?: string;
  businessType?: "Venda" | "Locação" | "Temporada";
  purposeLabel?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  suites?: number;
  neighborhood?: string;
  city?: string;
  state?: string;
  distanceFromBeachMeters?: number;
  furnished?: boolean;
  semiFurnished?: boolean;
  airConditioning?: boolean;
  feesIncluded?: boolean;
  features?: Record<string, boolean>;
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
  vistaMar: "vista para o mar",
  frenteMar: "frente mar",
  aceitaPet: "pet friendly",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseBrazilianNumber(value: string) {
  const clean = value.replace(/[^\d,.]/g, "");
  if (!clean) return undefined;
  if (clean.includes(",")) return Number(clean.replace(/\./g, "").replace(",", "."));
  return Number(clean.replace(/\./g, ""));
}

function firstNumberFor(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  const value = match?.slice(1).find(Boolean);
  return value ? Number(value) : undefined;
}

function detectPurpose(
  normalizedText: string,
): Pick<ParsedPropertyText, "businessType" | "purposeLabel"> {
  if (/\btemporada\b/.test(normalizedText))
    return { businessType: "Temporada", purposeLabel: "temporada" };
  if (/\blocacao\s+anual\b|\baluguel\s+anual\b/.test(normalizedText)) {
    return { businessType: "Locação", purposeLabel: "locação anual" };
  }
  if (/\bvenda\b|\ba\s+venda\b/.test(normalizedText))
    return { businessType: "Venda", purposeLabel: "venda" };
  return {};
}

function detectPrice(text: string) {
  const pricePattern = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d{4,}(?:,\d{2})?)/i;
  const explicitPrice = text.match(/r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d{4,}(?:,\d{2})?)/i);
  const candidate = explicitPrice?.[1] ?? text.match(pricePattern)?.[1];
  return candidate ? parseBrazilianNumber(candidate) : undefined;
}

function detectLocation(text: string) {
  const match = text.match(
    /([A-ZÀ-Úa-zà-ú][^-|\n\r]{2,})\s+-\s+([A-ZÀ-Úa-zà-ú][^-|\n\r]{2,})\s+-\s+([A-Z]{2})\b/,
  );
  if (!match) return {};
  return {
    neighborhood: match[1]?.trim(),
    city: match[2]?.trim(),
    state: match[3]?.trim().toUpperCase(),
  };
}

function detectType(normalizedText: string) {
  if (/\bcobertura\b/.test(normalizedText)) return "Cobertura";
  if (/\bstudio\b/.test(normalizedText)) return "Studio";
  if (/\bcasa\b/.test(normalizedText)) return "Casa";
  if (/\bcomercial\b|\bsala\s+comercial\b/.test(normalizedText)) return "Comercial";
  if (/\bapartamento\b|\bapto\b|\bapt\b/.test(normalizedText)) return "Apartamento";
  return undefined;
}

function plural(count: number, singular: string, pluralText: string) {
  return `${count} ${count === 1 ? singular : pluralText}`;
}

function formatCurrencyBRL(value: number) {
  return value
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/\u00a0/g, " ");
}

function buildTitle(data: ParsedPropertyText) {
  const parts = [data.type || "Imóvel"];
  if (data.furnished) parts.push("mobiliado");
  else if (data.semiFurnished) parts.push("semi mobiliado");
  if (data.purposeLabel) parts.push(`para ${data.purposeLabel}`);
  if (data.distanceFromBeachMeters) parts.push(`a ${data.distanceFromBeachMeters}m da praia`);
  if (data.city) parts.push(`em ${data.city}`);
  return parts.join(" ");
}

function buildDescription(data: ParsedPropertyText) {
  const sentences: string[] = [];
  const location = [data.neighborhood, data.city ? `em ${data.city}` : ""]
    .filter(Boolean)
    .join(", ");
  const opening = [
    data.type || "Imóvel",
    data.purposeLabel ? `disponível para ${data.purposeLabel}` : "disponível",
    location ? `no ${location}` : "",
    data.distanceFromBeachMeters ? `a apenas ${data.distanceFromBeachMeters} metros da praia` : "",
  ].filter(Boolean);
  sentences.push(`${opening.join(" ")}.`);

  const details = [
    data.suites ? plural(data.suites, "suíte", "suítes") : "",
    data.bedrooms ? plural(data.bedrooms, "dormitório", "dormitórios") : "",
    data.parking ? `${plural(data.parking, "vaga", "vagas")} de garagem` : "",
    data.bathrooms ? plural(data.bathrooms, "banheiro", "banheiros") : "",
    data.furnished ? "mobiliado" : "",
    data.semiFurnished ? "semi mobiliado" : "",
    data.airConditioning ? "ar-condicionado" : "",
  ].filter(Boolean);
  if (details.length) sentences.push(`Conta com ${details.join(", ")}.`);

  const amenities = Object.entries(data.features || {})
    .filter(([key, value]) => value && amenityLabels[key])
    .map(([key]) => amenityLabels[key]);
  if (amenities.length) sentences.push(`O condomínio oferece ${amenities.join(", ")}.`);

  if (data.price) {
    sentences.push(
      `Valor de ${formatCurrencyBRL(data.price)}${data.feesIncluded ? " com taxas inclusas" : ""}.`,
    );
  }

  return sentences.join(" ");
}

export function parsePropertyText(text: string): ParsedPropertyText {
  const normalizedText = normalize(text);
  const parsed: ParsedPropertyText = {
    ...detectPurpose(normalizedText),
    ...detectLocation(text),
  };

  parsed.type = detectType(normalizedText);
  parsed.distanceFromBeachMeters = firstNumberFor(
    normalizedText,
    /\ba\s+(\d{1,5})\s*(?:m|metros?)\s+do\s+mar\b|\b(\d{1,5})\s*(?:m|metros?)\s+da\s+praia\b/,
  );
  if (!parsed.distanceFromBeachMeters) {
    const distanceMatch = normalizedText.match(/\ba\s+(\d{1,5})\s*(?:m|metros?)\s+da\s+praia\b/);
    parsed.distanceFromBeachMeters = distanceMatch?.[1] ? Number(distanceMatch[1]) : undefined;
  }

  parsed.suites = firstNumberFor(normalizedText, /\b(\d+)\s+suites?\b/);
  parsed.bedrooms = firstNumberFor(normalizedText, /\b(\d+)\s+(?:dormitorios?|quartos?)\b/);
  parsed.parking = firstNumberFor(normalizedText, /\b(\d+)\s+vagas?\b/);
  parsed.bathrooms = firstNumberFor(normalizedText, /\b(\d+)\s+banheiros?\b/);
  parsed.price = detectPrice(text);
  if (/\bsemi\s*mobiliado\b|\bsemimobiliado\b/.test(normalizedText)) parsed.semiFurnished = true;
  if (!parsed.semiFurnished && /\bmobiliado\b/.test(normalizedText)) parsed.furnished = true;
  if (/\bsplit\b|\bar[-\s]?condicionado\b/.test(normalizedText)) parsed.airConditioning = true;
  if (/\bcom\s+taxas\b|\btaxas\s+inclusas\b|\bvalor\s+com\s+taxas\b/.test(normalizedText))
    parsed.feesIncluded = true;

  const features: Record<string, boolean> = {};
  for (const [key, pattern] of amenityPatterns) {
    if (pattern.test(normalizedText)) features[key] = true;
  }
  if (features.quadraFutebolSociety) delete features.quadra;
  if (parsed.furnished) features.mobiliado = true;
  if (parsed.semiFurnished) features.semiMobiliado = true;
  if (parsed.airConditioning) features.arCondicionado = true;
  if (parsed.feesIncluded) features.taxasInclusas = true;
  parsed.features = features;

  parsed.title = buildTitle(parsed);
  parsed.description = buildDescription(parsed);

  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== ""),
  ) as ParsedPropertyText;
}
