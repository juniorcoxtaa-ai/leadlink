import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Pencil,
  Search,
  Filter,
} from "lucide-react";
import { ptBR } from "date-fns/locale";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  addWeeks,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfDay,
} from "date-fns";
import { AppointmentFormDialog } from "@/components/AppointmentFormDialog";
import type { Appointment } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "@/server-fns/appointments";

export const Route = createFileRoute("/_app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Leadlink" }] }),
  loader: () => getAppointments(),
  component: AgendaPage,
});

const typeColor: Record<string, { dot: string; chip: string; bar: string }> = {
  Visita: {
    dot: "bg-emerald",
    chip: "border-emerald/30 bg-emerald/10 text-emerald",
    bar: "bg-emerald",
  },
  Reunião: { dot: "bg-navy", chip: "border-navy/20 bg-navy/5 text-navy", bar: "bg-navy" },
  Ligação: { dot: "bg-gold", chip: "border-gold/40 bg-gold/15 text-foreground", bar: "bg-gold" },
  Assinatura: {
    dot: "bg-success",
    chip: "border-success/30 bg-success/10 text-success",
    bar: "bg-success",
  },
};

type View = "dia" | "semana" | "mes";
type AppointmentItem = {
  id: string;
  title: string;
  type: string;
  leadName: string;
  leadId?: string | null;
  propertyTitle?: string | null;
  propertyId?: string | null;
  brokerId?: string | null;
  date: string | Date;
  duration: number;
  location?: string | null;
  status: string;
  createdAt?: string | Date;
  brokerName?: string | null;
  brokerInitials?: string | null;
};
type EditableAppointment = Partial<Appointment> | null;

type AppointmentSaveInput = {
  id: string;
  title: string;
  type: string;
  leadName: string;
  leadId?: string | null;
  propertyTitle?: string;
  propertyId?: string | null;
  brokerId: string;
  date: string;
  duration: number;
  location: string;
  status: string;
};

type WeekViewProps = {
  days: Date[];
  items: AppointmentItem[];
  today: Date;
  onCreate: (date?: Date) => void;
  onEdit: (appointment: AppointmentItem) => void;
  onStatusChange: (id: string, status: string) => void;
};

type DayViewProps = {
  date: Date;
  items: AppointmentItem[];
  onCreate: (date?: Date) => void;
  onEdit: (appointment: AppointmentItem) => void;
  onStatusChange: (id: string, status: string) => void;
};

type MonthViewProps = {
  cursor: Date;
  items: AppointmentItem[];
  onSelectDay: (date: Date) => void;
  onCreate: (date?: Date) => void;
};

type AppointmentCardProps = {
  a: AppointmentItem;
  onEdit: (appointment: AppointmentItem) => void;
  onStatusChange: (id: string, status: string) => void;
};

function AgendaPage() {
  const loaded = Route.useLoaderData() as AppointmentItem[];
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [view, setView] = useState<View>("semana");
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [cursor, setCursor] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableAppointment | null>(null);
  const [filterType, setFilterType] = useState<string>("todos");
  const [search, setSearch] = useState("");

  useEffect(() => setItems(loaded || []), [loaded]);

  useEffect(() => {
    const syncToday = () => {
      const localToday = startOfDay(new Date());
      setToday(localToday);
      setCursor((current) => current ?? localToday);
      setHydrated(true);
    };
    syncToday();
    const id = setInterval(syncToday, 60_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((a) => {
        if (filterType !== "todos" && a.type !== filterType) return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !a.leadName?.toLowerCase().includes(q) &&
            !a.title?.toLowerCase().includes(q) &&
            !(a.propertyTitle || "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [items, filterType, search],
  );

  async function handleSave(a: AppointmentSaveInput) {
    try {
      const payload = {
        title: a.title,
        type: a.type,
        leadName: a.leadName,
        leadId: a.leadId ?? undefined,
        propertyTitle: a.propertyTitle,
        propertyId: a.propertyId ?? undefined,
        brokerId: a.brokerId,
        date: a.date,
        duration: a.duration,
        location: a.location,
        status: a.status,
      };
      const saved =
        !a.id || String(a.id).startsWith("temp-")
          ? await createAppointment({ data: payload })
          : await updateAppointment({ data: { id: a.id, ...payload } });

      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === a.id || p.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      toast.success("Compromisso salvo");
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar compromisso");
      return false;
    }
  }

  function openNew(date?: Date) {
    setEditing(date ? { id: `temp-${Date.now()}`, date: date.toISOString() } : null);
    setFormOpen(true);
  }
  function openEdit(a: AppointmentItem) {
    setEditing({
      ...a,
      date: typeof a.date === "string" ? a.date : a.date.toISOString(),
      type: a.type as Appointment["type"],
      status: a.status as Appointment["status"],
      brokerId: a.brokerId ?? "",
      leadName: a.leadName ?? "",
      title: a.title ?? "",
      duration: a.duration ?? 60,
      location: a.location ?? "A definir",
      propertyTitle: a.propertyTitle ?? undefined,
    });
    setFormOpen(true);
  }
  function shift(dir: number) {
    if (!cursor) return;
    if (view === "dia") setCursor(addDays(cursor, dir));
    else if (view === "semana") setCursor(addWeeks(cursor, dir));
    else {
      const d = new Date(cursor);
      d.setMonth(d.getMonth() + dir);
      setCursor(d);
    }
  }

  if (!hydrated || !today || !cursor) {
    return (
      <div className="space-y-6 max-w-[1500px] mx-auto">
        <Card className="p-6 border-border/70">
          <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
          <div className="mt-4 h-4 w-80 max-w-full rounded-md bg-muted animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const monthLabel = format(cursor, "MMMM yyyy", { locale: ptBR });
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const stats = {
    total: filtered.length,
    visitas: filtered.filter((a) => a.type === "Visita").length,
    confirmados: filtered.filter((a) => a.status === "confirmado").length,
    pendentes: filtered.filter((a) => a.status === "pendente").length,
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-navy via-navy to-navy/90 p-6 md:p-8 text-navy-foreground">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-emerald/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-6 justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-gold/90 font-semibold flex items-center gap-2">
              <CalendarDays className="h-3 w-3" /> Agenda Premium
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight capitalize mt-2">
              {monthLabel}
            </h2>
            <p className="text-sm text-navy-foreground/70 mt-1">
              Sua rotina de visitas, reuniões e fechamentos em um só lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as View)}
              className="bg-white/10 backdrop-blur p-1 rounded-full border border-white/15"
            >
              {(["dia", "semana", "mes"] as View[]).map((v) => (
                <ToggleGroupItem
                  key={v}
                  value={v}
                  className="rounded-full text-xs h-8 px-4 capitalize text-navy-foreground/80 data-[state=on]:bg-gold data-[state=on]:text-navy"
                >
                  {v === "mes" ? "Mês" : v}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center bg-white/10 backdrop-blur border border-white/15 rounded-full p-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-navy-foreground hover:bg-white/10"
                onClick={() => shift(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setCursor(today)}
                className="text-xs font-medium px-3 hover:underline"
              >
                Hoje
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-navy-foreground hover:bg-white/10"
                onClick={() => shift(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => openNew()}
              className="bg-gold text-navy hover:bg-gold/90 rounded-full font-semibold shadow-lg shadow-gold/20"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Novo compromisso
            </Button>
          </div>
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { l: "Compromissos", v: stats.total, icon: CalendarDays },
            { l: "Visitas", v: stats.visitas, icon: Eye },
            { l: "Confirmados", v: stats.confirmados, icon: CheckCircle2 },
            { l: "Pendentes", v: stats.pendentes, icon: Clock3 },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.18em] text-navy-foreground/70">
                  {s.l}
                </div>
                <s.icon className="h-3.5 w-3.5 text-gold/80" />
              </div>
              <div className="font-display text-2xl font-semibold mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por lead, imóvel ou título..."
              className="pl-9 rounded-full"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {["todos", "Visita", "Reunião", "Ligação", "Assinatura"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "text-xs px-3 h-8 rounded-full border transition whitespace-nowrap",
                filterType === t
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border hover:border-foreground/40",
              )}
            >
              {t === "todos" ? "Todos" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <Card className="p-3 border-border/70">
            <CalendarUI
              mode="single"
              selected={cursor}
              onSelect={(d) => d && setCursor(d)}
              locale={ptBR}
              showOutsideDays
              className="p-0 pointer-events-auto rounded-lg"
            />
          </Card>
          <Card className="p-4 border-border/70">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Próximos
              </div>
              <Badge variant="outline" className="rounded-full text-[10px] h-5">
                5
              </Badge>
            </div>
            <div className="space-y-2">
              {filtered
                .filter((a) => new Date(a.date) >= today)
                .sort((a, b) => +new Date(a.date) - +new Date(b.date))
                .slice(0, 5)
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openEdit(a)}
                    className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition"
                  >
                    <div
                      className={cn(
                        "w-1 self-stretch rounded-full",
                        typeColor[a.type]?.bar || "bg-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{a.leadName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(a.date), "dd MMM • HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </Card>
        </div>

        <div>
          {view === "semana" && (
            <WeekView
              days={weekDays}
              items={filtered}
              today={today}
              onCreate={openNew}
              onEdit={openEdit}
              onStatusChange={(id: string, status: string) => {
                updateAppointmentStatus({ data: { id, status } }).catch(() =>
                  toast.error("Falha ao atualizar status"),
                );
              }}
            />
          )}
          {view === "dia" && (
            <DayView
              date={cursor}
              items={filtered}
              onCreate={openNew}
              onEdit={openEdit}
              onStatusChange={(id: string, status: string) => {
                updateAppointmentStatus({ data: { id, status } }).catch(() =>
                  toast.error("Falha ao atualizar status"),
                );
              }}
            />
          )}
          {view === "mes" && (
            <MonthView
              cursor={cursor}
              items={filtered}
              onSelectDay={(d: Date) => {
                setCursor(d);
                setView("dia");
              }}
              onCreate={openNew}
            />
          )}
        </div>
      </div>

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSave={handleSave}
      />
    </div>
  );
}

function WeekView({ days, items, today, onCreate, onEdit, onStatusChange }: WeekViewProps) {
  return (
    <div className="space-y-3">
      {days.map((date: Date) => {
        const dayItems = items
          .filter((a) => isSameDay(new Date(a.date), date))
          .sort((a, b) => +new Date(a.date) - +new Date(b.date));
        const isToday = isSameDay(date, today);
        return (
          <Card
            key={date.toISOString()}
            className={cn("border-border/70 overflow-hidden", isToday && "ring-1 ring-emerald/40")}
          >
            <div
              className={cn(
                "flex items-center justify-between px-4 py-2.5 border-b",
                isToday ? "bg-emerald/5" : "bg-muted/30",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "font-display text-2xl font-semibold leading-none",
                    isToday && "text-emerald",
                  )}
                >
                  {format(date, "dd")}
                </div>
                <div>
                  <div className="text-xs font-medium capitalize">
                    {format(date, "EEEE", { locale: ptBR })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onCreate(date)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            <div className="p-3 space-y-2">
              {dayItems.length === 0 ? (
                <div className="text-sm text-muted-foreground italic py-3 text-center">
                  Sem compromissos
                </div>
              ) : (
                dayItems.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    a={a}
                    onEdit={onEdit}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DayView({ date, items, onCreate, onEdit, onStatusChange }: DayViewProps) {
  const dayItems = items
    .filter((a) => isSameDay(new Date(a.date), date))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const hours = Array.from({ length: 13 }).map((_, i) => i + 7);
  return (
    <Card className="border-border/70 overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {format(date, "EEEE", { locale: ptBR })}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onCreate(date)} className="rounded-full">
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>
      <div className="divide-y">
        {hours.map((h) => {
          const slotItems = dayItems.filter((a) => new Date(a.date).getHours() === h);
          return (
            <div
              key={h}
              className="grid grid-cols-[70px_1fr] min-h-[68px] hover:bg-muted/20 transition group"
            >
              <div className="px-4 py-3 text-xs text-muted-foreground border-r">
                {h.toString().padStart(2, "0")}:00
              </div>
              <div className="p-2 space-y-2">
                {slotItems.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">vazio</div>
                ) : (
                  slotItems.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      a={a}
                      onEdit={onEdit}
                      onStatusChange={onStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MonthView({ cursor, items, onSelectDay, onCreate }: MonthViewProps) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = startOfWeek(addDays(monthEnd, 7), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridEnd, -1) });
  const today = startOfDay(new Date());
  return (
    <Card className="border-border/70 overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <div
            key={d}
            className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground text-center"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dItems = items.filter((a) => isSameDay(new Date(a.date), d));
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelectDay(d)}
              className={cn(
                "min-h-[110px] border-r border-b p-2 text-left hover:bg-muted/30 transition relative",
                !inMonth && "bg-muted/10 text-muted-foreground",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isToday &&
                      "h-6 w-6 rounded-full bg-emerald text-emerald-foreground flex items-center justify-center",
                  )}
                >
                  {format(d, "dd")}
                </span>
                {dItems.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{dItems.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {dItems.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "text-[10px] rounded px-1.5 py-0.5 truncate border",
                      typeColor[a.type]?.chip || "",
                    )}
                  >
                    {format(new Date(a.date), "HH:mm")} · {a.leadName?.split(" ")[0]}
                  </div>
                ))}
                {dItems.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">
                    + {dItems.length - 3} mais
                  </div>
                )}
              </div>
              {inMonth && dItems.length === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreate(d);
                  }}
                  className="absolute bottom-1 right-1 opacity-0 hover:opacity-100 text-muted-foreground"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function AppointmentCard({ a, onEdit, onStatusChange }: AppointmentCardProps) {
  const c = typeColor[a.type] || typeColor.Visita;
  return (
    <div className="group flex items-stretch gap-3 rounded-xl border border-border/70 bg-card hover:shadow-soft hover:border-foreground/20 transition overflow-hidden">
      <div className={cn("w-1.5", c.bar)} />
      <div className="flex-1 flex items-center gap-4 py-3 pr-3">
        <div className="text-center w-14 shrink-0">
          <div className="font-display text-lg font-semibold leading-none">
            {format(new Date(a.date), "HH:mm")}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            {a.duration}min
          </div>
        </div>
        <div className="w-px self-stretch bg-border" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge
              variant="outline"
              className={cn(c.chip, "rounded-full font-normal text-[10px] h-5")}
            >
              {a.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full font-normal text-[10px] h-5",
                a.status === "confirmado" && "border-success/40 text-success bg-success/5",
                a.status === "pendente" && "border-warning/40 text-warning bg-warning/5",
                a.status === "concluido" && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {a.status === "confirmado"
                ? "Confirmado"
                : a.status === "pendente"
                  ? "Pendente"
                  : "Concluído"}
            </Badge>
          </div>
          <div className="font-medium leading-tight">{a.leadName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
            {a.propertyTitle && <span className="truncate max-w-[240px]">{a.propertyTitle}</span>}
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {a.location}
            </span>
          </div>
          <div className="mt-2">
            <select
              value={a.status}
              onChange={(e) => onStatusChange(a.id, e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="pendente">Pendente</option>
              <option value="confirmado">Confirmado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => onEdit(a)}
          className="opacity-0 group-hover:opacity-100 transition h-8 w-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
