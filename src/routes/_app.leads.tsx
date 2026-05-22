import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Filter,
  Phone,
  MessageCircle,
  MapPin,
  Lock,
  Link2,
  Flame,
  ThermometerSun,
  Snowflake,
  X,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/EmptyState";
import { KANBAN_COLUMNS, STATUS_LABEL } from "@/lib/lead-constants";
import { scoreColor, statusBadgeClass } from "@/lib/status";
import { createLead, getLeads, updateLeadStatus } from "@/server-fns/leads";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/UpgradeCTA";
import { toast } from "sonner";
import { buildLeadWhatsappUrl } from "@/lib/lead-whatsapp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LeadRow = Awaited<ReturnType<typeof getLeads>>[number] & {
  isBlocked?: unknown;
};
type BlockedLeadRow = LeadRow;
type LeadStatus = (typeof KANBAN_COLUMNS)[number];

const ANSWER_LABELS: Record<string, string> = {
  "q-name": "Nome",
  "q-phone": "Telefone",
  "q-intent": "O que você está buscando?",
  "q-city": "Cidade ou bairro",
  "q-property-type": "Tipo de imóvel",
  "q-bedrooms": "Quartos",
  "q-loc-rent": "Valor mensal aproximado",
  "q-rent-budget": "Valor mensal aproximado",
  "q-loc-timeline": "Quando pretende se mudar?",
  "q-move-time": "Quando pretende se mudar?",
  "q-loc-pets": "Possui pets?",
  "q-pets": "Possui pets?",
  "q-loc-neighborhood": "Região de preferência",
  "q-observation": "Observação",
  "q-buy-type": "Tipo de imóvel para compra",
  "q-buy-bedrooms": "Quartos",
  "q-buy-budget": "Valor máximo de compra",
  "q-buy-finance": "Pretende financiar?",
  "q-financing": "Pretende financiar?",
  "q-credit": "Crédito aprovado ou simulação?",
  "q-buy-timeline": "Prazo para compra",
  "q-buy-neighborhood": "Região de preferência",
  "q-invest-region": "Cidade ou região de interesse",
  "q-invest-type": "Tipo de oportunidade",
  "q-invest-capital": "Capital disponível",
  "q-invest-goal": "Objetivo principal",
  "q-invest-horizon": "Horizonte de investimento",
  "q-invest-outside": "Aceita oportunidades fora da região?",
  "q-interest": "Interesse",
  "q-budget": "Orçamento",
  "q-region": "Cidade/região",
  "q-timeline-buy": "Prazo",
};

function openLeadWhatsapp(lead: Pick<LeadRow, "name" | "phone">) {
  const url = buildLeadWhatsappUrl(lead);
  if (!url) {
    toast.error("Telefone do lead inválido. Atualize o contato antes de chamar no WhatsApp.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export const Route = createFileRoute("/_app/leads")({
  head: () => ({ meta: [{ title: "Leads — Leadlink" }] }),
  loader: () => getLeads(),
  component: LeadsPage,
});

function LeadsPage() {
  const isDetail = useRouterState({
    select: (s) => s.location.pathname !== "/leads" && s.location.pathname.startsWith("/leads/"),
  });
  const allLeads = Route.useLoaderData() as LeadRow[];
  const [leads, setLeads] = useState<LeadRow[]>(allLeads);
  const plan = usePlanLimits();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [sourceF, setSourceF] = useState<string>("all");
  const [brokerF, setBrokerF] = useState<string>("all");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [manualLeadOpen, setManualLeadOpen] = useState(false);
  const [savingManualLead, setSavingManualLead] = useState(false);
  const [manualLead, setManualLead] = useState({
    name: "",
    phone: "",
    source: "Manual",
    interest: "",
    region: "",
    notes: "",
  });

  useEffect(() => {
    setLeads(allLeads);
  }, [allLeads]);

  const uniqueBrokers = useMemo(() => {
    const seen = new Map<string, string>();
    leads.forEach((l) => {
      if (l.brokerId && l.brokerName) seen.set(l.brokerId, l.brokerName);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [leads]);

  const leadCards = useMemo(() => {
    return leads.map((lead) => ({
      ...lead,
      isBlocked: Boolean(lead.isBlocked),
    }));
  }, [leads]);

  const filtered = useMemo(() => {
    return leadCards.filter((l) => {
      if (
        search &&
        !String(l.name || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      if (sourceF !== "all" && l.source !== sourceF) return false;
      if (brokerF !== "all" && l.brokerId !== brokerF) return false;
      return true;
    });
  }, [leadCards, search, sourceF, brokerF]);

  const handleLeadClick = useCallback(
    (lead: LeadRow) => {
      const isLeadBlocked = Boolean(lead.isBlocked);
      if (isLeadBlocked && plan.isFree) {
        setUpgradeOpen(true);
        return;
      }
      setSelectedLead(lead);
    },
    [plan.isFree],
  );

  const handleLeadStatusChange = useCallback(
    async (leadId: string, nextStatus: LeadStatus) => {
      const previousLead = leads.find((lead) => lead.id === leadId);
      if (!previousLead || previousLead.status === nextStatus) return;

      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead)),
      );
      setSelectedLead((current: LeadRow | null) =>
        current?.id === leadId ? { ...current, status: nextStatus } : current,
      );

      try {
        await updateLeadStatus({
          data: {
            id: leadId,
            status: nextStatus,
          },
        });
      } catch (error) {
        setLeads((current) =>
          current.map((lead) =>
            lead.id === leadId ? { ...lead, status: previousLead.status } : lead,
          ),
        );
        setSelectedLead((current: LeadRow | null) =>
          current?.id === leadId ? { ...current, status: previousLead.status } : current,
        );
        toast.error(
          error instanceof Error ? error.message : "Não foi possível atualizar o status do lead.",
        );
      }
    },
    [leads],
  );

  if (isDetail) return <Outlet />;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {plan.hasBlockedLeads && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Você tem leads esperando por atendimento</div>
              <div className="text-sm text-muted-foreground">
                Seu plano Free exibe até 15 leads. Faça upgrade para visualizar todos os contatos
                capturados.
              </div>
            </div>
            <Button onClick={() => setUpgradeOpen(true)}>Ver planos</Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="pl-9 w-[260px]"
          />
        </div>
        <select
          value={sourceF}
          onChange={(e) => setSourceF(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">Todas as origens</option>
          {["Site", "ZAP", "OLX", "Viva Real", "Indicação", "Instagram"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={brokerF}
          onChange={(e) => setBrokerF(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">Todos os corretores</option>
          {uniqueBrokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="h-4 w-4 mr-1" /> Filtros
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex p-1 rounded-lg bg-secondary border border-border">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 h-7 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 h-7 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${view === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> Tabela
            </button>
          </div>
          <Button
            className="bg-gold text-navy hover:bg-gold/90 font-semibold"
            onClick={() => setManualLeadOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Novo Lead
          </Button>
        </div>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-5 w-5" />}
          title="Nenhum lead capturado ainda"
          description="Compartilhe seu Meu Link para começar a receber leads."
          action={
            <Button asChild>
              <Link to="/meu-link">Compartilhar Meu Link</Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Nenhum lead encontrado"
          description="Ajuste a busca ou remova filtros para visualizar outros leads."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setSourceF("all");
                setBrokerF("all");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : view === "kanban" ? (
        <KanbanView
          leads={filtered}
          onLeadClick={handleLeadClick}
          onLeadStatusChange={handleLeadStatusChange}
        />
      ) : (
        <TableView leads={filtered} onLeadClick={handleLeadClick} />
      )}

      <LeadDetailDrawer
        lead={selectedLead}
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null);
        }}
      />

      <Dialog open={manualLeadOpen} onOpenChange={setManualLeadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
            <DialogDescription>Adicione um lead manualmente ao CRM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={manualLead.name}
              onChange={(event) =>
                setManualLead((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Nome do lead"
            />
            <Input
              value={manualLead.phone}
              onChange={(event) =>
                setManualLead((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="Telefone"
            />
            <Input
              value={manualLead.source}
              onChange={(event) =>
                setManualLead((current) => ({ ...current, source: event.target.value }))
              }
              placeholder="Origem"
            />
            <Input
              value={manualLead.interest}
              onChange={(event) =>
                setManualLead((current) => ({ ...current, interest: event.target.value }))
              }
              placeholder="Interesse"
            />
            <Input
              value={manualLead.region}
              onChange={(event) =>
                setManualLead((current) => ({ ...current, region: event.target.value }))
              }
              placeholder="Cidade ou bairro"
            />
            <Input
              value={manualLead.notes}
              onChange={(event) =>
                setManualLead((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Observações"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualLeadOpen(false)}
              disabled={savingManualLead}
            >
              Cancelar
            </Button>
            <Button
              disabled={savingManualLead}
              onClick={async () => {
                if (!manualLead.name.trim()) {
                  toast.error("Informe o nome do lead.");
                  return;
                }
                if (!manualLead.phone.trim()) {
                  toast.error("Informe o telefone do lead.");
                  return;
                }
                setSavingManualLead(true);
                try {
                  const created = (await createLead({
                    data: {
                      name: manualLead.name.trim(),
                      phone: manualLead.phone.trim(),
                      source: manualLead.source.trim() || "Manual",
                      interest: manualLead.interest.trim(),
                      region: manualLead.region.trim(),
                      notes: manualLead.notes.trim(),
                    },
                  })) as LeadRow;
                  setLeads((current) => [created, ...current]);
                  setManualLead({
                    name: "",
                    phone: "",
                    source: "Manual",
                    interest: "",
                    region: "",
                    notes: "",
                  });
                  setManualLeadOpen(false);
                  toast.success("Lead criado com sucesso");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Falha ao criar lead");
                } finally {
                  setSavingManualLead(false);
                }
              }}
            >
              {savingManualLead ? "Salvando..." : "Salvar lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Desbloqueie todos os seus leads"
        description="Seus novos leads continuam sendo capturados com segurança. No plano Pro, você visualiza todos os contatos, respostas do quiz, score e próximo passo recomendado."
        benefits={[
          "Leads ilimitados",
          "Respostas completas do quiz",
          "Score e classificação comercial",
          "Próximo passo recomendado",
          "Histórico organizado no CRM",
        ]}
        primaryLabel="Fazer upgrade para Pro"
        secondaryLabel="Continuar no Free"
        onPrimary={() => setUpgradeOpen(false)}
      />
    </div>
  );
}

function KanbanView({
  leads,
  onLeadClick,
  onLeadStatusChange,
}: {
  leads: LeadRow[];
  onLeadClick: (lead: LeadRow) => void;
  onLeadStatusChange: (leadId: string, nextStatus: LeadStatus) => Promise<void>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const leadId = String(active.id);
      const nextStatus = String(over.id) as LeadStatus;
      if (!KANBAN_COLUMNS.includes(nextStatus)) return;

      void onLeadStatusChange(leadId, nextStatus);
    },
    [onLeadStatusChange],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
      <div className="kanban-scroll flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {KANBAN_COLUMNS.map((status) => {
          const items = leads.filter((l) => l.status === status);
          return (
            <KanbanColumn key={status} status={status} items={items} onLeadClick={onLeadClick} />
          );
        })}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  items,
  onLeadClick,
}: {
  status: LeadStatus;
  items: LeadRow[];
  onLeadClick: (lead: LeadRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div className="w-[300px] shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{STATUS_LABEL[status]}</span>
          <Badge variant="secondary" className="font-mono text-[10px] px-1.5">
            {items.length}
          </Badge>
        </div>
        <button className="text-muted-foreground hover:text-foreground text-lg leading-none">
          +
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2.5 rounded-xl transition-colors ${isOver ? "bg-secondary/40" : ""}`}
      >
        {items.map((l) => {
          const isLeadBlocked = Boolean(l.isBlocked);
          return isLeadBlocked ? (
            <BlockedLeadCard key={l.id} lead={l} onClick={() => onLeadClick(l)} />
          ) : (
            <DraggableLeadCard key={l.id} lead={l} onClick={() => onLeadClick(l)} />
          );
        })}
        {items.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableLeadCard({ lead, onClick }: { lead: LeadRow; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-10 opacity-70" : undefined}
      {...listeners}
      {...attributes}
    >
      <LeadCard lead={lead} onClick={onClick} />
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: LeadRow; onClick: () => void }) {
  const initials =
    lead.brokerInitials ||
    lead.brokerName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2) ||
    "?";
  const ClassificationIcon = classificationIcon(lead.classification);
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <Card className="p-3.5 border-border hover:shadow-lift hover:-translate-y-px transition-all border-l-2 border-l-transparent hover:border-l-gold cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-medium text-sm leading-tight">{lead.name}</div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={`gap-1 text-[10px] font-medium px-1.5 ${classificationBadgeClass(lead.classification)}`}
            >
              <ClassificationIcon className="h-3 w-3" /> {formatClassification(lead.classification)}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono px-1.5 ${scoreColor(lead.score)}`}
            >
              {lead.score}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2.5">
          <Badge variant="outline" className="text-[10px] font-normal">
            {formatIntent(lead.intentType)}
          </Badge>
          <span className="text-xs text-muted-foreground line-clamp-1">
            {lead.nextStep || lead.interest || "Próximo passo não informado"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{lead.region}</span>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] font-normal">
            {lead.source}
          </Badge>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openLeadWhatsapp(lead);
              }}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-emerald/25 bg-emerald/10 px-2 text-[10px] font-medium text-emerald hover:bg-emerald/15"
            >
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </button>
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-navy text-navy-foreground text-[9px]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </Card>
    </button>
  );
}

function BlockedLeadCard({ lead, onClick }: { lead: BlockedLeadRow; onClick: () => void }) {
  return (
    <Card
      className="p-3.5 border-border bg-secondary/40 opacity-75 cursor-pointer hover:opacity-100 transition"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <div className="font-medium text-sm">Lead bloqueado</div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Pro
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {lead.source && (
          <Badge variant="outline" className="text-[10px]">
            {lead.source}
          </Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Você capturou este lead, mas precisa do plano Pro para visualizar os dados.
      </div>
      <Button
        className="mt-3 w-full"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        Desbloquear leads no Pro
      </Button>
    </Card>
  );
}

function TableView({
  leads,
  onLeadClick,
}: {
  leads: LeadRow[];
  onLeadClick: (lead: LeadRow) => void;
}) {
  return (
    <Card className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Nome
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Interesse
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Status
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Score
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Origem
              </th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Telefone
              </th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((l) =>
              l.isBlocked ? (
                <tr
                  key={l.id}
                  className="hover:bg-secondary/30 cursor-pointer opacity-60"
                  onClick={() => onLeadClick(l)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Lead bloqueado</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      Pro
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {l.source || "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                </tr>
              ) : (
                <tr
                  key={l.id}
                  className="hover:bg-secondary/30 cursor-pointer"
                  onClick={() => onLeadClick(l)}
                >
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                    {l.interest}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusBadgeClass(l.status)}>
                      {STATUS_LABEL[l.status as keyof typeof STATUS_LABEL] || l.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] ${scoreColor(l.score)}`}
                    >
                      {l.score}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {l.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{l.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        openLeadWhatsapp(l);
                      }}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                    </Button>
                  </td>
                </tr>
              ),
            )}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Nenhum lead encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile list */}
      <div className="md:hidden divide-y divide-border">
        {leads.map((l) =>
          l.isBlocked ? (
            <BlockedLeadMobile key={l.id} lead={l} onClick={() => onLeadClick(l)} />
          ) : (
            <LeadCardMobile key={l.id} lead={l} onClick={() => onLeadClick(l)} />
          ),
        )}
      </div>
    </Card>
  );
}

function LeadCardMobile({ lead, onClick }: { lead: LeadRow; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full p-4 text-left hover:bg-secondary/40"
    >
      <div className="flex items-start justify-between mb-1">
        <div className="font-medium">{lead.name}</div>
        <Badge variant="outline" className={`text-[10px] ${scoreColor(lead.score)}`}>
          {lead.score}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground mb-2">{lead.interest}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={statusBadgeClass(lead.status)}>
          {STATUS_LABEL[lead.status as keyof typeof STATUS_LABEL] || lead.status}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {lead.source}
        </Badge>
        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 ml-auto">
          <Phone className="h-3 w-3" /> {lead.phone}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 h-8 rounded-full text-xs"
        onClick={(event) => {
          event.stopPropagation();
          openLeadWhatsapp(lead);
        }}
      >
        <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
      </Button>
    </button>
  );
}

function BlockedLeadMobile({ lead, onClick }: { lead: BlockedLeadRow; onClick: () => void }) {
  return (
    <button className="block w-full text-left p-4 hover:bg-secondary/40" onClick={onClick}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <div className="font-medium">Lead bloqueado</div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Pro
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
      </div>
      <div className="text-xs text-muted-foreground">
        Você capturou este lead, mas precisa do plano Pro para visualizar os dados.
      </div>
    </button>
  );
}

function LeadDetailDrawer({
  lead,
  open,
  onOpenChange,
}: {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        {lead && (
          <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden">
            <DrawerHeader className="border-b border-border px-5 pb-4 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <DrawerTitle className="truncate text-xl">
                    {formatLeadValue(lead.name)}
                  </DrawerTitle>
                  <DrawerDescription className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{formatLeadValue(lead.phone)}</span>
                    <span>{formatLeadValue(lead.region)}</span>
                    <span>{formatLeadValue(lead.source)}</span>
                  </DrawerDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => openLeadWhatsapp(lead)}
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  aria-label="Fechar detalhe do lead"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>

            <div className="overflow-y-auto px-5 py-5">
              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge className={statusBadgeClass(lead.status)}>
                      {STATUS_LABEL[lead.status as keyof typeof STATUS_LABEL] ||
                        lead.status ||
                        "Status não informado"}
                    </Badge>
                    <Badge variant="outline" className={`font-mono ${scoreColor(lead.score)}`}>
                      Score {formatLeadValue(lead.score)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={classificationBadgeClass(lead.classification)}
                    >
                      {formatClassification(lead.classification)}
                    </Badge>
                    <Badge variant="outline">{formatIntent(lead.intentType)}</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField label="Nome" value={lead.name} />
                    <DetailField label="Telefone" value={lead.phone} />
                    <DetailField label="Cidade" value={lead.region} />
                    <DetailField label="Origem" value={lead.source} />
                    <DetailField
                      label="Status"
                      value={STATUS_LABEL[lead.status as keyof typeof STATUS_LABEL] || lead.status}
                    />
                    <DetailField label="Intenção" value={formatIntent(lead.intentType)} />
                    <DetailField
                      label="Classificação"
                      value={formatClassification(lead.classification)}
                    />
                    <DetailField label="Score" value={lead.score} />
                    <DetailField
                      label="Próximo passo"
                      value={lead.nextStep}
                      className="sm:col-span-2"
                    />
                    <DetailField
                      label="Resumo do perfil"
                      value={lead.profileSummary}
                      className="sm:col-span-2"
                    />
                    <DetailField
                      label="Data de criação"
                      value={formatDateTime(lead.createdAt)}
                      className="sm:col-span-2"
                    />
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="mb-4 text-sm font-semibold">Respostas do quiz</div>
                  {getQuizEntries(lead).length > 0 ? (
                    <div className="space-y-3">
                      {getQuizEntries(lead).map(([key, value]) => (
                        <DetailField
                          key={key}
                          label={ANSWER_LABELS[key] || humanizeAnswerKey(key)}
                          value={formatAnswerValue(value)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma resposta de quiz disponível.
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function DetailField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5 whitespace-pre-wrap">{formatLeadValue(value)}</div>
    </div>
  );
}

function classificationBadgeClass(classification?: string | null) {
  const value = (classification || "frio").toLowerCase();
  if (value === "quente") return "border bg-success/15 text-success border-success/30";
  if (value === "morno") return "border bg-warning/15 text-warning border-warning/30";
  return "border bg-destructive/10 text-destructive border-destructive/30";
}

function classificationIcon(classification?: string | null) {
  const value = (classification || "frio").toLowerCase();
  if (value === "quente") return Flame;
  if (value === "morno") return ThermometerSun;
  return Snowflake;
}

function formatClassification(classification?: string | null) {
  const value = (classification || "frio").toLowerCase();
  if (value === "quente") return "Quente";
  if (value === "morno") return "Morno";
  return "Frio";
}

function formatIntent(intent?: string | null) {
  if (intent === "compra") return "Compra";
  if (intent === "locacao") return "Locação";
  if (intent === "investimento") return "Investimento";
  return "Intenção não informada";
}

function formatDateTime(value: unknown) {
  if (!value) return "Não informado";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Não informado";
  return date.toLocaleString("pt-BR");
}

function formatLeadValue(value: unknown) {
  if (value == null || value === "") return "Não informado";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value))
    return value.map(formatAnswerValue).filter(Boolean).join(", ") || "Não informado";
  if (typeof value === "object") return formatAnswerValue(value);
  return String(value);
}

function formatAnswerValue(value: unknown): string {
  if (value == null || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value))
    return value
      .map(formatAnswerValue)
      .filter((item) => item !== "Não informado")
      .join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue != null && String(entryValue).trim() !== "")
      .map(([key, entryValue]) => `${humanizeAnswerKey(key)}: ${formatAnswerValue(entryValue)}`)
      .join("\n");
  }
  return String(value);
}

function getQuizEntries(lead: LeadRow) {
  const answers = lead.quizAnswers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return [];
  return Object.entries(answers as Record<string, unknown>).filter(
    ([, value]) => value != null && String(value).trim() !== "",
  );
}

function humanizeAnswerKey(key: string) {
  return key
    .replace(/^q-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
