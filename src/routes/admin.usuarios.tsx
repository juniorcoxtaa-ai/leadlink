import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Shield,
  ExternalLink,
  Ban,
  CheckCircle2,
  CreditCard,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminOverridePlan,
  blockUser,
  cancelUserSubscription,
  getAdminUsers,
  unblockUser,
} from "@/server-fns/admin";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsers,
});

type PlanSlug = "free" | "pro" | "comercial_ia";

const PLAN_LABEL: Record<PlanSlug, { label: string; cls: string }> = {
  free: { label: "Free", cls: "bg-secondary text-foreground" },
  pro: { label: "Pro", cls: "bg-navy text-navy-foreground" },
  comercial_ia: { label: "Comercial IA", cls: "bg-gold text-navy" },
};

function AdminUsers() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", { q, planFilter, statusFilter, page }],
    queryFn: () =>
      getAdminUsers({ data: { q, plan: planFilter, status: statusFilter, page, pageSize: 50 } }),
  });

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const planMutation = useMutation({
    mutationFn: (vars: { userId: string; planSlug: PlanSlug }) => adminOverridePlan({ data: vars }),
    onSuccess: () => {
      toast.success("Plano alterado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-platform-metrics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const blockMutation = useMutation({
    mutationFn: (vars: { userId: string; reason: string }) => blockUser({ data: vars }),
    onSuccess: () => {
      toast.success("Usuário bloqueado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-platform-metrics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => unblockUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário desbloqueado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-platform-metrics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (userId: string) => cancelUserSubscription({ data: { userId } }),
    onSuccess: () => {
      toast.success("Assinatura cancelada");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-platform-metrics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = useMemo(
    () => ({
      total: data?.total ?? 0,
      shown: rows.length,
    }),
    [data, rows.length],
  );

  return (
    <div className="space-y-5 max-w-[1500px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {summary.total} cadastrados · {summary.shown} exibidos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="text-xs border border-border bg-background rounded-md px-2 py-1.5 h-9"
          >
            <option value="all">Todos os planos</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="comercial_ia">Comercial IA</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-border bg-background rounded-md px-2 py-1.5 h-9"
          >
            <option value="all">Todos os status</option>
            <option value="free">Free</option>
            <option value="active">Ativo</option>
            <option value="past_due">Em atraso</option>
            <option value="canceled">Cancelado</option>
          </select>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nome, e-mail ou slug"
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Usuário</th>
                <th className="text-left px-4 py-2.5">Plano</th>
                <th className="text-left px-4 py-2.5">Uso</th>
                <th className="text-left px-4 py-2.5">Financeiro</th>
                <th className="text-left px-4 py-2.5">Bloqueio</th>
                <th className="text-right px-4 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows.map((r) => {
                  const plan = PLAN_LABEL[(r.planSlug as PlanSlug) ?? "free"] ?? PLAN_LABEL.free;
                  return (
                    <tr key={r.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="font-medium flex items-center gap-1.5">
                          {r.name}
                          {r.isBlocked ? <Shield className="h-3 w-3 text-amber-600" /> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.slug || "sem slug"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={plan.cls}>{plan.label}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">{r.planStatus}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>
                          {r.leadsUsed} / {r.capabilities.leadsLimit}
                        </div>
                        <div>
                          {r.propertiesUsed} / {r.capabilities.propertiesLimit}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>
                          {r.planAcquiredAt
                            ? new Date(r.planAcquiredAt).toLocaleDateString("pt-BR")
                            : "—"}
                        </div>
                        <div>
                          {r.planExpiresAt
                            ? new Date(r.planExpiresAt).toLocaleDateString("pt-BR")
                            : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div
                          className={
                            r.isBlocked ? "text-destructive font-medium" : "text-muted-foreground"
                          }
                        >
                          {r.isBlocked ? "Bloqueado" : "Liberado"}
                        </div>
                        <div className="text-muted-foreground">{r.blockedReason || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                            <Link to="/admin/corretores/$userId" params={{ userId: r.id }}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          {r.isBlocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => unblockMutation.mutate(r.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Desbloquear
                            </Button>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-7 px-2">
                                  <Ban className="h-3.5 w-3.5 mr-1" /> Bloquear
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Bloquear usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Confirme a ação para bloquear o acesso principal deste usuário.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      blockMutation.mutate({
                                        userId: r.id,
                                        reason: "Bloqueado pelo admin",
                                      })
                                    }
                                  >
                                    Bloquear
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <select
                            value={r.planSlug}
                            onChange={(e) =>
                              planMutation.mutate({
                                userId: r.id,
                                planSlug: e.target.value as PlanSlug,
                              })
                            }
                            className="text-xs border border-border bg-background rounded-md px-2 py-1 h-7"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="comercial_ia">Comercial IA</option>
                          </select>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => cancelMutation.mutate(r.id)}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setSelected({ id: r.id, name: r.name })}
                          >
                            <UserRound className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6">
                    <EmptyState
                      icon={<Users className="h-5 w-5" />}
                      title="Nenhum usuário encontrado"
                      description="Ajuste a busca ou os filtros para localizar outros usuários."
                      action={<Button variant="outline" onClick={() => { setQ(""); setPlanFilter("all"); setStatusFilter("all"); }}>Limpar filtros</Button>}
                      className="py-8"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Página {page} de {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
