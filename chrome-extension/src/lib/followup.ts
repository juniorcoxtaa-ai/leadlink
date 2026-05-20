import type { Lead } from "@/lib/api";
import { leadDisplayDate } from "@/lib/messages";

export type FollowUpCategory = "Urgente" | "Sem resposta" | "Oportunidade" | "Reativacao";

export type FollowUpItem = {
  lead: Lead;
  category: FollowUpCategory;
  reason: string;
  message: string;
  dateLabel: string;
  dateValue: string;
};

export function daysSince(date: string | null | undefined) {
  if (!date) return null;
  const value = new Date(date).getTime();
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor((Date.now() - value) / 86_400_000));
}

export function followUpMessage(category: FollowUpCategory, lead: Pick<Lead, "name">) {
  const firstName = String(lead.name || "").trim().split(/\s+/)[0] || "tudo bem";
  if (category === "Urgente") {
    return `Oi, ${firstName}! Passando para retomar seu atendimento. Ainda faz sentido eu te enviar algumas opcoes dentro do perfil que voce buscou?`;
  }
  if (category === "Sem resposta") {
    return `Oi, ${firstName}! Vi que voce demonstrou interesse e queria entender melhor o que procura para te mandar opcoes mais certeiras.`;
  }
  if (category === "Oportunidade") {
    return `Oi, ${firstName}! Separei algumas opcoes que podem encaixar bem no que voce procura. Quer que eu te envie?`;
  }
  return `Oi, ${firstName}! Faz um tempo que conversamos. Voce ainda esta buscando imovel ou ja encontrou uma opcao?`;
}

export function followUpForLead(lead: Lead, temp: "Quente" | "Morno" | "Frio"): FollowUpItem | null {
  const createdDays = daysSince(lead.createdAt);
  const lastContactDays = daysSince(lead.lastContact);
  const dateMeta = leadDisplayDate(lead);

  if (temp === "Quente" && lastContactDays !== null && lastContactDays >= 3) {
    return {
      lead,
      category: "Urgente",
      reason: `Lead quente sem contato ha ${lastContactDays} dias.`,
      message: followUpMessage("Urgente", lead),
      dateLabel: dateMeta.label,
      dateValue: dateMeta.date,
    };
  }

  if (!lead.lastContact) {
    return {
      lead,
      category: "Sem resposta",
      reason: "Lead ainda sem registro de ultimo contato.",
      message: followUpMessage("Sem resposta", lead),
      dateLabel: dateMeta.label,
      dateValue: dateMeta.date,
    };
  }

  if ((temp === "Morno" || temp === "Quente") && createdDays !== null && createdDays <= 7) {
    return {
      lead,
      category: "Oportunidade",
      reason: `Lead ${temp.toLowerCase()} criado nos ultimos ${createdDays} dias.`,
      message: followUpMessage("Oportunidade", lead),
      dateLabel: dateMeta.label,
      dateValue: dateMeta.date,
    };
  }

  if (lastContactDays !== null && lastContactDays >= 15) {
    return {
      lead,
      category: "Reativacao",
      reason: `Lead parado ha ${lastContactDays} dias.`,
      message: followUpMessage("Reativacao", lead),
      dateLabel: dateMeta.label,
      dateValue: dateMeta.date,
    };
  }

  return null;
}

export function compareFollowUpPriority(a: FollowUpItem, b: FollowUpItem) {
  const priority: Record<FollowUpCategory, number> = {
    Urgente: 0,
    "Sem resposta": 1,
    Oportunidade: 2,
    Reativacao: 3,
  };
  return priority[a.category] - priority[b.category];
}
