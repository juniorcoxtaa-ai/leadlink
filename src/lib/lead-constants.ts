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
