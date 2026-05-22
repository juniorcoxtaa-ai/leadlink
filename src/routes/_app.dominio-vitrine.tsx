import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, ExternalLink, Globe, LoaderCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  checkDomainAvailability,
  checkDomainDns,
  getMyCustomDomain,
  removeCustomDomain,
  refreshCustomDomainStatus,
  registerCustomDomain,
} from "@/server-fns/custom-domain";
import { getMySlug } from "@/server-fns/meu-link";

const DEFAULT_DNS_TARGET = "cname.leadlink.com.br";

export const Route = createFileRoute("/_app/dominio-vitrine")({
  head: () => ({ meta: [{ title: "Domínio da Vitrine — Leadlink" }] }),
  component: DominioVitrinePage,
});

type AvailabilityResult = Awaited<ReturnType<typeof checkDomainAvailability>> | null;
type CurrentDomain = Awaited<ReturnType<typeof getMyCustomDomain>>;
type RailwayDnsRecord = NonNullable<NonNullable<CurrentDomain>["railwayDnsRecords"]>[number];

function DominioVitrinePage() {
  const queryClient = useQueryClient();
  const plan = usePlanLimits();
  const [availabilityInput, setAvailabilityInput] = useState("");
  const [existingDomainInput, setExistingDomainInput] = useState("");
  const [availabilityResult, setAvailabilityResult] = useState<AvailabilityResult>(null);
  const [dnsTarget, setDnsTarget] = useState(DEFAULT_DNS_TARGET);

  const { data: currentDomain = null, isLoading } = useQuery({
    queryKey: ["custom-domain", "current"],
    queryFn: () => getMyCustomDomain(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: mySlug = null } = useQuery({
    queryKey: ["custom-domain", "slug"],
    queryFn: () => getMySlug(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const refreshDomain = async () => {
    await queryClient.invalidateQueries({ queryKey: ["custom-domain", "current"] });
  };

  const availabilityMutation = useMutation({
    mutationFn: (domain: string) => checkDomainAvailability({ data: { domain } }),
    onSuccess: (result) => {
      setAvailabilityResult(result);
      if (result.status === "likely_available") {
        toast.success("Verificação aproximada concluída");
      } else if (result.status === "likely_taken") {
        toast.warning("Esse domínio parece já estar em uso");
      } else {
        toast.error("Formato de domínio inválido");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const registerMutation = useMutation({
    mutationFn: (domain: string) => registerCustomDomain({ data: { domain } }),
    onSuccess: async (result) => {
      setDnsTarget(result.dnsTarget);
      setExistingDomainInput("");
      toast.success("Domínio cadastrado. Agora configure o DNS.");
      await refreshDomain();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dnsMutation = useMutation({
    mutationFn: () => checkDomainDns(),
    onSuccess: async (result) => {
      setDnsTarget(result.dnsTarget);
      if (result.ok) {
        toast.success("Status atualizado com sucesso");
      } else {
        toast.warning(result.message);
      }
      await refreshDomain();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const refreshStatusMutation = useMutation({
    mutationFn: () => refreshCustomDomainStatus(),
    onSuccess: async () => {
      toast.success("Status do dominio atualizado");
      await refreshDomain();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeCustomDomain(),
    onSuccess: async () => {
      toast.success("Domínio removido");
      await refreshDomain();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeVitrineUrl =
    currentDomain?.status === "active" && currentDomain.domain
      ? `https://${currentDomain.domain}`
      : mySlug
        ? `/l/${mySlug}/vitrine`
        : null;

  const resolvedDnsTarget = currentDomain?.dnsTarget || dnsTarget;
  const railwayDnsRecords = Array.isArray(currentDomain?.railwayDnsRecords)
    ? currentDomain.railwayDnsRecords
    : [];
  const railwayTxtRecord = railwayDnsRecords.find((record) => record.recordType === "TXT") ?? null;
  const railwayTxtHost =
    railwayTxtRecord?.hostlabel || railwayTxtRecord?.fqdn || "_railway-verify.www";
  const railwayTxtValue =
    currentDomain?.railwayVerificationToken || railwayTxtRecord?.requiredValue || null;
  const showCnameInstructions = currentDomain?.status === "pending_dns" || currentDomain?.status === "failed";
  const showRailwayRecords = railwayDnsRecords.length > 0;
  const canRefreshStatus = currentDomain?.status === "pending_ssl";

  const canManageDomain = plan.capabilities.hasCustomDomain;
  const statusMeta = getStatusMeta(currentDomain?.status);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <Card className="p-6 md:p-8 border-border/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Vitrine pública
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              Domínio próprio da vitrine
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Configure um domínio próprio para sua vitrine pública sem alterar o restante do painel.
            </p>
          </div>
          {currentDomain && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
              <Badge variant="outline" className="rounded-full">
                {currentDomain.domain}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {!canManageDomain ? (
        <Card className="p-6 border-border/70">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Disponível apenas em planos com domínio próprio</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                O domínio próprio afeta apenas sua vitrine pública. Seu painel não muda.
              </p>
              <Button asChild className="bg-navy text-navy-foreground hover:bg-navy/90 rounded-full">
                <Link to="/planos" search={{ success: undefined, canceled: undefined }}>
                  Ver planos
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-6 border-border/70 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Opção 1
                </div>
                <h2 className="text-xl font-semibold mt-1">Quero comprar um domínio</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Faça uma checagem aproximada antes de comprar. O resultado não substitui a confirmação no registrador.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={availabilityInput}
                  onChange={(event) => setAvailabilityInput(event.target.value)}
                  placeholder="Ex.: minhaimobiliaria.com.br"
                  className="h-11"
                />
                <Button
                  onClick={() => availabilityMutation.mutate(availabilityInput)}
                  disabled={availabilityMutation.isPending}
                  className="h-11 rounded-full bg-navy text-navy-foreground hover:bg-navy/90"
                >
                  {availabilityMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-1.5" />
                  )}
                  Consultar disponibilidade
                </Button>
              </div>

              {availabilityResult && (
                <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={availabilityBadgeClass(availabilityResult.status)}>
                      {availabilityStatusLabel(availabilityResult.status)}
                    </Badge>
                    <span className="text-sm font-medium">{availabilityResult.domain || "Domínio informado"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{availabilityResult.message}</p>
                  <p className="text-xs text-muted-foreground">
                    A verificação é aproximada e pode divergir do registrador oficial.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="text-sm font-medium">Onde comprar</div>
                <div className="flex flex-wrap gap-2">
                  <BuyLink href="https://registro.br" label="Registro.br" />
                  <BuyLink href="https://www.hostinger.com.br/registro-de-dominio" label="Hostinger" />
                  <BuyLink href="https://br.godaddy.com/domains" label="GoDaddy" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/70 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Opção 2
                </div>
                <h2 className="text-xl font-semibold mt-1">Já tenho um domínio</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Cadastre o domínio que você já possui para configurar o apontamento DNS.
                </p>
              </div>

              <Input
                value={existingDomainInput}
                onChange={(event) => setExistingDomainInput(event.target.value)}
                placeholder="Ex.: vitrine.suaempresa.com.br"
                className="h-11"
                disabled={Boolean(currentDomain)}
              />

              <Button
                onClick={() => registerMutation.mutate(existingDomainInput)}
                disabled={registerMutation.isPending || Boolean(currentDomain)}
                className="h-11 rounded-full bg-emerald text-emerald-foreground hover:bg-emerald/90"
              >
                {registerMutation.isPending && <LoaderCircle className="h-4 w-4 mr-1.5 animate-spin" />}
                Cadastrar domínio
              </Button>

              {currentDomain && (
                <p className="text-xs text-muted-foreground">
                  Você já possui um domínio não removido cadastrado. Remova o atual para cadastrar outro.
                </p>
              )}
            </Card>
          </div>

          <Card className="p-6 border-border/70 space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Status atual do domínio</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O domínio próprio afeta apenas sua vitrine pública. Seu painel não muda.
                </p>
              </div>
              {activeVitrineUrl && (
                <Button asChild variant="outline" className="rounded-full">
                  <a href={activeVitrineUrl} target="_blank" rel="noreferrer">
                    Abrir vitrine
                    <ExternalLink className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando domínio atual...</div>
            ) : currentDomain ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                      <span className="font-medium">{currentDomain.domain}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{statusMeta.description}</p>

                    {currentDomain.status === "dns_verified" && (
                      <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                        O DNS foi validado e o sistema está preparando o domínio na Railway.
                      </div>
                    )}

                    {currentDomain.status === "provisioning_railway" && (
                      <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                        Estamos cadastrando seu domínio na infraestrutura do LeadLink.
                      </div>
                    )}

                    {currentDomain.status === "pending_ssl" && (
                      <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 space-y-1">
                        <div>
                          Seu domínio já foi cadastrado. Agora estamos aguardando a emissão do certificado SSL.
                        </div>
                        <div className="text-xs">
                          O certificado SSL pode levar alguns minutos após a verificação do DNS.
                        </div>
                      </div>
                    )}

                    {currentDomain.errorMessage && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {currentDomain.errorMessage}
                      </div>
                    )}
                  </div>

                  {showCnameInstructions && (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>A propagação DNS pode levar até 24 horas.</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Nome/Host</TableHead>
                            <TableHead>Valor/Destino</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>CNAME</TableCell>
                            <TableCell>www</TableCell>
                            <TableCell className="font-mono text-xs">{resolvedDnsTarget}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {showRailwayRecords && (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div>
                        <div className="text-sm font-medium">Registros pedidos pela Railway</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Use estes registros adicionais apenas se o seu provedor de domínio solicitar.
                        </p>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Nome/Host</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Finalidade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {railwayDnsRecords.map((record, index) => (
                            <TableRow key={getRailwayRecordKey(record, index)}>
                              <TableCell>{record.recordType || "-"}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {record.hostlabel || record.fqdn || "-"}
                              </TableCell>
                              <TableCell className="font-mono text-xs break-all">
                                {record.requiredValue || "-"}
                              </TableCell>
                              <TableCell>{formatRailwayRecordStatus(record.status)}</TableCell>
                              <TableCell>{record.purpose || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {railwayTxtValue && (
                        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900 space-y-2">
                          <div className="font-medium">Registro TXT de verificação</div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div>
                              <div className="text-xs text-sky-700">Tipo</div>
                              <div className="font-mono text-xs">TXT</div>
                            </div>
                            <div>
                              <div className="text-xs text-sky-700">Nome/Host</div>
                              <div className="font-mono text-xs">{railwayTxtHost}</div>
                            </div>
                            <div>
                              <div className="text-xs text-sky-700">Valor</div>
                              <div className="font-mono text-xs break-all">{railwayTxtValue}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[220px]">
                  <Button
                    onClick={() => dnsMutation.mutate()}
                    disabled={dnsMutation.isPending}
                    className="rounded-full bg-navy text-navy-foreground hover:bg-navy/90"
                  >
                    {dnsMutation.isPending && <LoaderCircle className="h-4 w-4 mr-1.5 animate-spin" />}
                    {currentDomain.status === "failed" ? "Verificar DNS novamente" : "Verificar DNS agora"}
                  </Button>
                  {canRefreshStatus && (
                    <Button
                      onClick={() => refreshStatusMutation.mutate()}
                      disabled={refreshStatusMutation.isPending}
                      variant="outline"
                      className="rounded-full"
                    >
                      {refreshStatusMutation.isPending && (
                        <LoaderCircle className="h-4 w-4 mr-1.5 animate-spin" />
                      )}
                      Atualizar status
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => removeMutation.mutate()}
                    disabled={removeMutation.isPending}
                    className="rounded-full"
                  >
                    {removeMutation.isPending ? (
                      <LoaderCircle className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1.5" />
                    )}
                    Remover domínio
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Nenhum domínio próprio cadastrado ainda.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function getStatusMeta(status?: string | null) {
  if (status === "active") {
    return {
      label: "Ativo",
      badgeClass: "bg-emerald/10 text-emerald hover:bg-emerald/10",
      description: "Seu domínio já está ativo e pronto para uso na vitrine pública.",
    };
  }

  if (status === "pending_ssl") {
    return {
      label: "Aguardando SSL",
      badgeClass: "bg-sky-100 text-sky-800 hover:bg-sky-100",
      description: "Seu domínio já foi cadastrado e agora estamos aguardando a emissão do certificado SSL.",
    };
  }

  if (status === "provisioning_railway") {
    return {
      label: "Provisionando",
      badgeClass: "bg-sky-100 text-sky-800 hover:bg-sky-100",
      description: "Estamos cadastrando seu domínio na infraestrutura do LeadLink.",
    };
  }

  if (status === "dns_verified") {
    return {
      label: "DNS validado",
      badgeClass: "bg-sky-100 text-sky-800 hover:bg-sky-100",
      description: "O DNS foi validado e o sistema está preparando o domínio na Railway.",
    };
  }

  if (status === "failed") {
    return {
      label: "Falhou",
      badgeClass: "bg-amber-100 text-amber-800 hover:bg-amber-100",
      description: "Ainda há um ajuste pendente antes da ativação completa do domínio.",
    };
  }

  if (status === "removed") {
    return {
      label: "Removido",
      badgeClass: "bg-slate-100 text-slate-800 hover:bg-slate-100",
      description: "Este domínio foi removido e não está mais em uso.",
    };
  }

  return {
    label: "Pendente DNS",
    badgeClass: "bg-slate-100 text-slate-800 hover:bg-slate-100",
    description: "Configure o CNAME abaixo e depois rode a verificação.",
  };
}

function availabilityStatusLabel(status: "invalid_format" | "likely_available" | "likely_taken") {
  if (status === "likely_available") return "Provavelmente disponível";
  if (status === "likely_taken") return "Provavelmente em uso";
  return "Formato inválido";
}

function availabilityBadgeClass(status: "invalid_format" | "likely_available" | "likely_taken") {
  if (status === "likely_available") return "bg-emerald/10 text-emerald hover:bg-emerald/10";
  if (status === "likely_taken") return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  return "bg-rose-100 text-rose-800 hover:bg-rose-100";
}

function formatRailwayRecordStatus(status?: string | null) {
  if (status === "VALID") return "Válido";
  if (status === "INVALID") return "Inválido";
  if (status === "PENDING") return "Pendente";
  return status || "-";
}

function getRailwayRecordKey(record: RailwayDnsRecord, index: number) {
  return `${record.recordType || "record"}-${record.fqdn || record.hostlabel || index}-${index}`;
}

function BuyLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
