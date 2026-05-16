export type LeadStatus =
  | "novo"
  | "contatado"
  | "qualificado"
  | "visita"
  | "proposta"
  | "ganho"
  | "perdido";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  visita: "Visita Agendada",
  proposta: "Proposta Enviada",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const KANBAN_COLUMNS: LeadStatus[] = [
  "novo",
  "contatado",
  "qualificado",
  "visita",
  "proposta",
  "ganho",
];

export type LeadSource = "Site" | "ZAP" | "OLX" | "Viva Real" | "Indicação" | "Instagram";

export interface Broker {
  id: string;
  name: string;
  initials: string;
  email: string;
  conversion: number;
  leads: number;
}

export interface Activity {
  id: string;
  type: "criado" | "mensagem" | "ligacao" | "visita" | "nota" | "status";
  text: string;
  at: string;
}

export interface ChatMsg {
  id: string;
  from: "broker" | "lead";
  text: string;
  at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  interest: string;
  budget: string;
  region: string;
  timeline: string;
  brokerId: string;
  createdAt: string;
  lastContact: string;
  notes: string;
  activity: Activity[];
  chat: ChatMsg[];
}

export const brokers: Broker[] = [
  { id: "b1", name: "Mariana Costa", initials: "MC", email: "mariana@imovix.com.br", conversion: 32, leads: 48 },
  { id: "b2", name: "Rafael Souza", initials: "RS", email: "rafael@imovix.com.br", conversion: 28, leads: 41 },
  { id: "b3", name: "Juliana Pereira", initials: "JP", email: "juliana@imovix.com.br", conversion: 24, leads: 37 },
  { id: "b4", name: "Carlos Mendes", initials: "CM", email: "carlos@imovix.com.br", conversion: 19, leads: 29 },
];

const names = [
  "Ana Beatriz Almeida", "Pedro Henrique Lima", "Camila Rodrigues", "Lucas Oliveira",
  "Fernanda Martins", "Bruno Carvalho", "Patrícia Gomes", "Thiago Nascimento",
  "Renata Vieira", "Gustavo Ferreira", "Larissa Ribeiro", "Marcos Pinto",
  "Beatriz Cardoso", "Rodrigo Barros", "Isabela Moreira", "Felipe Araújo",
  "Vanessa Teixeira", "Eduardo Lopes", "Carolina Dias", "André Castro",
];

const interests = [
  "Apartamento 3 dorms - Vila Mariana",
  "Cobertura Duplex - Itaim Bibi",
  "Casa em condomínio - Alphaville",
  "Studio - Vila Madalena",
  "Apartamento 2 dorms - Pinheiros",
  "Sala Comercial - Faria Lima",
  "Apartamento 4 dorms - Jardins",
  "Casa - Granja Viana",
];

const regions = ["São Paulo - SP", "Alphaville - SP", "Santo André - SP", "Campinas - SP"];
const sources: LeadSource[] = ["Site", "ZAP", "OLX", "Viva Real", "Indicação", "Instagram"];
const statuses: LeadStatus[] = ["novo", "contatado", "qualificado", "visita", "proposta", "ganho", "perdido"];

function fakePhone(i: number) {
  const a = 90000 + ((i * 7919) % 9999);
  const b = 1000 + ((i * 1237) % 9000);
  return `+55 11 9${a.toString().slice(0, 4)}-${b}`;
}
function fakeBudget(i: number) {
  const v = 350 + ((i * 137) % 2400);
  return `R$ ${v.toLocaleString("pt-BR")}.000`;
}
function daysAgo(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
}

export const leads: Lead[] = names.map((name, i) => {
  const status = statuses[i % statuses.length];
  const score = 30 + ((i * 13) % 70);
  return {
    id: `L-${1000 + i}`,
    name,
    phone: fakePhone(i),
    email: name.toLowerCase().replace(/ /g, ".").normalize("NFD").replace(/[^\w.]/g, "") + "@email.com",
    source: sources[i % sources.length],
    status,
    score,
    interest: interests[i % interests.length],
    budget: fakeBudget(i),
    region: regions[i % regions.length],
    timeline: ["Imediato", "1-3 meses", "3-6 meses", "Mais de 6 meses"][i % 4],
    brokerId: brokers[i % brokers.length].id,
    createdAt: daysAgo(i % 30),
    lastContact: daysAgo(i % 7),
    notes: "Cliente interessado em financiamento. Solicitou simulação.",
    activity: [
      { id: "a1", type: "criado", text: "Lead criado via " + sources[i % sources.length], at: daysAgo(i % 30) },
      { id: "a2", type: "mensagem", text: "Mensagem de boas-vindas enviada via WhatsApp", at: daysAgo(Math.max(0, (i % 30) - 1)) },
      { id: "a3", type: "ligacao", text: "Ligação realizada - duração 4min", at: daysAgo(Math.max(0, (i % 30) - 2)) },
      { id: "a4", type: "nota", text: "Cliente prefere contato pela manhã", at: daysAgo(Math.max(0, (i % 30) - 3)) },
    ],
    chat: [
      { id: "m1", from: "broker", text: `Olá ${name.split(" ")[0]}! Vi seu interesse em ${interests[i % interests.length]}. Posso te ajudar?`, at: daysAgo(3) },
      { id: "m2", from: "lead", text: "Oi! Sim, gostaria de mais informações sobre valores e condições.", at: daysAgo(3) },
      { id: "m3", from: "broker", text: "Claro! O valor do imóvel está em " + fakeBudget(i) + ". Aceita financiamento. Quando podemos agendar uma visita?", at: daysAgo(2) },
      { id: "m4", from: "lead", text: "Posso na sexta de tarde?", at: daysAgo(1) },
    ],
  };
});

export const kpis = {
  total: leads.length * 17,
  today: 12,
  conversion: 26.4,
  responseTime: "8min",
};

export const funnel = KANBAN_COLUMNS.map((s) => ({
  status: STATUS_LABEL[s],
  value: leads.filter((l) => l.status === s).length * 14 + 20,
}));

export const leadsOverTime = Array.from({ length: 14 }).map((_, i) => ({
  day: `${i + 1}/05`,
  leads: 8 + Math.round(Math.sin(i / 2) * 6 + i * 0.8 + (i % 3) * 2),
  ganhos: 2 + Math.round(Math.cos(i / 2) * 2 + i * 0.3),
}));

export const leadsBySource = sources.map((s, i) => ({
  name: s,
  value: 12 + ((i * 17) % 30),
}));

// ===================== Imóveis =====================
export interface Property {
  id: string;
  code: string;
  title: string;
  type: "Apartamento" | "Cobertura" | "Casa" | "Studio" | "Comercial";
  status: "Disponível" | "Reservado" | "Vendido" | "Em captação";
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  neighborhood: string;
  city: string;
  brokerId: string;
  views: number;
  leads: number;
  image: string;
  highlight?: string;
}

const propertyImages = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=900&q=80",
];

const propTitles = [
  { t: "Cobertura Duplex Vista Parque", n: "Itaim Bibi", type: "Cobertura" as const, b: 4, ba: 5, p: 4, area: 320, price: 8900000, h: "Exclusividade" },
  { t: "Apartamento Alto Padrão", n: "Vila Nova Conceição", type: "Apartamento" as const, b: 3, ba: 4, p: 3, area: 185, price: 4250000 },
  { t: "Casa Térrea Moderna", n: "Alphaville Residencial 6", type: "Casa" as const, b: 4, ba: 5, p: 4, area: 420, price: 5800000, h: "Lançamento" },
  { t: "Studio Designer", n: "Vila Madalena", type: "Studio" as const, b: 1, ba: 1, p: 1, area: 38, price: 685000 },
  { t: "Apartamento Garden", n: "Pinheiros", type: "Apartamento" as const, b: 2, ba: 2, p: 2, area: 120, price: 1850000 },
  { t: "Cobertura Linear", n: "Jardins", type: "Cobertura" as const, b: 4, ba: 4, p: 3, area: 280, price: 6500000, h: "Vista única" },
  { t: "Sala Comercial Premium", n: "Faria Lima", type: "Comercial" as const, b: 0, ba: 2, p: 2, area: 95, price: 1450000 },
  { t: "Casa em Condomínio", n: "Granja Viana", type: "Casa" as const, b: 4, ba: 4, p: 4, area: 380, price: 3200000 },
];

export const properties: Property[] = propTitles.map((p, i) => ({
  id: `IM-${2000 + i}`,
  code: `LL${2000 + i}`,
  title: p.t,
  type: p.type,
  status: (["Disponível", "Disponível", "Disponível", "Reservado", "Em captação", "Disponível", "Vendido", "Disponível"] as const)[i],
  price: p.price,
  area: p.area,
  bedrooms: p.b,
  bathrooms: p.ba,
  parking: p.p,
  neighborhood: p.n,
  city: "São Paulo",
  brokerId: brokers[i % brokers.length].id,
  views: 120 + ((i * 137) % 800),
  leads: 4 + ((i * 7) % 22),
  image: propertyImages[i],
  highlight: p.h,
}));

// ===================== Agenda =====================
export interface Appointment {
  id: string;
  title: string;
  type: "Visita" | "Reunião" | "Ligação" | "Assinatura";
  leadName: string;
  propertyTitle?: string;
  brokerId: string;
  date: string;
  duration: number;
  location: string;
  status: "confirmado" | "pendente" | "concluido";
}

function inDays(d: number, h: number, m = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
}

export const appointments: Appointment[] = [
  { id: "ap1", title: "Visita Cobertura Duplex", type: "Visita", leadName: "Ana Beatriz Almeida", propertyTitle: "Cobertura Duplex Vista Parque", brokerId: "b1", date: inDays(0, 10), duration: 60, location: "Itaim Bibi, SP", status: "confirmado" },
  { id: "ap2", title: "Reunião proposta", type: "Reunião", leadName: "Pedro Henrique Lima", propertyTitle: "Apartamento Alto Padrão", brokerId: "b1", date: inDays(0, 14, 30), duration: 45, location: "Escritório", status: "confirmado" },
  { id: "ap3", title: "Ligação follow-up", type: "Ligação", leadName: "Camila Rodrigues", brokerId: "b2", date: inDays(0, 16), duration: 20, location: "Telefone", status: "pendente" },
  { id: "ap4", title: "Visita Casa Alphaville", type: "Visita", leadName: "Lucas Oliveira", propertyTitle: "Casa Térrea Moderna", brokerId: "b3", date: inDays(1, 9, 30), duration: 90, location: "Alphaville, SP", status: "confirmado" },
  { id: "ap5", title: "Assinatura de contrato", type: "Assinatura", leadName: "Fernanda Martins", propertyTitle: "Studio Designer", brokerId: "b1", date: inDays(1, 15), duration: 60, location: "Cartório Sé", status: "confirmado" },
  { id: "ap6", title: "Visita Cobertura Linear", type: "Visita", leadName: "Bruno Carvalho", propertyTitle: "Cobertura Linear", brokerId: "b2", date: inDays(2, 11), duration: 60, location: "Jardins, SP", status: "pendente" },
  { id: "ap7", title: "Reunião alinhamento", type: "Reunião", leadName: "Patrícia Gomes", brokerId: "b4", date: inDays(2, 17), duration: 30, location: "Online", status: "confirmado" },
  { id: "ap8", title: "Visita Garden", type: "Visita", leadName: "Thiago Nascimento", propertyTitle: "Apartamento Garden", brokerId: "b3", date: inDays(3, 10, 30), duration: 45, location: "Pinheiros, SP", status: "confirmado" },
];

// ===================== Integrações =====================
export type IntegrationCategory =
  | "Portal"
  | "Comunicação"
  | "CRM"
  | "Marketing"
  | "Agenda"
  | "Pagamento"
  | "Automação";

export type IntegrationAuthType =
  | "oauth"
  | "api_key"
  | "webhook"
  | "credentials"
  | "embed";

export interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "email";
  placeholder?: string;
  helper?: string;
}

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  connected: boolean;
  leads?: number;
  letter: string;
  authType: IntegrationAuthType;
  fields?: IntegrationField[];
  docsUrl?: string;
  highlights?: string[];
}

export const integrations: Integration[] = [
  // ===== Portais imobiliários =====
  {
    id: "zap", name: "ZAP Imóveis", category: "Portal", letter: "Z",
    description: "Sincronize anúncios e capture leads do maior portal imobiliário.",
    connected: true, leads: 142, authType: "webhook",
    highlights: ["Leads em tempo real", "Sincroniza portfólio", "Status do anúncio"],
    fields: [
      { key: "webhook", label: "URL de webhook (cole no painel ZAP)", type: "url", placeholder: "https://leadlink.com.br/api/leads/zap/...", helper: "Cole esta URL na seção Integrações do seu painel ZAP." },
      { key: "account", label: "ID da conta ZAP", type: "text", placeholder: "ZAP-000000" },
    ],
  },
  {
    id: "vivareal", name: "Viva Real", category: "Portal", letter: "V",
    description: "Importe leads e exporte seu portfólio automaticamente.",
    connected: true, leads: 98, authType: "webhook",
    highlights: ["XML de portfólio", "Lead instantâneo", "Anti-duplicidade"],
    fields: [
      { key: "webhook", label: "URL de webhook Viva Real", type: "url", placeholder: "https://leadlink.com.br/api/leads/vivareal/..." },
      { key: "xml", label: "URL do XML de portfólio (opcional)", type: "url" },
    ],
  },
  {
    id: "olx", name: "OLX Imóveis", category: "Portal", letter: "O",
    description: "Receba leads do OLX direto na sua pipeline.",
    connected: true, leads: 64, authType: "api_key",
    highlights: ["Token OLX", "Leads qualificados"],
    fields: [
      { key: "token", label: "Token de integração OLX", type: "password", placeholder: "olx_live_xxxxxxxx" },
    ],
  },
  {
    id: "imovelweb", name: "Imovelweb", category: "Portal", letter: "I",
    description: "Receba contatos do Imovelweb e atualize o portfólio.",
    connected: false, authType: "api_key",
    fields: [
      { key: "apiKey", label: "API Key do Imovelweb", type: "password" },
      { key: "anunciante", label: "ID do anunciante", type: "text" },
    ],
  },
  {
    id: "chavesnamao", name: "Chaves na Mão", category: "Portal", letter: "C",
    description: "Sincronize anúncios e leads do portal Chaves na Mão.",
    connected: false, authType: "webhook",
    fields: [
      { key: "webhook", label: "Webhook Chaves na Mão", type: "url" },
    ],
  },
  {
    id: "quintoandar", name: "QuintoAndar", category: "Portal", letter: "Q",
    description: "Receba propostas e visitas do QuintoAndar.",
    connected: false, authType: "credentials",
    fields: [
      { key: "email", label: "E-mail da conta", type: "email" },
      { key: "token", label: "Token de parceiro", type: "password" },
    ],
  },

  // ===== Comunicação =====
  {
    id: "wpp", name: "WhatsApp Business API", category: "Comunicação", letter: "W",
    description: "API oficial para mensagens automáticas e atendimento.",
    connected: true, leads: 218, authType: "credentials",
    highlights: ["Mensagens em massa", "Templates aprovados", "Multi-atendente"],
    fields: [
      { key: "phone_id", label: "Phone Number ID", type: "text", placeholder: "1234567890" },
      { key: "waba_id", label: "WhatsApp Business Account ID", type: "text" },
      { key: "token", label: "Access Token permanente", type: "password" },
    ],
  },
  {
    id: "wpp-web", name: "WhatsApp Web (Extensão)", category: "Comunicação", letter: "Wz",
    description: "Conecte via extensão Chrome — sem custos da API oficial.",
    connected: false, authType: "embed",
    fields: [],
    highlights: ["Grátis", "Instalação em 1 minuto", "QR Code"],
  },
  {
    id: "smtp", name: "E-mail (SMTP)", category: "Comunicação", letter: "@",
    description: "Configure seu servidor SMTP para envio de e-mails.",
    connected: false, authType: "credentials",
    fields: [
      { key: "host", label: "Host SMTP", type: "text", placeholder: "smtp.gmail.com" },
      { key: "port", label: "Porta", type: "text", placeholder: "587" },
      { key: "user", label: "Usuário", type: "email" },
      { key: "pass", label: "Senha / App Password", type: "password" },
    ],
  },
  {
    id: "telegram", name: "Telegram Bot", category: "Comunicação", letter: "T",
    description: "Notificações de novos leads direto no seu Telegram.",
    connected: false, authType: "api_key",
    fields: [
      { key: "token", label: "Bot Token (BotFather)", type: "password" },
      { key: "chat_id", label: "Chat ID", type: "text" },
    ],
  },

  // ===== Marketing =====
  {
    id: "instagram", name: "Instagram Leads", category: "Marketing", letter: "Ig",
    description: "Capture leads diretamente de anúncios e direct do Instagram.",
    connected: false, authType: "oauth",
    fields: [],
    highlights: ["Login com Instagram", "Lead Ads", "DM automático"],
  },
  {
    id: "meta", name: "Meta Ads (Facebook + Instagram)", category: "Marketing", letter: "M",
    description: "Conecte campanhas e formulários de Lead Ads da Meta.",
    connected: false, authType: "oauth",
    fields: [],
    highlights: ["Lead Ads em tempo real", "ROI por campanha"],
  },
  {
    id: "google-ads", name: "Google Ads", category: "Marketing", letter: "Ga",
    description: "Importe leads de campanhas do Google Ads.",
    connected: false, authType: "oauth",
    fields: [],
  },
  {
    id: "tiktok", name: "TikTok Leads", category: "Marketing", letter: "Tk",
    description: "Receba leads de Lead Ads do TikTok For Business.",
    connected: false, authType: "oauth",
    fields: [],
  },

  // ===== Agenda =====
  {
    id: "google", name: "Google Calendar", category: "Agenda", letter: "G",
    description: "Sincronize agenda de visitas com o Google Calendar.",
    connected: true, authType: "oauth",
    highlights: ["Sincronização bidirecional", "Convites automáticos"],
    fields: [],
  },
  {
    id: "outlook", name: "Outlook Calendar", category: "Agenda", letter: "Ou",
    description: "Sincronize compromissos com o calendário do Outlook.",
    connected: false, authType: "oauth",
    fields: [],
  },
  {
    id: "apple-cal", name: "Apple Calendar (iCloud)", category: "Agenda", letter: "A",
    description: "Receba seus compromissos no iPhone via iCloud.",
    connected: false, authType: "credentials",
    fields: [
      { key: "email", label: "Apple ID", type: "email" },
      { key: "pass", label: "Senha específica do app", type: "password" },
    ],
  },

  // ===== CRM =====
  {
    id: "rd", name: "RD Station", category: "CRM", letter: "R",
    description: "Importe contatos qualificados da RD Station.",
    connected: false, authType: "oauth",
    fields: [],
  },
  {
    id: "pipedrive", name: "Pipedrive", category: "CRM", letter: "P",
    description: "Sincronize negociações com seu Pipedrive.",
    connected: false, authType: "api_key",
    fields: [
      { key: "token", label: "API Token do Pipedrive", type: "password" },
      { key: "domain", label: "Subdomínio (ex: minhaempresa)", type: "text" },
    ],
  },
  {
    id: "hubspot", name: "HubSpot", category: "CRM", letter: "Hs",
    description: "Sincronize contatos, negócios e atividades com o HubSpot.",
    connected: false, authType: "oauth",
    fields: [],
  },

  // ===== Pagamento =====
  {
    id: "stripe", name: "Stripe", category: "Pagamento", letter: "S",
    description: "Cobre comissões e sinais via cartão e Pix internacional.",
    connected: false, authType: "api_key",
    fields: [
      { key: "pk", label: "Publishable Key", type: "text", placeholder: "pk_live_..." },
      { key: "sk", label: "Secret Key", type: "password", placeholder: "sk_live_..." },
    ],
  },
  {
    id: "asaas", name: "Asaas", category: "Pagamento", letter: "As",
    description: "Boletos, Pix e cartão para receber sinais de venda.",
    connected: false, authType: "api_key",
    fields: [
      { key: "token", label: "API Key Asaas", type: "password" },
    ],
  },
  {
    id: "mercadopago", name: "Mercado Pago", category: "Pagamento", letter: "Mp",
    description: "Receba pagamentos e sinais via Mercado Pago.",
    connected: false, authType: "oauth",
    fields: [],
  },

  // ===== Automação =====
  {
    id: "zapier", name: "Zapier", category: "Automação", letter: "Zp",
    description: "Conecte o Leadlink a 6 mil+ apps via Zapier.",
    connected: false, authType: "webhook",
    fields: [
      { key: "webhook", label: "Webhook URL do Zap", type: "url", placeholder: "https://hooks.zapier.com/hooks/catch/..." },
    ],
  },
  {
    id: "make", name: "Make (Integromat)", category: "Automação", letter: "Mk",
    description: "Crie cenários no Make a partir de eventos do Leadlink.",
    connected: false, authType: "webhook",
    fields: [
      { key: "webhook", label: "Webhook URL Make", type: "url" },
    ],
  },
  {
    id: "n8n", name: "n8n", category: "Automação", letter: "n8",
    description: "Automações self-hosted via webhooks do n8n.",
    connected: false, authType: "webhook",
    fields: [
      { key: "webhook", label: "Webhook n8n", type: "url" },
    ],
  },
];

