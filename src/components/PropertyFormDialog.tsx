import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createProperty } from "@/server-fns/properties";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (property: any) => void;
};

type LocalImage = {
  id: string;
  file: File;
  url: string;
  kind: "cover" | "gallery";
};

const MAX_IMAGES = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const featureLabels = [
  ["piscina", "Piscina"],
  ["churrasqueira", "Churrasqueira"],
  ["elevador", "Elevador"],
  ["sacada", "Sacada"],
  ["mobiliado", "Mobiliado"],
  ["areaLazer", "Área de lazer"],
  ["vistaMar", "Vista mar"],
  ["aceitaPet", "Aceita pet"],
] as const;

const initialForm = {
  title: "",
  type: "Apartamento",
  businessType: "Venda",
  status: "Disponível",
  price: "",
  condoValue: "",
  iptuValue: "",
  area: "",
  bedrooms: "0",
  bathrooms: "0",
  parking: "0",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "São Paulo",
  state: "SP",
  image: "",
  highlight: "",
  description: "",
  features: {
    piscina: false,
    churrasqueira: false,
    elevador: false,
    sacada: false,
    mobiliado: false,
    areaLazer: false,
    vistaMar: false,
    aceitaPet: false,
  },
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function featureSummary(features: Record<string, boolean>) {
  return featureLabels.filter(([key]) => features[key]).map(([, label]) => label);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });
}

function isAcceptedImage(file: File) {
  return ACCEPTED_TYPES.includes(file.type);
}

export function PropertyFormDialog({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<LocalImage[]>([]);
  const lastCepRequested = useRef("");
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setSubmitting(false);
      setCepLoading(false);
      setCoverPreview(null);
      setGalleryPreviews([]);
      lastCepRequested.current = "";
    }
  }, [open]);

  useEffect(() => {
    const cepDigits = onlyDigits(form.cep);
    if (cepDigits.length !== 8 || lastCepRequested.current === cepDigits) return;

    let cancelled = false;
    lastCepRequested.current = cepDigits;
    setCepLoading(true);

    (async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        if (!response.ok) throw new Error("CEP inválido");
        const data = (await response.json()) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
        if (cancelled || data.erro) throw new Error("CEP não encontrado");

        setForm((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      } catch {
        toast.error("Não foi possível preencher o endereço pelo CEP. Você pode completar manualmente.");
      } finally {
        if (!cancelled) setCepLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.cep]);

  const update = (key: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateFeature = (key: keyof typeof initialForm.features, value: boolean) => {
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));
  };

  const addCover = async (file: File) => {
    if (!isAcceptedImage(file)) {
      toast.error("A capa deve ser JPG, PNG ou WEBP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Cada imagem deve ter no máximo 5MB");
      return;
    }
    const url = await fileToDataUrl(file);
    setCoverPreview(url);
    update("image", url);
  };

  const addGalleryFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const currentCount = (coverPreview ? 1 : 0) + galleryPreviews.length;
    const remaining = MAX_IMAGES - currentCount;
    if (remaining <= 0) {
      toast.error("Máximo de 10 imagens atingido");
      return;
    }
    const accepted: LocalImage[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!isAcceptedImage(file)) {
        toast.error(`Arquivo "${file.name}" não é JPG, PNG ou WEBP`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`Arquivo "${file.name}" excede 5MB`);
        continue;
      }
      accepted.push({ id: `${file.name}-${crypto.randomUUID()}`, file, url: await fileToDataUrl(file), kind: "gallery" });
    }
    if (accepted.length) {
      setGalleryPreviews((prev) => [...prev, ...accepted].slice(0, MAX_IMAGES - (coverPreview ? 1 : 0)));
    }
  };

  const removeCover = () => {
    setCoverPreview(null);
    update("image", "");
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const removeGalleryImage = (id: string) => {
    setGalleryPreviews((prev) => prev.filter((img) => img.id !== id));
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const moveGalleryImage = (id: string, direction: "up" | "down") => {
    setGalleryPreviews((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const allGalleryUrls = useMemo(() => galleryPreviews.map((img) => img.url), [galleryPreviews]);

  const submit = async () => {
    if (submitting) return;
    if (
      !form.title.trim() ||
      !form.type.trim() ||
      !form.businessType.trim() ||
      !form.status.trim() ||
      !form.price.trim() ||
      !form.area.trim() ||
      !form.neighborhood.trim() ||
      !form.city.trim() ||
      !form.state.trim()
    ) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (!coverPreview && !form.image.trim()) {
      toast.error("Adicione uma foto de capa");
      return;
    }

    setSubmitting(true);
    try {
      const property = await createProperty({
        data: {
          title: form.title.trim(),
          type: form.type.trim(),
          businessType: form.businessType.trim(),
          status: form.status.trim(),
          price: Number(form.price),
          condoValue: form.condoValue ? Number(form.condoValue) : undefined,
          iptuValue: form.iptuValue ? Number(form.iptuValue) : undefined,
          area: Number(form.area),
          bedrooms: Number(form.bedrooms || 0),
          bathrooms: Number(form.bathrooms || 0),
          parking: Number(form.parking || 0),
          cep: onlyDigits(form.cep).slice(0, 8) || undefined,
          street: form.street.trim() || undefined,
          number: form.number.trim() || undefined,
          complement: form.complement.trim() || undefined,
          neighborhood: form.neighborhood.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          image: coverPreview || form.image.trim() || undefined,
          images: allGalleryUrls,
          highlight: form.highlight.trim() || undefined,
          description: form.description.trim() || undefined,
          features: Object.fromEntries(featureLabels.map(([key]) => [key, form.features[key]])),
        },
      });

      onCreated(property);
      toast.success("Imóvel cadastrado com sucesso");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao cadastrar imóvel");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar imóvel</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="rounded-2xl border border-border/70 bg-[linear-gradient(135deg,_color-mix(in_oklab,_var(--navy)_92%,_black),_color-mix(in_oklab,_var(--navy)_70%,_var(--gold)_16%))] p-4 text-navy-foreground shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">Upload premium</div>
                <div className="font-display text-xl font-semibold">Fotos de capa e galeria</div>
                <p className="text-xs text-navy-foreground/75 max-w-xl">
                  O imóvel fica com cara de anúncio profissional: capa destacada, várias imagens, preview e persistência no banco.
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end text-[10px] uppercase tracking-[0.2em] text-navy-foreground/70">
                <span>{coverPreview || form.image ? "Capa pronta" : "Sem capa"}</span>
                <span>{galleryPreviews.length} foto(s) na galeria</span>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Input value={form.type} onChange={(e) => update("type", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de negócio</Label>
              <select
                value={form.businessType}
                onChange={(e) => update("businessType", e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Venda">Venda</option>
                <option value="Locação">Locação</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Input value={form.status} onChange={(e) => update("status", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>CEP</Label>
              <Input
                value={form.cep}
                onChange={(e) => update("cep", formatCep(e.target.value))}
                placeholder="00000-000"
                inputMode="numeric"
              />
              <p className="text-[11px] text-muted-foreground">
                {cepLoading ? "Buscando endereço..." : "O endereço será preenchido automaticamente quando possível."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Rua</Label>
              <Input value={form.street} onChange={(e) => update("street", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Número</Label>
              <Input value={form.number} onChange={(e) => update("number", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Complemento</Label>
              <Input value={form.complement} onChange={(e) => update("complement", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} maxLength={2} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Preço</Label>
              <Input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Área</Label>
              <Input type="number" value={form.area} onChange={(e) => update("area", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Quartos</Label>
              <Input type="number" value={form.bedrooms} onChange={(e) => update("bedrooms", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Banheiros</Label>
              <Input type="number" value={form.bathrooms} onChange={(e) => update("bathrooms", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Vagas</Label>
              <Input type="number" value={form.parking} onChange={(e) => update("parking", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Condomínio</Label>
              <Input type="number" value={form.condoValue} onChange={(e) => update("condoValue", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>IPTU</Label>
              <Input type="number" value={form.iptuValue} onChange={(e) => update("iptuValue", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Descrição do imóvel</Label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-2">
            <Label>Características</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-border/70 p-3">
              {featureLabels.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.features[key]}
                    onChange={(e) => updateFeature(key, e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {featureSummary(form.features).length > 0 && (
              <p className="text-[11px] text-muted-foreground">Selecionadas: {featureSummary(form.features).join(", ")}</p>
            )}
          </div>

          <div className="grid gap-3 rounded-xl border border-border/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="flex-1">Foto de capa</Label>
                <p className="text-[11px] text-muted-foreground">Obrigatória ou recomendada, dependendo do fluxo.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                Escolher capa
              </Button>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await addCover(file);
              }}
            />
            {coverPreview || form.image ? (
              <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr]">
                <div className="relative overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm">
                  <img src={coverPreview || form.image} alt="Prévia da capa" className="h-56 w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/80">Capa principal</div>
                    <div className="text-sm font-medium text-white">Será exibida na vitrine e no detalhe do imóvel</div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCover}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 content-start rounded-xl border border-border/70 bg-background p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Resumo</div>
                  <div className="text-sm">
                    <span className="font-semibold">Formato aceito:</span> JPG, PNG e WEBP
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Peso máximo:</span> 5MB por imagem
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Persistência:</span> capa e galeria ficam salvas no banco
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-xs text-muted-foreground">
                Selecione uma imagem JPG, PNG ou WEBP de até 5MB.
              </div>
            )}
            <div className="grid gap-2">
              <Label>URL da imagem atual</Label>
              <Input value={form.image} onChange={(e) => update("image", e.target.value)} placeholder="Fallback manual se preferir" />
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-border/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="flex-1">Galeria de imagens</Label>
                <p className="text-[11px] text-muted-foreground">Até 10 imagens, com preview e ordem ajustável antes de salvar.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                disabled={galleryPreviews.length >= MAX_IMAGES - (coverPreview || form.image ? 1 : 0)}
              >
                Adicionar fotos
              </Button>
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={async (e) => {
                await addGalleryFiles(e.target.files);
                if (galleryInputRef.current) {
                  galleryInputRef.current.value = "";
                }
              }}
            />
            {galleryPreviews.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {galleryPreviews.map((img) => (
                  <div key={img.id} className="relative overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm">
                    <img src={img.url} alt="Prévia da galeria" className="h-36 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/75">Foto da galeria</div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(img.id, "up")}
                          disabled={galleryPreviews[0]?.id === img.id}
                          className="rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground shadow disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(img.id, "down")}
                          disabled={galleryPreviews[galleryPreviews.length - 1]?.id === img.id}
                          className="rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground shadow disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(img.id)}
                          className="rounded-full bg-background/90 p-1.5 shadow"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-xs text-muted-foreground">
                Adicione até 10 fotos para a galeria.
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              JPG, PNG ou WEBP, até 5MB por imagem.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Destaque opcional</Label>
            <Input value={form.highlight} onChange={(e) => update("highlight", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar imóvel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
