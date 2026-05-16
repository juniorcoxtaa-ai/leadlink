import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MapPin, Clock, User, Building2, FileText, Tag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { brokers, leads, properties, type Appointment } from "@/lib/mock-data";
import { toast } from "sonner";

export type NewAppointment = Omit<Appointment, "id"> & { id?: string };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Appointment> | null;
  onSave: (a: Appointment) => void;
}

const TYPES: Appointment["type"][] = ["Visita", "Reunião", "Ligação", "Assinatura"];
const STATUSES: { v: Appointment["status"]; l: string }[] = [
  { v: "confirmado", l: "Confirmado" },
  { v: "pendente", l: "Pendente" },
  { v: "concluido", l: "Concluído" },
];

export function AppointmentFormDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [type, setType] = useState<Appointment["type"]>("Visita");
  const [title, setTitle] = useState("");
  const [leadName, setLeadName] = useState("");
  const [propertyTitle, setPropertyTitle] = useState<string>("");
  const [brokerId, setBrokerId] = useState(brokers[0].id);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<Appointment["status"]>("confirmado");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const i = initial ?? {};
    setType((i.type as Appointment["type"]) ?? "Visita");
    setTitle(i.title ?? "");
    setLeadName(i.leadName ?? "");
    setPropertyTitle(i.propertyTitle ?? "");
    setBrokerId(i.brokerId ?? brokers[0].id);
    const d = i.date ? new Date(i.date) : new Date();
    setDate(d);
    setTime(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
    setDuration(i.duration ?? 60);
    setLocation(i.location ?? "");
    setStatus((i.status as Appointment["status"]) ?? "confirmado");
    setNotes("");
  }, [open, initial]);

  function handleSave() {
    if (!title.trim()) { toast.error("Adicione um título"); return; }
    if (!leadName.trim()) { toast.error("Selecione um lead"); return; }
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
    const dt = new Date(date);
    dt.setHours(hh || 0, mm || 0, 0, 0);
    const a: Appointment = {
      id: initial?.id ?? `ap-${Date.now()}`,
      title: title.trim(),
      type,
      leadName: leadName.trim(),
      propertyTitle: propertyTitle || undefined,
      brokerId,
      date: dt.toISOString(),
      duration,
      location: location.trim() || "A definir",
      status,
    };
    onSave(a);
    toast.success(initial?.id ? "Compromisso atualizado" : "Compromisso criado");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            {initial?.id ? "Editar compromisso" : "Novo compromisso"}
          </SheetTitle>
          <SheetDescription>
            Organize visitas, reuniões e ligações com seus leads.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          {/* Tipo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Tag className="h-3 w-3" /> Tipo de compromisso
            </Label>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={(v) => v && setType(v as Appointment["type"])}
              className="grid grid-cols-4 gap-2"
            >
              {TYPES.map((t) => (
                <ToggleGroupItem
                  key={t}
                  value={t}
                  className="data-[state=on]:bg-navy data-[state=on]:text-navy-foreground border border-border rounded-lg h-10 text-xs"
                >
                  {t}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Visita à Cobertura Duplex"
            />
          </div>

          {/* Lead + Imóvel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Lead</Label>
              <Select value={leadName} onValueChange={setLeadName}>
                <SelectTrigger><SelectValue placeholder="Selecionar lead" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {leads.slice(0, 30).map((l) => (
                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Imóvel (opcional)</Label>
              <Select value={propertyTitle || "_none"} onValueChange={(v) => setPropertyTitle(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar imóvel" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="_none">Sem imóvel</SelectItem>
                  {properties.slice(0, 30).map((p) => (
                    <SelectItem key={p.id} value={p.title}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data + Hora + Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2 sm:col-span-1">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd MMM yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v, 10))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Local */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Local</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço, escritório, online..." />
          </div>

          {/* Corretor + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Corretor responsável</Label>
              <Select value={brokerId} onValueChange={setBrokerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {brokers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Appointment["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações importantes para o atendimento..." rows={3} />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-navy text-navy-foreground hover:bg-navy/90">
            {initial?.id ? "Salvar alterações" : "Criar compromisso"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
