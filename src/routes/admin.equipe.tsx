import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCog, Plus, Shield, Activity } from "lucide-react";
import { loadAdminLogs, loadAdminTeam, pushAdminLog, saveAdminTeam } from "@/lib/admin-platform-store";

export const Route = createFileRoute("/admin/equipe")({
  component: AdminTeam,
});

const MOCK_LOGS = [
  { who: "admin@leadlink.com.br", action: "Atualizou plano de Mariana Silva para Pro", at: "2026-05-13 09:42" },
  { who: "admin@leadlink.com.br", action: "Marcou ticket T-1041 como em atendimento", at: "2026-05-12 17:21" },
  { who: "admin@leadlink.com.br", action: "Criou cupom BLACK2026", at: "2026-05-12 14:08" },
  { who: "admin@leadlink.com.br", action: "Alterou limite de Imóveis no plano Free para 3", at: "2026-05-11 10:15" },
];

const ROLES = [
  { id: "owner", label: "Owner", desc: "Acesso total, inclusive faturamento e configurações" },
  { id: "admin", label: "Administrador", desc: "Gestão de corretores, planos e suporte" },
  { id: "support", label: "Suporte", desc: "Apenas tickets e visualização de corretores" },
  { id: "finance", label: "Financeiro", desc: "Faturas, cobranças e relatórios" },
];

function AdminTeam() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [logs, setLogs] = useState(MOCK_LOGS);

  useEffect(() => {
    const team = loadAdminTeam();
    setAdmins(
      team.map((member, index) => ({
        id: member.user_id,
        full_name: member.role === "owner" ? "Admin Leadlink" : `Membro ${index + 1}`,
        email: `${member.user_id}@leadlink.com.br`,
        created_at: new Date(Date.now() - index * 86400000).toISOString(),
        role: member.role,
      }))
    );
    setLogs(loadAdminLogs().length > 0 ? loadAdminLogs() : MOCK_LOGS);
  }, []);

  useEffect(() => {
    saveAdminTeam(admins.map((admin) => ({ user_id: admin.id, role: admin.role || "admin" })));
  }, [admins]);

  const addMockMember = () => {
    const next = {
      id: `admin-${Date.now()}`,
      full_name: "Novo membro",
      email: `novo-${Date.now()}@leadlink.com.br`,
      created_at: new Date().toISOString(),
      role: "admin",
    };
    const updated = [next, ...admins];
    setAdmins(updated);
    const nextLogs = pushAdminLog({
      who: "admin@leadlink.com.br",
      action: `Adicionou ${next.full_name} à equipe interna`,
      at: new Date().toLocaleString("pt-BR"),
    });
    setLogs(nextLogs);
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Equipe interna</h1>
          <p className="text-sm text-muted-foreground">Usuários administradores, papéis e auditoria.</p>
        </div>
        <Button size="sm" onClick={addMockMember}><Plus className="h-3.5 w-3.5 mr-1.5" /> Convidar membro</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-1.5"><UserCog className="h-4 w-4" /> Membros admin</h3>
          <Badge variant="outline">{admins.length}</Badge>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-2">Usuário</th>
              <th className="text-left px-5 py-2">Papel</th>
              <th className="text-left px-5 py-2">Adicionado em</th>
              <th className="text-right px-5 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map(a => (
              <tr key={a.id} className="hover:bg-secondary/30">
                <td className="px-5 py-3">
                  <div className="font-medium flex items-center gap-1.5">{a.full_name || "—"} <Shield className="h-3 w-3 text-gold" /></div>
                  <div className="text-xs text-muted-foreground">{a.email}</div>
                </td>
                <td className="px-5 py-3"><Badge className="bg-navy text-navy-foreground">Owner</Badge></td>
                <td className="px-5 py-3"><Badge variant="outline">{a.role || "admin"}</Badge></td>
                <td className="px-5 py-3 text-xs">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost">Editar</Button></td>
              </tr>
            ))}
            {admins.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum admin configurado.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Papéis e permissões</h3>
        <div className="grid md:grid-cols-2 gap-2">
          {ROLES.map(r => (
            <div key={r.id} className="p-3 rounded-md border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{r.label}</span>
                <Badge variant="outline" className="text-[10px]">{r.id}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{r.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Activity className="h-4 w-4" /> Logs de auditoria</h3>
        <div className="divide-y divide-border">
          {logs.map((l, i) => (
            <div key={i} className="py-2.5 text-sm flex items-center justify-between">
              <div>
                <div>{l.action}</div>
                <div className="text-xs text-muted-foreground">{l.who}</div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">{l.at}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
