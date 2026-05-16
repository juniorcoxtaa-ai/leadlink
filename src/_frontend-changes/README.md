# Frontend changes — export para Claude

Espelho dos arquivos alterados/criados no projeto. Estrutura idêntica ao
`src/` original — copiar de volta substituindo os arquivos.

> Frontend / visual + hooks de auth no client. Migrations Supabase
> (profiles, user_roles, subscriptions, trigger handle_new_user, backfill)
> **não estão aqui** — foram aplicadas direto no banco via migration tool.

---

## Rodada 1 — Vitrine pública de imóveis
`routes/l.$slug_.vitrine.tsx` (novo) · `routes/l.$slug_.vitrine_.$propertyId.tsx` (novo) · `routes/_app.imoveis.tsx` (editado, botão "Ver vitrine pública")

Sufixos `_` são propositais (TanStack Router) — desnesta da rota `l.$slug`.
URLs públicas: `/l/<slug>/vitrine` e `/l/<slug>/vitrine/<propertyId>`.

**Backend pendente:** ler imóveis por slug (`meu_link_configs.slug` → user_id → `properties`); filtrar status público; substituir WhatsApp/CRECI hardcoded; usar array real de fotos; popular descrição/features/amenities reais.

---

## Rodada 2 — Agenda premium
`routes/_app.agenda.tsx` (reescrita visual) · `components/AppointmentFormDialog.tsx` (novo)

Calendário mensal + lista de compromissos. Form completo: título, lead, imóvel, tipo (visita/reunião/ligação), data, hora, duração, local, notas.

**Backend pendente:** tabela `appointments` (user_id, lead_id, property_id, type, starts_at, duration_min, location, notes, status); RLS por user_id; respeitar limite plano Free = 2 compromissos.

---

## Rodada 3 — Página de planos
`routes/_app.planos.tsx` (novo) · `components/AppSidebar.tsx` (botão "Ver Planos" acima de OPERAÇÃO) · `routes/_app.tsx` (rota)

Free / Pro R$97 / Comercial IA R$197. Limites visuais: Free = link personalizado + 3 imóveis + 2 agendas.

**Backend pendente:** integrar checkout (Stripe/Paddle) e refletir plano em `subscriptions`. Enforcement dos limites no client+server (3 imóveis, 2 agendas).

---

## Rodada 4 — Integrações preparadas
`routes/_app.integracoes.tsx` (reescrita) · `components/IntegrationConnectDialog.tsx` (novo) · `lib/mock-data.ts` (catálogo de integrações)

Catálogo com VivaReal, ZAP, OLX, Chaves na Mão, Google Calendar, WhatsApp Business, Meta Ads, RD Station, etc. Dialog de conexão genérico (API key / OAuth / webhook conforme tipo).

**Backend pendente:** tabela `integrations` (user_id, provider, status, credentials_encrypted, last_sync_at); edge functions por provider para OAuth callback e sync.

---

## Rodada 5 — Auth real + Painel Admin completo
**Auth:** `lib/use-auth.ts` (novo, hook Supabase) · `routes/login.tsx` (signup/signin reais, redirect por role).

**Admin (todos novos):**
`routes/admin.tsx` (layout + sidebar) · `admin.index.tsx` (dashboard: total corretores, MRR, churn, alertas) · `admin.usuarios.tsx` (lista corretores, filtros, busca, upgrade/downgrade) · `admin.corretores.$userId.tsx` (perfil drill-down) · `admin.assinaturas.tsx` · `admin.planos.tsx` (editar preço/limites) · `admin.financeiro.tsx` (faturas, cupons) · `admin.uso.tsx` (métricas por recurso) · `admin.conteudo.tsx` (templates/automações padrão) · `admin.suporte.tsx` (tickets) · `admin.equipe.tsx` (RBAC + auditoria) · `admin.configuracoes.tsx` (branding, trial, limites globais).

**Migrations já aplicadas no banco (replicar no destino):**
- enum `app_role` ('admin','moderator','user'); tabela `user_roles` (user_id, role, unique) com RLS.
- função `public.has_role(_user_id uuid, _role app_role)` SECURITY DEFINER.
- tabela `profiles` (user_id, full_name, email, phone) e tabela `subscriptions` (user_id, plan enum free/pro/comercial_ia, status, amount_cents, current_period_end).
- trigger `handle_new_user` em `auth.users` → cria profile + role 'user' + subscription free 30 dias.
- backfill: profiles, user_roles e subscriptions para usuários pré-trigger.

**Admin de teste:** `admin@leadlink.com.br` / `Admin@Leadlink2026` (role admin no `user_roles`).

**Backend pendente:** integrar pagamentos reais nos cards admin; popular tickets/auditoria de tabelas reais (hoje muitos painéis usam mock para UI); persistir edições de planos/limites em tabela `plans`.
