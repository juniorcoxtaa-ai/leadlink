import { Bath, Bed, Car, Home, Maximize2, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PropertyPurpose = "Venda" | "Locação" | "Temporada" | "Locação anual";

export type PropertyDisplayInput = {
  title?: string | null;
  type?: string | null;
  businessType?: string | null;
  price?: number | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  code?: string | null;
  description?: string | null;
  features?: Record<string, unknown> | null;
};

export type PropertyDetailItem = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  compact: string;
};

const mojibakeMap: Record<string, string> = {
  "Ã¡": "á",
  "Ã ": "à",
  "Ã¢": "â",
  "Ã£": "ã",
  "Ã©": "é",
  "Ãª": "ê",
  "Ã­": "í",
  "Ã³": "ó",
  "Ã´": "ô",
  "Ãµ": "õ",
  "Ãº": "ú",
  "Ã§": "ç",
  "Ã": "Á",
  "Ã€": "À",
  "Ã‚": "Â",
  "Ãƒ": "Ã",
  "Ã‰": "É",
  "ÃŠ": "Ê",
  "Ã": "Í",
  "Ã“": "Ó",
  "Ã”": "Ô",
  "Ã•": "Õ",
  "Ãš": "Ú",
  "Ã‡": "Ç",
  "Â·": "·",
  "Â©": "©",
  "mÂ²": "m²",
  "â€”": "—",
  "â€¦": "…",
  "ðŸ ": "🏠",
  "ÃƒÂ¡": "á",
  "Ãƒ ": "à",
  "ÃƒÂ¢": "â",
  "ÃƒÂ£": "ã",
  "ÃƒÂ©": "é",
  "ÃƒÂª": "ê",
  "ÃƒÂ­": "í",
  "ÃƒÂ³": "ó",
  "ÃƒÂ´": "ô",
  "ÃƒÂµ": "õ",
  "ÃƒÂº": "ú",
  "ÃƒÂ§": "ç",
  "ÃƒÂ": "Á",
  "Ãƒâ‚¬": "À",
  "Ãƒâ€š": "Â",
  "ÃƒÆ’": "Ã",
  "Ãƒâ€°": "É",
  "ÃƒÅ ": "Ê",
  "ÃƒÂ": "Í",
  "Ãƒâ€œ": "Ó",
  "Ãƒâ€": "Ô",
  "Ãƒâ€¢": "Õ",
  "ÃƒÅ¡": "Ú",
  "Ãƒâ€¡": "Ç",
  "Ã‚Â·": "·",
  "Ã‚Â©": "©",
  "mÃ‚Â²": "m²",
  "Ã¢â‚¬â€": "—",
  "Ã¢â‚¬Â¦": "…",
  "Ã°Å¸ÂÂ ": "🏠",
  "Ëœ": "~",
};

const featureLabels: Record<string, string> = {
  piscina: "Piscina",
  piscinaAdulto: "Piscina adulto",
  piscinaInfantil: "Piscina infantil",
  piscinaAquecida: "Piscina aquecida",
  churrasqueira: "Churrasqueira",
  elevador: "Elevador",
  sacada: "Sacada",
  varanda: "Varanda",
  terraco: "Terraço",
  mobiliado: "Mobiliado",
  semiMobiliado: "Semi mobiliado",
  arCondicionado: "Ar-condicionado",
  taxasInclusas: "Taxas inclusas",
  areaLazer: "Área de lazer",
  areaDeLazer: "Área de lazer",
  areaEstar: "Área de estar",
  areaExterna: "Área externa",
  salaoFestas: "Salão de festas",
  salaoJogos: "Salão de jogos",
  academia: "Academia",
  brinquedoteca: "Brinquedoteca",
  playground: "Playground",
  quadraFutebolSociety: "Quadra de futebol society",
  quadra: "Quadra",
  vistaMar: "Vista para o mar",
  frenteMar: "Frente mar",
  aceitaPet: "Pet friendly",
  varandaGourmet: "Varanda gourmet",
  cozinhaPlanejada: "Cozinha planejada",
  pisoPorcelanato: "Piso porcelanato",
  closet: "Closet",
};

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function plural(count: number, singular: string, pluralText: string) {
  return `${count} ${count === 1 ? singular : pluralText}`;
}

export function repairText(value: unknown) {
  if (value == null) return "";
  let text = String(value);
  for (const [broken, fixed] of Object.entries(mojibakeMap)) {
    text = text.split(broken).join(fixed);
  }
  return text;
}

export function normalizePropertyPurpose(value?: string | null): PropertyPurpose | undefined {
  const repaired = repairText(value).trim();
  const normalized = stripAccents(repaired).toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("temporada")) return "Temporada";
  if (normalized.includes("locacao anual") || normalized.includes("aluguel anual")) {
    return "Locação anual";
  }
  if (normalized.includes("locacao") || normalized.includes("aluguel")) return "Locação";
  if (normalized.includes("venda")) return "Venda";
  return repaired as PropertyPurpose;
}

export function purposeBadgeLabel(value?: string | null) {
  return normalizePropertyPurpose(value) || "";
}

export function purposePriceLabel(value?: string | null) {
  const purpose = normalizePropertyPurpose(value);
  if (purpose === "Venda") return "À venda por";
  if (purpose === "Temporada") return "Temporada por";
  return "Para locação por";
}

export function formatPropertyPrice(value?: number | null) {
  const price = positiveNumber(value);
  if (!price) return "Valor sob consulta";
  return price
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    })
    .replace(/\u00a0/g, " ");
}

export function formatPropertyLocation(property: PropertyDisplayInput) {
  const neighborhood = repairText(property.neighborhood).trim();
  const city = repairText(property.city).trim();
  const state = repairText(property.state).trim().toUpperCase();
  const parts = [neighborhood, city, state].filter(Boolean);
  return parts.join(", ");
}

export function getFeatureNumber(
  features: Record<string, unknown> | null | undefined,
  key: string,
) {
  return positiveNumber(features?.[key]);
}

export function getPropertyDetails(property: PropertyDisplayInput): PropertyDetailItem[] {
  const features = property.features || {};
  const bedrooms = positiveNumber(property.bedrooms);
  const suites = getFeatureNumber(features, "suites");
  const bathrooms = positiveNumber(property.bathrooms);
  const parking = positiveNumber(property.parking);
  const area = positiveNumber(property.area);
  const distance = getFeatureNumber(features, "distanceFromBeachMeters");

  return [
    bedrooms
      ? {
          key: "bedrooms",
          label: bedrooms === 1 ? "Dormitório" : "Dormitórios",
          value: String(bedrooms),
          icon: Bed,
          compact: `${bedrooms} dorm`,
        }
      : null,
    suites
      ? {
          key: "suites",
          label: suites === 1 ? "Suíte" : "Suítes",
          value: String(suites),
          icon: Home,
          compact: plural(suites, "suíte", "suítes"),
        }
      : null,
    bathrooms
      ? {
          key: "bathrooms",
          label: bathrooms === 1 ? "Banheiro" : "Banheiros",
          value: String(bathrooms),
          icon: Bath,
          compact: `${bathrooms} banh`,
        }
      : null,
    parking
      ? {
          key: "parking",
          label: parking === 1 ? "Vaga" : "Vagas",
          value: String(parking),
          icon: Car,
          compact: `${parking} vagas`,
        }
      : null,
    area
      ? {
          key: "area",
          label: "Área útil",
          value: `${area}m²`,
          icon: Maximize2,
          compact: `${area}m²`,
        }
      : null,
    distance
      ? {
          key: "distanceFromBeachMeters",
          label: "Da praia",
          value: `${distance}m`,
          icon: Waves,
          compact: `${distance}m da praia`,
        }
      : null,
  ].filter(Boolean) as PropertyDetailItem[];
}

export function buildFeaturesList(features: Record<string, unknown> | null | undefined) {
  if (!features) return [];
  return Object.entries(features)
    .filter(([key, enabled]) => {
      if (key === "suites" || key === "distanceFromBeachMeters") return false;
      return enabled === true;
    })
    .map(([key]) => featureLabels[key] || repairText(key))
    .filter(Boolean);
}

export function propertySearchText(property: PropertyDisplayInput) {
  return [
    property.title,
    property.code,
    property.type,
    purposeBadgeLabel(property.businessType),
    property.neighborhood,
    property.city,
    property.state,
    buildFeaturesList(property.features).join(" "),
  ]
    .map(repairText)
    .join(" ")
    .toLowerCase();
}

export function buildPropertyDescription(property: PropertyDisplayInput) {
  const savedDescription = repairText(property.description).trim();
  if (savedDescription) return savedDescription;

  const type = repairText(property.type).trim() || "Imóvel";
  const title = repairText(property.title).trim() || type;
  const location = formatPropertyLocation(property);
  const purpose = normalizePropertyPurpose(property.businessType);
  const details = getPropertyDetails(property)
    .filter((item) => item.key !== "distanceFromBeachMeters")
    .map((item) => item.compact);
  const features = buildFeaturesList(property.features);
  const sentences = [`${title} é um ${type.toLowerCase()}${location ? ` em ${location}` : ""}.`];

  if (details.length) sentences.push(`Conta com ${details.join(", ")}.`);
  if (features.length) sentences.push(`Diferenciais cadastrados: ${features.join(", ")}.`);
  if (purpose) {
    sentences.push(`${purposePriceLabel(purpose)} ${formatPropertyPrice(property.price)}.`);
  }

  return sentences.join(" ");
}
