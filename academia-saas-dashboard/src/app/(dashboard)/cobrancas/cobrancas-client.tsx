"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Send,
  Check,
  X,
  Phone,
  Zap,
  ImageIcon,
  Bell,
  Maximize2,
} from "lucide-react";

import {
  confirmarPagamento,
  cancelarCobranca,
  gerarCobrancasVencimento,
  marcarCobrancaVencida,
  enviarCobrancaWhatsapp,
  validarComprovante,
  rejeitarComprovante,
  registrarPagamentoDinheiro,
} from "@/actions/cobrancas.actions";

type Aluno = { id: string; nome: string; telefone: string };
type Plano = { id: string; nome: string; valorCents: number };
type Matricula = { id: string; plano: Plano } | null;

type Cobranca = {
  id: string;
  status: string;
  valorCents: number;
  dataVencimento: Date;
  dataPagamento: Date | null;
  descricao: string | null;
  pixChave: string | null;
  enviadaWhatsapp: boolean;
  comprovanteUrl: string | null;
  comprovanteEnviadoEm: Date | null;
  aluno: Aluno;
  matricula: Matricula;
};

type ResumoItem = {
  status: string;
  _count: number;
  _sum: { valorCents: number | null };
};

type Props = {
  tenantId: string;
  cobrancas: Cobranca[];
  resumo: ResumoItem[];
  receitaMesCents: number;
  diasAntecedencia: number;
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  PENDENTE: { label: "Pendente", color: "text-amber-400", bg: "bg-amber-500/15", icon: Clock },
  PAGO: { label: "Pago", color: "text-emerald-400", bg: "bg-emerald-500/15", icon: CheckCircle },
  VENCIDO: { label: "Vencido", color: "text-red-400", bg: "bg-red-500/15", icon: AlertCircle },
  CANCELADA: { label: "Cancelada", color: "text-slate-400", bg: "bg-slate-500/15", icon: XCircle },
  AGUARDANDO_VALIDACAO: {
    label: "Aguardando validação",
    color: "text-sky-400",
    bg: "bg-sky-500/15",
    icon: ImageIcon,
  },
};

function ResumoCard({
  label,
  valor,
  count,
  color,
  icon: Icon,
}: {
  label: string;
  valor: number;
  count: number;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{formatCents(valor)}</p>
          <p className="mt-0.5 text-xs text-muted">{count} cobrança{count !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-line bg-white/5 p-2.5">
          <Icon size={17} className={color} />
        </div>
      </div>
    </div>
  );
}

// ─── Modal confirmar pagamento ────────────────────────────────────────────────

function ModalConfirmarPagamento({
  cobranca,
  onClose,
}: {
  cobranca: Cobranca;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleConfirmar() {
    setErro(null);
    startTransition(async () => {
      try {
        await confirmarPagamento(cobranca.id);
        onClose();
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao confirmar pagamento.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Confirmar pagamento</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-muted">
            Confirmar recebimento via Pix de{" "}
            <span className="font-semibold text-white">{formatCents(cobranca.valorCents)}</span> do aluno{" "}
            <span className="font-semibold text-white">{cobranca.aluno.nome}</span>?
          </p>

          {cobranca.descricao && (
            <p className="text-xs text-muted">Ref: {cobranca.descricao}</p>
          )}

          <div className="rounded-xl border border-line/50 bg-white/[0.02] px-4 py-3 text-xs text-muted">
            Ao confirmar, o status do aluno será atualizado para <strong className="text-white">Ativo</strong>{" "}
            e a matrícula será renovada automaticamente.
          </div>
        </div>

        {erro && <p className="px-5 pb-2 text-xs text-red-400">{erro}</p>}

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirmar}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            <Check size={14} />
            {pending ? "Confirmando..." : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal pagamento em dinheiro ─────────────────────────────────────────────

function ModalPagamentoDinheiro({
  cobranca,
  onClose,
}: {
  cobranca: Cobranca;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleConfirmar() {
    setErro(null);
    startTransition(async () => {
      try {
        await registrarPagamentoDinheiro(cobranca.id);
        onClose();
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao registrar pagamento.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Pagamento em dinheiro</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-muted">
            Registrar recebimento em dinheiro de{" "}
            <span className="font-semibold text-white">{formatCents(cobranca.valorCents)}</span> do aluno{" "}
            <span className="font-semibold text-white">{cobranca.aluno.nome}</span>?
          </p>

          {cobranca.descricao && <p className="text-xs text-muted">Ref: {cobranca.descricao}</p>}

          <div className="rounded-xl border border-line/50 bg-white/[0.02] px-4 py-3 text-xs text-muted">
            Um <strong className="text-white">recibo</strong> será gerado e enviado automaticamente
            ao aluno via <strong className="text-white">WhatsApp</strong>. A matrícula será renovada.
          </div>
        </div>

        {erro && <p className="px-5 pb-2 text-xs text-red-400">{erro}</p>}

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirmar}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Check size={14} />
            {pending ? "Registrando..." : "Confirmar e enviar recibo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal validar comprovante ────────────────────────────────────────────────

function ModalComprovante({
  cobranca,
  onClose,
}: {
  cobranca: Cobranca;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [acao, setAcao] = useState<"confirmar" | "rejeitar" | null>(null);
  const [lightbox, setLightbox] = useState(false);

  function handleConfirmar() {
    setAcao("confirmar");
    startTransition(async () => {
      await validarComprovante(cobranca.id);
      onClose();
    });
  }

  function handleRejeitar() {
    if (!confirm(`Rejeitar o comprovante de ${cobranca.aluno.nome}? O aluno será avisado pelo WhatsApp para reenviar.`)) return;
    setAcao("rejeitar");
    startTransition(async () => {
      await rejeitarComprovante(cobranca.id);
      onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Validar comprovante</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-white">{cobranca.aluno.nome}</span> enviou um comprovante de{" "}
              <span className="font-semibold text-white">{formatCents(cobranca.valorCents)}</span>
              {cobranca.comprovanteEnviadoEm && (
                <> em {new Date(cobranca.comprovanteEnviadoEm).toLocaleString("pt-BR")}</>
              )}
              .
            </p>

            {cobranca.comprovanteUrl ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cobranca.comprovanteUrl}
                  alt="Comprovante de pagamento"
                  onClick={() => setLightbox(true)}
                  className="max-h-80 w-full cursor-zoom-in rounded-xl border border-line object-contain bg-black/20 transition hover:brightness-110"
                />
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <Maximize2 size={10} />
                  Ampliar
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-line/50 bg-white/[0.02] px-4 py-6 text-center text-xs text-muted">
                Comprovante sem imagem disponível.
              </div>
            )}

            <div className="rounded-xl border border-line/50 bg-sky-500/5 px-4 py-3 text-xs text-muted">
              Confirme apenas após checar o recebimento na conta. Ao confirmar, o aluno é marcado como{" "}
              <strong className="text-white">Ativo</strong> e a matrícula é renovada.
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <button
              type="button"
              disabled={pending}
              onClick={handleRejeitar}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              <X size={14} />
              {pending && acao === "rejeitar" ? "Rejeitando..." : "Rejeitar"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleConfirmar}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
            >
              <Check size={14} />
              {pending && acao === "confirmar" ? "Confirmando..." : "Confirmar pagamento"}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && cobranca.comprovanteUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cobranca.comprovanteUrl}
            alt="Comprovante ampliado"
            className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-white/50">
            Clique fora para fechar
          </p>
        </div>
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CobrancasPageClient({
  tenantId,
  cobrancas,
  resumo,
  receitaMesCents,
  diasAntecedencia,
}: Props) {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [cobrancaConfirmando, setCobrancaConfirmando] = useState<Cobranca | null>(null);
  const [cobrancaValidando, setCobrancaValidando] = useState<Cobranca | null>(null);
  const [cobrancaDinheiro, setCobrancaDinheiro] = useState<Cobranca | null>(null);
  const [pending, startTransition] = useTransition();
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  const comprovantesPendentes = cobrancas.filter((c) => c.status === "AGUARDANDO_VALIDACAO");

  const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? "http://localhost:8000";

  // ── Disparo em lote ──────────────────────────────────────────────────────
  type Progresso = {
    total: number; sent: number; failed: number;
    status: string; fila_restante: number; daily_count: number;
  };
  const [loteAtivo, setLoteAtivo] = useState(false);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pararPolling() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }

  useEffect(() => () => pararPolling(), []);

  async function buscarProgresso(tenantId: string) {
    try {
      const r = await fetch(`${BOT_URL}/api/cobrancas/progresso/${tenantId}`);
      if (!r.ok) return;
      const d: Progresso = await r.json();
      setProgresso(d);
      if (d.status === "concluido" || d.fila_restante === 0 && d.sent + d.failed >= d.total && d.total > 0) {
        pararPolling();
        setLoteAtivo(false);
      }
    } catch { /* silencioso */ }
  }

  async function handleDispararLote() {
    const pendentesNaoEnviadas = cobrancas.filter(
      (c) => (c.status === "PENDENTE" || c.status === "VENCIDO") && !c.enviadaWhatsapp
    );
    if (pendentesNaoEnviadas.length === 0) {
      alert("Nenhuma cobrança pendente para disparar.");
      return;
    }
    if (!confirm(`Disparar ${pendentesNaoEnviadas.length} cobranças via WhatsApp em lote?\n\nAs mensagens serão enviadas com intervalo de 45–90s entre cada uma para proteger o número.`)) return;

    try {
      const r = await fetch(`${BOT_URL}/api/cobrancas/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, cobranca_ids: pendentesNaoEnviadas.map((c) => c.id) }),
      });
      if (!r.ok) throw new Error("Erro ao enfileirar cobranças.");
      setLoteAtivo(true);
      setProgresso({ total: pendentesNaoEnviadas.length, sent: 0, failed: 0, status: "aguardando", fila_restante: pendentesNaoEnviadas.length, daily_count: 0 });
      pollingRef.current = setInterval(() => buscarProgresso(tenantId), 5000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao iniciar disparo.");
    }
  }

  const getResumoByStatus = (status: string) =>
    resumo.find((r) => r.status === status) ?? { _count: 0, _sum: { valorCents: 0 } };

  const pendentes = getResumoByStatus("PENDENTE");
  const vencidas = getResumoByStatus("VENCIDO");

  const cobrancasFiltradas = cobrancas.filter(
    (c) => filtroStatus === "todos" || c.status === filtroStatus
  );

  function handleGerarCobrancas() {
    startTransition(async () => {
      try {
        const result = await gerarCobrancasVencimento(diasAntecedencia);
        alert(`${result.geradas} cobrança(s) gerada(s) automaticamente.`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao gerar cobranças.");
      }
    });
  }

  function handleCancelar(id: string) {
    startTransition(async () => {
      try {
        await cancelarCobranca(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao cancelar cobrança.");
      }
    });
  }

  function handleMarcarVencida(id: string) {
    startTransition(async () => {
      try {
        await marcarCobrancaVencida(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao marcar cobrança como vencida.");
      }
    });
  }

  function handleEnviarWhatsapp(id: string) {
    setEnviandoId(id);
    startTransition(async () => {
      try {
        await enviarCobrancaWhatsapp(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
      } finally {
        setEnviandoId(null);
      }
    });
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Cobranças</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGerarCobrancas}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/30 hover:bg-brand/10 hover:text-brand disabled:opacity-50"
          >
            <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
            Gerar cobranças
          </button>
          <button
            type="button"
            onClick={handleDispararLote}
            disabled={loteAtivo}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
          >
            <Zap size={14} className={loteAtivo ? "animate-pulse" : ""} />
            {loteAtivo ? "Disparando..." : "Disparar lote"}
          </button>
        </div>
      </div>

      {/* Notificação de comprovantes pendentes de validação */}
      {comprovantesPendentes.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <Bell size={16} />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                {comprovantesPendentes.length}
              </span>
            </span>
            <p className="text-sm text-white">
              <strong>{comprovantesPendentes.length}</strong> comprovante
              {comprovantesPendentes.length !== 1 ? "s" : ""} aguardando validação manual.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFiltroStatus("AGUARDANDO_VALIDACAO")}
            className="shrink-0 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/20"
          >
            Ver comprovantes
          </button>
        </div>
      )}

      {/* Barra de progresso do disparo em lote */}
      {progresso && (
        <div className="rounded-2xl border border-line bg-surface/60 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white flex items-center gap-1.5">
              <Zap size={12} className="text-brand" />
              Disparo em lote
            </span>
            <span className={`font-medium ${
              progresso.status === "concluido" ? "text-emerald-400" :
              progresso.status === "enviando" ? "text-amber-400" : "text-muted"
            }`}>
              {progresso.status === "concluido" ? "Concluído ✓" :
               progresso.status === "enviando" ? "Enviando..." : "Na fila..."}
            </span>
          </div>

          {/* Barra */}
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-700"
              style={{ width: progresso.total > 0 ? `${Math.round((progresso.sent / progresso.total) * 100)}%` : "0%" }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              <strong className="text-white">{progresso.sent}</strong> enviadas ·{" "}
              {progresso.failed > 0 && <><strong className="text-red-400">{progresso.failed}</strong> falhas · </>}
              <strong className="text-white">{progresso.total}</strong> total
            </span>
            <span>
              {progresso.fila_restante > 0 && (
                <span className="text-amber-400">{progresso.fila_restante} na fila</span>
              )}
              {progresso.daily_count > 0 && (
                <span className="ml-2 text-muted">{progresso.daily_count} enviadas hoje</span>
              )}
            </span>
          </div>

          {progresso.fila_restante > 0 && (
            <p className="text-[11px] text-muted">
              ⏱ Aguardando 45–90s entre mensagens para proteger o número.
            </p>
          )}
        </div>
      )}

      {/* Info antecedência */}
      <div className="rounded-xl border border-line/50 bg-white/[0.02] px-4 py-3 text-xs text-muted">
        Cobranças serão geradas automaticamente para matrículas que vencem nos próximos{" "}
        <strong className="text-white">{diasAntecedencia} dias</strong>. Configure em{" "}
        <a href="/configuracoes" className="text-brand hover:underline">
          Configurações
        </a>
        .
      </div>

      {/* Cards resumo */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ResumoCard
          label="Receita do mês"
          valor={receitaMesCents}
          count={getResumoByStatus("PAGO")._count}
          color="text-brand"
          icon={CheckCircle}
        />
        <ResumoCard
          label="Pendente"
          valor={pendentes._sum.valorCents ?? 0}
          count={pendentes._count}
          color="text-amber-400"
          icon={Clock}
        />
        <ResumoCard
          label="Vencido"
          valor={vencidas._sum.valorCents ?? 0}
          count={vencidas._count}
          color="text-red-400"
          icon={AlertCircle}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "todos", label: "Todas" },
          { key: "PENDENTE", label: "Pendentes" },
          { key: "VENCIDO", label: "Vencidas" },
          { key: "AGUARDANDO_VALIDACAO", label: `Comprovantes${comprovantesPendentes.length > 0 ? ` (${comprovantesPendentes.length})` : ""}` },
          { key: "PAGO", label: "Pagas" },
          { key: "CANCELADA", label: "Canceladas" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFiltroStatus(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filtroStatus === key
                ? "bg-brand text-white"
                : "border border-line bg-surface/60 text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cobrancasFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-10 text-center">
          <Wallet size={32} className="mx-auto mb-3 text-muted/50" />
          <p className="text-sm text-muted">Nenhuma cobrança encontrada.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
          <div className="divide-y divide-line/30">
            {cobrancasFiltradas.map((c) => {
              const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.PENDENTE;
              const vencida = c.status === "VENCIDO";
              const pendente = c.status === "PENDENTE";
              const aguardandoValidacao = c.status === "AGUARDANDO_VALIDACAO";

              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{c.aluno.nome}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.bg} ${st.color}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Phone size={10} />
                        {c.aluno.telefone}
                      </span>
                      {c.descricao && <span>{c.descricao}</span>}
                      <span>
                        Venc.{" "}
                        {new Date(c.dataVencimento).toLocaleDateString("pt-BR")}
                      </span>
                      {c.dataPagamento && (
                        <span className="text-emerald-400">
                          Pago em {new Date(c.dataPagamento).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valor + ações */}
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`text-base font-semibold tabular-nums ${st.color}`}>
                      {formatCents(c.valorCents)}
                    </span>

                    {aguardandoValidacao && (
                      <div className="flex items-center gap-2">
                        {c.comprovanteUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.comprovanteUrl}
                            alt="Comprovante"
                            title="Clique para validar"
                            onClick={() => setCobrancaValidando(c)}
                            className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-sky-500/30 object-cover transition hover:border-sky-400/60 hover:brightness-110"
                          />
                        )}
                        <button
                          type="button"
                          title="Ver comprovante e validar"
                          onClick={() => setCobrancaValidando(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600/20 px-3 py-1.5 text-xs font-medium text-sky-400 transition hover:bg-sky-600/30"
                        >
                          <ImageIcon size={12} />
                          Validar
                        </button>
                      </div>
                    )}

                    {(pendente || vencida) && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          title="Confirmar pagamento Pix"
                          onClick={() => setCobrancaConfirmando(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand/20"
                        >
                          <Check size={12} />
                          Pix recebido
                        </button>

                        <button
                          type="button"
                          title="Registrar pagamento em dinheiro e enviar recibo"
                          onClick={() => setCobrancaDinheiro(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-600/20"
                        >
                          <Wallet size={12} />
                          Dinheiro
                        </button>

                        <button
                          type="button"
                          title="Enviar cobrança via WhatsApp"
                          disabled={enviandoId === c.id && pending}
                          onClick={() => handleEnviarWhatsapp(c.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            c.enviadaWhatsapp
                              ? "border-brand/20 bg-brand/5 text-brand"
                              : "border-line text-muted hover:border-brand/30 hover:text-brand"
                          }`}
                        >
                          <Send size={12} />
                          {enviandoId === c.id && pending
                            ? "Enviando..."
                            : c.enviadaWhatsapp
                            ? "Reenviar"
                            : "Enviar"}
                        </button>

                        {pendente && (
                          <button
                            type="button"
                            title="Marcar como vencida"
                            onClick={() => handleMarcarVencida(c.id)}
                            className="rounded-lg border border-line p-1.5 text-muted transition hover:border-red-500/30 hover:text-red-400"
                          >
                            <AlertCircle size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cobrancaConfirmando && (
        <ModalConfirmarPagamento
          cobranca={cobrancaConfirmando}
          onClose={() => setCobrancaConfirmando(null)}
        />
      )}

      {cobrancaValidando && (
        <ModalComprovante
          cobranca={cobrancaValidando}
          onClose={() => setCobrancaValidando(null)}
        />
      )}

      {cobrancaDinheiro && (
        <ModalPagamentoDinheiro
          cobranca={cobrancaDinheiro}
          onClose={() => setCobrancaDinheiro(null)}
        />
      )}
    </section>
  );
}
