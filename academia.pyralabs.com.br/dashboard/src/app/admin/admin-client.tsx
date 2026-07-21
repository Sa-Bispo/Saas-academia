"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Plus,
  Search,
  Shield,
  Store,
  Trash2,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";
import {
  type AdminModuloState,
  type AdminPlanSummary,
  type AdminStats,
  clearImpersonation,
  createTenant,
  deleteTenant,
  getModulosTenant,
  impersonateTenant,
  setModulosTenant,
  toggleTenantAtivo,
  updateTenantFull,
} from "@/actions/admin.actions";

type Props = {
  data: AdminStats;
  plans: AdminPlanSummary[];
  isImpersonating: boolean;
  totalAbertos: number;
  pendingBotCount: number;
  botWsUrl: string;
};

type FilterStatus = "todos" | "ativo" | "inativo" | "vencendo";
type FilterNiche = "todos" | "adega" | "lanchonete" | "pizzaria";

type FeedItem = {
  id: string;
  type: "new_client" | "bot_disconnected" | "expiring";
  label: string;
  detail: string;
  time: Date | null;
  urgency: number;
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(date: Date | string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

function toInputDate(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isRecent(date: Date | string | null) {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < 24 * 60 * 60 * 1000;
}

function nichePalette(niche: string) {
  if (niche === "adega") return "bg-amber-500/15 text-amber-300 ring-amber-400/30";
  if (niche === "pizzaria") return "bg-red-500/15 text-red-300 ring-red-400/30";
  if (niche === "academia") return "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30";
  return "bg-sky-500/15 text-sky-300 ring-sky-400/30";
}

function statusTone(statusLabel: string) {
  if (statusLabel.startsWith("Vence em")) return "bg-amber-500/15 text-amber-300 ring-amber-400/30";
  if (statusLabel === "Ativo") return "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30";
  return "bg-slate-500/15 text-slate-300 ring-slate-400/30";
}

function botTone(status: string) {
  if (status === "CONNECTED") return { dot: "bg-emerald-400", label: "Conectado" };
  if (status === "CONNECTING") return { dot: "bg-amber-400", label: "Desconectado" };
  return { dot: "bg-red-400", label: "Erro" };
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((item) => item.charAt(0).toUpperCase()).join("");
}

function formatRelative(date: Date | string | null) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `há ${days}d`;
  return `há ${Math.floor(days / 30)}m`;
}

function expiryColor(days: number | null) {
  if (days === null) return "text-muted";
  if (days <= 3) return "text-red-300";
  if (days <= 7) return "text-amber-300";
  return "text-muted";
}

function feedDot(type: FeedItem["type"]) {
  if (type === "new_client") return "bg-brand";
  if (type === "bot_disconnected") return "bg-red-400";
  return "bg-amber-400";
}

export default function AdminClient({ data, plans, isImpersonating, totalAbertos, pendingBotCount, botWsUrl }: Props) {
  const router = useRouter();
  const [botCount, setBotCount] = useState(pendingBotCount);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let retry: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(botWsUrl);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string) as { type: string };
          if (d.type === "confusion_event") setBotCount((n) => n + 1);
        } catch { /* ignora */ }
      };
      ws.onclose = () => { retry = setTimeout(connect, 4000); };
    }

    connect();
    return () => { ws?.close(); clearTimeout(retry); };
  }, [botWsUrl]);

  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState<FilterNiche>("todos");
  const [status, setStatus] = useState<FilterStatus>("todos");
  const [openModal, setOpenModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<{
    id: string;
    nome: string;
    subNicho: "adega" | "lanchonete" | "pizzaria" | "academia";
    plano: string;
    vencimento: string;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<{
    email: string;
    senha: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState<"none" | "creds" | "whatsapp">("none");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [pending, startTransition] = useTransition();

  // ── Modal Módulos ──
  const [modulosTenantId, setModulosTenantId] = useState<string | null>(null);
  const [modulosTenantNome, setModulosTenantNome] = useState("");
  const [modulosState, setModulosState] = useState<AdminModuloState[]>([]);
  const [modulosLoading, setModulosLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    sub_nicho: "adega" as "adega" | "lanchonete" | "pizzaria" | "academia",
    plano: plans[0]?.code ?? "",
    senha: "",
    vencimento: "",
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (copied === "none") return;
    const timer = setTimeout(() => setCopied("none"), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const filtered = useMemo(() => {
    return data.tenants.filter((tenant) => {
      const byText = tenant.nome.toLowerCase().includes(search.toLowerCase());
      const byNiche = niche === "todos" ? true : tenant.subNicho === niche;
      const byStatus =
        status === "todos"
          ? true
          : status === "ativo"
            ? tenant.statusLabel === "Ativo"
            : status === "inativo"
              ? tenant.statusLabel === "Inativo"
              : tenant.statusLabel.startsWith("Vence em");
      return byText && byNiche && byStatus;
    });
  }, [data.tenants, search, niche, status]);

  const alerts = useMemo(() => {
    const disconnected = data.tenants.filter(
      (t) =>
        t.whatsappStatus !== "CONNECTED" &&
        (t.statusLabel === "Ativo" || t.statusLabel.startsWith("Vence em")),
    );
    const expiring = data.tenants.filter(
      (t) => t.daysUntilDue !== null && t.daysUntilDue >= 0 && t.daysUntilDue <= 7,
    );
    return { disconnected, expiring };
  }, [data.tenants]);

  const activityFeed = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [];
    for (const t of data.tenants) {
      const ageDays = (Date.now() - new Date(t.createdAt).getTime()) / 864e5;
      if (ageDays <= 30) {
        items.push({ id: `new-${t.id}`, type: "new_client", label: "Novo cliente", detail: t.nome, time: t.createdAt, urgency: 0 });
      }
      if (t.whatsappStatus !== "CONNECTED" && (t.statusLabel === "Ativo" || t.statusLabel.startsWith("Vence em"))) {
        items.push({ id: `bot-${t.id}`, type: "bot_disconnected", label: "Bot offline", detail: t.nome, time: null, urgency: 2 });
      }
      if (t.daysUntilDue !== null && t.daysUntilDue >= 0 && t.daysUntilDue <= 7) {
        items.push({ id: `exp-${t.id}`, type: "expiring", label: `Vence em ${t.daysUntilDue}d`, detail: t.nome, time: t.dueDate, urgency: t.daysUntilDue <= 2 ? 3 : 1 });
      }
    }
    return items.sort((a, b) => b.urgency - a.urgency);
  }, [data.tenants]);

  function showFeedback(message: string) {
    setFeedback(message);
    router.refresh();
  }

  async function onOpenModulos(tenantId: string, nome: string) {
    setModulosTenantId(tenantId);
    setModulosTenantNome(nome);
    setModulosLoading(true);
    try {
      const modulos = await getModulosTenant(tenantId);
      setModulosState(modulos);
    } catch {
      setFeedback("Erro ao carregar módulos.");
    } finally {
      setModulosLoading(false);
    }
  }

  function onToggleModulo(chave: string) {
    if (chave === "alunos") return; // sempre ativo
    setModulosState((prev) =>
      prev.map((m) => (m.chave === chave ? { ...m, ativo: !m.ativo } : m)),
    );
  }

  function onSaveModulos() {
    if (!modulosTenantId) return;
    startTransition(async () => {
      try {
        await setModulosTenant(modulosTenantId, modulosState.map((m) => ({ chave: m.chave, ativo: m.ativo })));
        setModulosTenantId(null);
        showFeedback("Módulos atualizados.");
      } catch {
        setFeedback("Erro ao salvar módulos.");
      }
    });
  }

  function updateFormData(patch: Partial<typeof formData>) {
    setModalError(null);
    setFormData((prev) => ({ ...prev, ...patch }));
  }

  function setVencimento(value: string) {
    updateFormData({ vencimento: value });
  }

  function closeCreateModal() {
    setOpenModal(false);
    setModalError(null);
  }

  function onCreateTenant() {
    setModalError(null);
    startTransition(async () => {
      try {
        const result = await createTenant({ ...formData, vencimento: formData.vencimento });
        setOpenModal(false);
        setModalError(null);
        setCredenciais({ email: result.email, senha: result.senhaTemp, url: result.url });
        setFormData({ nome: "", email: "", sub_nicho: "academia", plano: plans[0]?.code ?? "", senha: "", vencimento: "" });
        showFeedback("✓ Cliente criado com sucesso.");
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "Erro ao criar cliente. Tente novamente.");
      }
    });
  }

  function onSaveTenantFull() {
    if (!editingTenant) return;
    startTransition(async () => {
      try {
        const result = await updateTenantFull({
          tenantId: editingTenant.id,
          nome: editingTenant.nome,
          sub_nicho: editingTenant.subNicho,
          plano: editingTenant.plano,
          vencimento: editingTenant.vencimento,
        });
        setEditingTenant(null);
        showFeedback(`${editingTenant.nome} atualizado — plano ${result.planName}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro ao atualizar cliente.");
      }
    });
  }

  function onToggleTenant(tenantId: string, isActive: boolean) {
    startTransition(async () => {
      try {
        await toggleTenantAtivo(tenantId, !isActive);
        showFeedback(!isActive ? "Cliente reativado." : "Cliente bloqueado.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro ao atualizar status.");
      }
    });
  }

  function onDeleteTenant(tenantId: string) {
    startTransition(async () => {
      try {
        await deleteTenant(tenantId);
        setDeleteConfirmId(null);
        showFeedback("Cliente removido.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro ao excluir cliente.");
      }
    });
  }

  function onOpenEditTenant(tenant: AdminStats["tenants"][number]) {
    setEditingTenant({
      id: tenant.id,
      nome: tenant.nome,
      subNicho: (tenant.subNicho as "adega" | "lanchonete" | "pizzaria" | "academia") ?? "academia",
      plano: tenant.planCode ?? plans[0]?.code ?? "",
      vencimento: toInputDate(tenant.dueDate),
    });
  }

  function onImpersonate(tenantId: string) {
    startTransition(async () => {
      try {
        const result = await impersonateTenant(tenantId);
        router.push(result.redirectTo);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro ao acessar cliente.");
      }
    });
  }

  function onClearImpersonation() {
    startTransition(async () => {
      try {
        await clearImpersonation();
        showFeedback("Sessão de suporte encerrada.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Erro ao encerrar sessão.");
      }
    });
  }

  async function onSignOut() {
    setIsSigningOut(true);
    setFeedback(null);

    try {
      await fetch("/api/admin-logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch {
      setFeedback("Erro ao deslogar. Tente novamente.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <section className="space-y-6 pb-8">
      <header className="rounded-3xl border border-line bg-surface/70 p-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">PyraLabs</p>
            <h1 className="font-display mt-2 text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
              Operação
            </h1>
            <p className="mt-1 text-sm text-muted">Clientes, bots e receita num relance.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onSignOut()}
              disabled={isSigningOut}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-medium text-muted transition hover:border-red-400/35 hover:text-red-300 disabled:opacity-60"
            >
              {isSigningOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Sair
            </button>

            <Link
              href="/admin/bot-corrections"
              onClick={() => setBotCount(0)}
              className="relative inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/20"
            >
              <Zap size={14} />
              Correções do bot
              {botCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {botCount > 9 ? "9+" : botCount}
                </span>
              )}
            </Link>

            <Link
              href="/admin/suporte"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-medium text-muted transition hover:border-brand/35 hover:text-white"
            >
              💬 Chamados
              {totalAbertos > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {totalAbertos}
                </span>
              )}
            </Link>

            {isImpersonating && (
              <button
                type="button"
                onClick={onClearImpersonation}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-medium text-muted transition hover:border-brand/35 hover:text-white disabled:opacity-60"
              >
                <Shield size={14} />
                Encerrar acesso
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpenModal(true);
                setModalError(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong"
            >
              <Plus size={15} />
              Novo cliente
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Clientes ativos" value={String(data.totalAtivos)} icon={CheckCircle2} />
        <MetricCard title="Bots conectados" value={String(data.botsConectados)} icon={Wifi} />
        <MetricCard title="Pedidos hoje" value={String(data.totalPedidosHoje)} icon={Store} />
        <MetricCard title="MRR estimado" value={BRL.format(data.mrrCents / 100)} icon={Shield} />
      </div>

      {(alerts.disconnected.length > 0 || alerts.expiring.length > 0) && (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <p className="text-sm font-semibold text-amber-300">Atenção necessária</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.disconnected.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {alerts.disconnected.length} bot{alerts.disconnected.length > 1 ? "s" : ""} desconectado
                {alerts.disconnected.length > 1 ? "s" : ""}
              </span>
            )}
            {alerts.expiring.length > 0 && (
              <button
                type="button"
                onClick={() => setStatus("vencendo")}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/15"
              >
                <Clock size={11} />
                {alerts.expiring.length} assinatura{alerts.expiring.length > 1 ? "s" : ""} vencendo em ≤7d
              </button>
            )}
          </div>
          {alerts.disconnected.length > 0 && (
            <p className="mt-2 text-[11px] text-muted/70">
              Offline: {alerts.disconnected.map((t) => t.nome).join(", ")}
            </p>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface/60 p-4 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[1fr_200px_200px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 text-muted" size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome"
              className="h-11 w-full rounded-xl border border-line bg-background/60 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted focus:border-brand/45"
            />
          </label>
          <select
            value={niche}
            onChange={(event) => setNiche(event.target.value as FilterNiche)}
            className="h-11 rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
          >
            <option value="todos">Todos os nichos</option>
            <option value="academia">Academia</option>
            <option value="adega">Adega</option>
            <option value="lanchonete">Lanchonete</option>
            <option value="pizzaria">Pizzaria</option>
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as FilterStatus)}
            className="h-11 rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="vencendo">Vencendo</option>
          </select>
        </div>
      </section>

      {feedback && (
        <p className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">
          {feedback}
        </p>
      )}

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-muted">
            Nenhum cliente encontrado para os filtros aplicados.
          </div>
        )}

        {filtered.map((tenant) => {
          const bot = botTone(tenant.whatsappStatus);
          const isActive = tenant.statusLabel === "Ativo" || tenant.statusLabel.startsWith("Vence em");
          const recent = isRecent(tenant.createdAt);

          return (
            <article
              key={tenant.id}
              className="grid gap-4 rounded-2xl border border-line bg-surface/60 p-4 backdrop-blur transition hover:border-brand/25 lg:grid-cols-[1.4fr_1fr_1fr_auto]"
            >
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${nichePalette(tenant.subNicho)}`}>
                    <span className="text-sm font-semibold">{initials(tenant.nome)}</span>
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-900 ${bot.dot}`} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{tenant.nome}</h3>
                    {recent && (
                      <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand ring-1 ring-brand/30">
                        Novo
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${nichePalette(tenant.subNicho)}`}>
                      {tenant.subNicho}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{tenant.email}</p>
                  <p className={`mt-1 text-xs font-medium ${expiryColor(tenant.daysUntilDue)}`}>
                    {tenant.planName}
                    {tenant.daysUntilDue !== null
                      ? ` · vence em ${tenant.daysUntilDue}d`
                      : tenant.dueDate
                        ? ` · ${formatDate(tenant.dueDate)}`
                        : ""}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <p className="text-muted">Pedidos hoje</p>
                <p className="font-mono font-bold tabular-nums text-white">{tenant.pedidosHoje}</p>
                <p className="text-muted">Faturamento do dia</p>
                <p className="font-mono font-bold tabular-nums text-white">{BRL.format(tenant.faturamentoHoje)}</p>
              </div>

              <div className="space-y-2 text-sm">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${statusTone(tenant.statusLabel)}`}>
                  {tenant.statusLabel}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className={`h-2 w-2 rounded-full ${bot.dot}`} />
                  Bot {bot.label}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => onOpenEditTenant(tenant)}
                  disabled={pending}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:border-white/25 hover:text-white disabled:opacity-60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onOpenModulos(tenant.id, tenant.nome)}
                  disabled={pending}
                  className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  Módulos
                </button>
                <button
                  type="button"
                  onClick={() => onImpersonate(tenant.id)}
                  disabled={pending}
                  className="rounded-lg border border-brand/35 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand/20 disabled:opacity-60"
                >
                  Acessar
                </button>
                <button
                  type="button"
                  onClick={() => onToggleTenant(tenant.id, isActive)}
                  disabled={pending}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:border-white/25 hover:text-white disabled:opacity-60"
                >
                  {isActive ? "Bloquear" : "Reativar"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(tenant.id)}
                  disabled={pending}
                  className="rounded-lg border border-red-500/35 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/12 disabled:opacity-60"
                >
                  Excluir
                </button>
              </div>
            </article>
          );
        })}
      </div>
        </div>

        <aside>
          <div className="sticky top-6 rounded-2xl border border-line bg-surface/60 p-4 backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <Activity size={14} className="text-muted" />
              <h2 className="text-sm font-semibold text-white">Atividade recente</h2>
            </div>
            {activityFeed.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">Tudo em dia — sem alertas.</p>
            ) : (
              <div className="space-y-3">
                {activityFeed.slice(0, 15).map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${feedDot(item.type)}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">{item.detail}</p>
                      <p className="text-[11px] text-muted">{item.label}</p>
                      {item.time && (
                        <p className="text-[11px] text-muted/50">{formatRelative(item.time)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {pending && (
        <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" />
          Atualizando...
        </div>
      )}

      {/* Modal: Novo cliente */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeCreateModal} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Novo cliente</h2>
                <p className="text-sm text-muted">Cria tenant + lojista + assinatura.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg p-1.5 text-muted transition hover:bg-white/8 hover:text-white"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="grid gap-3">
              <Field label="Nome do negócio">
                <input
                  value={formData.nome}
                  onChange={(e) => updateFormData({ nome: e.target.value })}
                  className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                />
              </Field>

              <Field label="Email do lojista">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                  className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                />
              </Field>

              <Field label="Senha inicial">
                <input
                  type="text"
                  value={formData.senha}
                  onChange={(e) => updateFormData({ senha: e.target.value })}
                  placeholder="Opcional — o sistema gera uma senha automática."
                  className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                />
              </Field>

              <p className="-mt-1 text-xs text-muted">Se informar manualmente, use pelo menos 8 caracteres.</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Sub-nicho">
                  <select
                    value={formData.sub_nicho}
                    onChange={(e) => updateFormData({ sub_nicho: e.target.value as "adega" | "lanchonete" | "pizzaria" | "academia" })}
                    className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                  >
                    <option value="academia">Academia</option>
                    <option value="adega">Adega</option>
                    <option value="lanchonete">Lanchonete</option>
                    <option value="pizzaria">Pizzaria</option>
                  </select>
                </Field>

                <Field label="Plano">
                  <select
                    value={formData.plano}
                    onChange={(e) => updateFormData({ plano: e.target.value })}
                    className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.code}>
                        {plan.name} ({BRL.format(plan.priceCents / 100)})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Data de vencimento">
                <input
                  type="date"
                  value={formData.vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                />
              </Field>

              <div className="-mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setVencimento(addDays(30))}
                  className="rounded-lg border border-line px-3 py-1 text-xs text-muted transition hover:border-brand/35 hover:text-brand"
                >
                  + 30 dias
                </button>
                <button
                  type="button"
                  onClick={() => setVencimento(addDays(90))}
                  className="rounded-lg border border-line px-3 py-1 text-xs text-muted transition hover:border-brand/35 hover:text-brand"
                >
                  + 90 dias
                </button>
              </div>

              {modalError && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {modalError}
                </p>
              )}

              <button
                type="button"
                onClick={onCreateTenant}
                disabled={
                  pending ||
                  !formData.nome ||
                  !formData.email ||
                  !formData.plano ||
                  !formData.vencimento ||
                  (formData.senha.length > 0 && formData.senha.trim().length < 8)
                }
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-60"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Criar cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar cliente */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setEditingTenant(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Editar cliente</h2>
                <p className="text-sm text-muted">Altere nome, nicho, plano e vencimento.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-white/8 hover:text-white"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="grid gap-3">
              <Field label="Nome do negócio">
                <input
                  value={editingTenant.nome}
                  onChange={(e) => setEditingTenant((p) => p ? { ...p, nome: e.target.value } : p)}
                  className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Sub-nicho">
                  <select
                    value={editingTenant.subNicho}
                    onChange={(e) =>
                      setEditingTenant((p) => p ? { ...p, subNicho: e.target.value as "adega" | "lanchonete" | "pizzaria" | "academia" } : p)
                    }
                    className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                  >
                    <option value="academia">Academia</option>
                    <option value="adega">Adega</option>
                    <option value="lanchonete">Lanchonete</option>
                    <option value="pizzaria">Pizzaria</option>
                  </select>
                </Field>

                <Field label="Plano">
                  <select
                    value={editingTenant.plano}
                    onChange={(e) => setEditingTenant((p) => p ? { ...p, plano: e.target.value } : p)}
                    className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.code}>
                        {plan.name} ({BRL.format(plan.priceCents / 100)})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Data de vencimento">
                <input
                  type="date"
                  value={editingTenant.vencimento}
                  onChange={(e) => setEditingTenant((p) => p ? { ...p, vencimento: e.target.value } : p)}
                  className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm outline-none transition focus:border-brand/45"
                />
              </Field>

              <button
                type="button"
                onClick={onSaveTenantFull}
                disabled={pending || !editingTenant.nome || !editingTenant.plano || !editingTenant.vencimento}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-60"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-red-500/30 bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/12">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Excluir cliente?</h2>
                <p className="mt-1 text-sm text-muted">
                  Essa ação remove o tenant, assinatura e todos os dados associados. Não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDeleteTenant(deleteConfirmId)}
                disabled={pending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Sim, excluir
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm text-muted transition hover:border-white/25 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Credenciais */}
      {credenciais && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => {
            setCredenciais(null);
            setCopied("none");
          }} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Cliente criado com sucesso</h2>
                <p className="text-sm text-muted">Copie e envie as credenciais abaixo para o cliente.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCredenciais(null);
                  setCopied("none");
                }}
                className="rounded-lg p-1.5 text-muted transition hover:bg-white/8 hover:text-white"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-line bg-background/60 p-4 text-sm text-white">
              <div className="space-y-2">
                <p><strong>URL:</strong> {credenciais.url}</p>
                <p><strong>Email:</strong> {credenciais.email}</p>
                <p><strong>Senha:</strong> {credenciais.senha}</p>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <span className="text-sm text-amber-400">⚠️</span>
              <p className="text-xs text-amber-300">
                Anote a senha agora — ela não será exibida novamente após fechar esta janela.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `URL: ${credenciais.url}\nEmail: ${credenciais.email}\nSenha: ${credenciais.senha}`,
                  );
                  setCopied("creds");
                  setFeedback("Credenciais copiadas.");
                }}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong"
              >
                {copied === "creds" ? "✓ Copiado!" : "Copiar credenciais"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const mensagemWhatsApp = `Olá! Seu acesso ao Pyra está pronto 🎉\n\n🔗 *Link:* ${credenciais.url}\n📧 *Email:* ${credenciais.email}\n🔑 *Senha:* ${credenciais.senha}\n\nAcesse agora e configure seu cardápio. Qualquer dúvida é só chamar!`;
                  void navigator.clipboard.writeText(mensagemWhatsApp);
                  setCopied("whatsapp");
                  setFeedback("Mensagem para WhatsApp copiada.");
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                {copied === "whatsapp" ? "✓ Copiado!" : "Copiar para WhatsApp"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCredenciais(null);
                  setCopied("none");
                }}
                className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:border-white/25 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Módulos do tenant */}
      {modulosTenantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setModulosTenantId(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Módulos</h2>
                <p className="text-sm text-muted">{modulosTenantNome}</p>
              </div>
              <button
                type="button"
                onClick={() => setModulosTenantId(null)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-white/8 hover:text-white"
              >
                <XCircle size={18} />
              </button>
            </div>

            {modulosLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted" />
              </div>
            ) : (
              <div className="space-y-2">
                {modulosState.map((m) => (
                  <label
                    key={m.chave}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                      m.ativo
                        ? "border-emerald-500/35 bg-emerald-500/10"
                        : "border-line bg-transparent hover:border-white/15"
                    } ${m.chave === "alunos" ? "cursor-default opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={m.ativo || m.chave === "alunos"}
                      disabled={m.chave === "alunos"}
                      onChange={() => onToggleModulo(m.chave)}
                      className="mt-0.5 accent-emerald-400"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {m.nome}
                        {m.chave === "alunos" && (
                          <span className="ml-2 text-[10px] text-muted">sempre ativo</span>
                        )}
                      </p>
                      {m.descricao && (
                        <p className="text-xs text-muted">{m.descricao}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModulosTenantId(null)}
                className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:border-white/25 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSaveModulos}
                disabled={pending || modulosLoading}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {pending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-4 py-3 text-xs text-muted">
        <AlertTriangle size={14} />
        Acesso admin restrito ao e-mail definido em ADMIN_EMAIL.
      </footer>
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <article className="rounded-2xl border border-line bg-surface/60 p-4 backdrop-blur transition hover:border-white/15">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">{title}</p>
        <Icon size={14} className="text-muted" />
      </div>
      <p className="mt-3 font-mono text-[28px] font-bold tracking-tight tabular-nums text-white">
        {value}
      </p>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
