export const broker = {
  name: "Rafael Mendes",
  initials: "RM",
  plan: "Pro",
};

export type LeadStatus = "Interessado" | "Em contato" | "Novo" | "Sem resposta" | "Fechado";
export type Temp = "Quente" | "Morno" | "Frio";

export const tempMeta: Record<Temp, { emoji: string; color: string; bg: string }> = {
  Quente: { emoji: "🔥", color: "#E17055", bg: "rgba(225,112,85,0.12)" },
  Morno: { emoji: "🌡️", color: "#FDCB6E", bg: "rgba(253,203,110,0.12)" },
  Frio: { emoji: "🧊", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
};

export const statusMeta: Record<LeadStatus, { color: string; bg: string }> = {
  Interessado: { color: "#00B894", bg: "rgba(0,184,148,0.12)" },
  "Em contato": { color: "#6C5CE7", bg: "rgba(108,92,231,0.15)" },
  Novo: { color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  "Sem resposta": { color: "#FDCB6E", bg: "rgba(253,203,110,0.12)" },
  Fechado: { color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
};

export const currentLead = {
  name: "Ana Paula Ferreira",
  phone: "(21) 98765-4321",
  status: "Interessado" as LeadStatus,
  temp: "Quente" as Temp,
  score: 82,
  source: "Site LeadLink",
  interest: "Compra",
  budget: "R$ 650.000",
  urgency: "Imediato",
  aiSummary:
    "Lead com alta intenção de compra. Busca apartamento 3 quartos no Leblon ou Ipanema. Orçamento flexível até R$700k. Demonstrou urgência — já visitou 2 imóveis com outros corretores.",
  nextStep: "Enviar 3 opções de apartamentos no Leblon até R$700k",
  formAnswers: [
    { q: "Qual tipo de imóvel procura?", a: "Apartamento 3 quartos" },
    { q: "Bairros de interesse?", a: "Leblon, Ipanema" },
    { q: "Faixa de orçamento?", a: "Até R$ 700.000" },
    { q: "Prazo para mudança?", a: "Próximos 60 dias" },
  ],
  history: [
    { type: "Formulário", text: "Preencheu formulário no site", date: "há 4 dias", color: "#6C5CE7" },
    { type: "Mensagem", text: "Enviou: 'Tem 3 quartos disponível?'", date: "há 3 dias", color: "#00B894" },
    { type: "Resposta", text: "Você respondeu: 'Sim! Posso te mandar opções'", date: "há 2 dias", color: "#FDCB6E" },
  ],
  followUp: "Sem resposta há 2 dias",
};

export const leads = [
  { id: "1", name: "Ana Paula Ferreira", phone: "(21) 98765-4321", status: "Interessado", temp: "Quente", source: "Site", daysAgo: 2 },
  { id: "2", name: "Carlos Souza", phone: "(21) 99876-1122", status: "Sem resposta", temp: "Quente", source: "Instagram", daysAgo: 5 },
  { id: "3", name: "Mariana Lima", phone: "(21) 98123-4455", status: "Em contato", temp: "Morno", source: "WhatsApp", daysAgo: 1 },
  { id: "4", name: "João Santos", phone: "(21) 97766-8899", status: "Novo", temp: "Morno", source: "Site", daysAgo: 0 },
  { id: "5", name: "Fernanda Costa", phone: "(21) 96655-3322", status: "Sem resposta", temp: "Frio", source: "Indicação", daysAgo: 18 },
  { id: "6", name: "Pedro Almeida", phone: "(21) 98899-2211", status: "Em contato", temp: "Quente", source: "Site", daysAgo: 3 },
] as const;

export const properties = [
  {
    id: "1",
    title: "Apartamento Vista Mar",
    neighborhood: "Leblon",
    city: "Rio de Janeiro",
    price: "R$ 680.000",
    rooms: 3,
    area: 98,
    parking: 2,
    status: "Disponível",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
  },
  {
    id: "2",
    title: "Cobertura Duplex",
    neighborhood: "Ipanema",
    city: "Rio de Janeiro",
    price: "R$ 1.200.000",
    rooms: 4,
    area: 180,
    parking: 3,
    status: "Disponível",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  },
  {
    id: "3",
    title: "Flat Moderno",
    neighborhood: "Barra da Tijuca",
    city: "Rio de Janeiro",
    price: "R$ 420.000",
    rooms: 1,
    area: 45,
    parking: 1,
    status: "Disponível",
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80",
  },
  {
    id: "4",
    title: "Casa em Condomínio",
    neighborhood: "Recreio",
    city: "Rio de Janeiro",
    price: "R$ 890.000",
    rooms: 4,
    area: 220,
    parking: 4,
    status: "Disponível",
    image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
  },
];

export const followUps = {
  Urgente: [
    {
      name: "Carlos Souza",
      temp: "Quente" as Temp,
      reason: "Sem resposta há 5 dias",
      context: "Pediu informações sobre apartamentos no Leblon",
      suggestion:
        "Oi Carlos! Voltei aqui porque achei opções no Leblon que combinam com o que você buscava...",
    },
    {
      name: "Mariana Lima",
      temp: "Morno" as Temp,
      reason: "Pediu retorno ontem às 14h",
      context: "Aguardando proposta de financiamento",
      suggestion:
        "Mariana, conforme combinamos, aqui está o resumo das condições de financiamento...",
    },
  ],
  Oportunidade: [
    {
      name: "João Santos",
      temp: "Morno" as Temp,
      reason: "Perguntou sobre financiamento",
      context: "Demonstrou interesse no apartamento da Barra",
      suggestion:
        "João, tenho excelente notícia sobre o financiamento — consegui simular condições...",
    },
  ],
  Reativação: [
    {
      name: "Fernanda Costa",
      temp: "Frio" as Temp,
      reason: "Último contato há 18 dias",
      context: "Buscava casa no Recreio até R$ 900k",
      suggestion:
        "Fernanda, faz um tempo que não conversamos! Surgiu uma casa nova no Recreio que...",
    },
  ],
  "Pós-visita": [],
} as const;

export const appointments = [
  {
    type: "Visita",
    icon: "home",
    title: "Apartamento Leblon",
    when: "Amanhã 10:00",
    lead: "Ana Paula Ferreira",
    status: "Confirmado",
    color: "#00B894",
  },
  {
    type: "Ligação",
    icon: "phone",
    title: "Retorno proposta",
    when: "Hoje 16:00",
    lead: "Carlos Souza",
    status: "Agendado",
    color: "#6C5CE7",
  },
  {
    type: "Reunião",
    icon: "users",
    title: "Apresentação portfólio",
    when: "Quinta 14:30",
    lead: "Mariana Lima",
    status: "Agendado",
    color: "#FDCB6E",
  },
];

export const aiAnalysis = {
  summary:
    "Conversa com alta probabilidade de conversão. Lead demonstra urgência real e budget adequado. Principais objeções: prazo de entrega e taxa de condomínio.",
  metrics: [
    { label: "Intenção", value: "Compra de apto 3q" },
    { label: "Interesse", value: "Alto 🔥", accent: "#00B894" },
    { label: "Objeções", value: "Condomínio caro" },
    { label: "Próx. passo", value: "Enviar 2 opções" },
  ],
  suggestions: [
    "Oi Ana! Separei duas opções com o perfil que você mencionou. Ambas têm condomínio abaixo de R$1.200 e ficam no Leblon. Posso te mandar os detalhes?",
    "Ana, encontrei um apartamento perfeito pra você — 3 quartos, 97m², ótima localização no Leblon e condomínio acessível. Tenho disponível hoje para visita se quiser!",
    "Bom dia Ana! Tive uma ideia — tem um apartamento que acabou de abrir negociação no Ipanema que pode te interessar muito. Posso te mandar um resumo rápido?",
  ],
};

export const quickReplies = [
  "Está disponível para visita?",
  "Qual o valor máximo do orçamento?",
  "Aceita proposta abaixo do valor?",
  "Posso agendar uma visita?",
  "Tenho um imóvel similar que pode te interessar",
  "Posso te ligar agora?",
  "Qual bairro você prefere?",
  "Já visitou outros imóveis?",
];
