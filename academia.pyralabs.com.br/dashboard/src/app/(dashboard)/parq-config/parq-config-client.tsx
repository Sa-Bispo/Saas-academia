"use client";

import { type Dispatch, type SetStateAction, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Check,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Info,
  Link2,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  arquivarFichaParq,
  excluirPerguntaParq,
  matricularLeadParq,
  reordenarPerguntasParq,
  salvarPerguntaParq,
  togglePerguntaAtiva,
} from "@/actions/parq.actions";
import { PARQ_TERMO_V1 } from "@/lib/parq-termo";
import { TextoInformativo } from "@/lib/parq-texto-informativo";

const ParqPdfButton = dynamic(
  () => import("@/components/parq/parq-pdf-button").then((m) => m.ParqPdfButton),
  { ssr: false, loading: () => <span className="text-xs opacity-40">PDF</span> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Plano = {
  id: string;
  nome: string;
  valorCents: number;
  periodicidade: "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
};

type MatriculaAtiva = {
  dataVencimento: Date;
  plano: { nome: string; periodicidade: string } | null;
};

type Aluno = {
  id: string;
  nome: string;
  telefone: string;
  cpf: string | null;
  status: string;
  matriculas: MatriculaAtiva[];
};

type Ficha = {
  id: string;
  tenantId: string;
  alunoId: string;
  respostas: Record<string, string>;
  precisaLiberacaoMedica: boolean;
  assinaturaUrl: string | null;
  assinaturaBase64: string | null;
  termoHash: string;
  assinanteNome: string;
  assinanteCpf: string;
  ip: string | null;
  userAgent: string | null;
  consentimentoLgpd: boolean;
  arquivado: boolean;
  assinadoEm: Date;
  aluno: Aluno;
};

type Pergunta = {
  id: number;
  ordem: number;
  texto: string;
  tipo: "PERGUNTA" | "TEXTO";
  ativo: boolean;
};

type Props = {
  fichas: Ficha[];
  perguntas: Pergunta[];
  planos: Plano[];
  tenantId: string;
  academiaName: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatData(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
      style={{
        background: active ? "var(--bg-secondary)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}

// ─── Modal Ficha ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ color: "var(--text-secondary)", opacity: 0.6 }}
    >
      {children}
    </p>
  );
}

function ModalFicha({
  ficha,
  perguntaMap,
  onClose,
}: {
  ficha: Ficha;
  perguntaMap: Map<string, string>;
  onClose: () => void;
}) {
  const [auditExpanded, setAuditExpanded] = useState(false);

  const matriculaAtiva = ficha.aluno.matriculas[0] ?? null;
  const jaMatriculado = ficha.aluno.status !== "SEM_MATRICULA";
  const temAlgumSim = Object.values(ficha.respostas).some((r) => r === "S");

  const respostasOrdenadas = Object.entries(ficha.respostas).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-primary)",
          borderColor: "var(--border-color)",
          maxHeight: "92vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start justify-between gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div className="space-y-1">
            <p className="text-base font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
              {ficha.aluno.nome}
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Enviado em {formatData(ficha.assinadoEm)}
            </p>
            {/* Status badge */}
            {jaMatriculado && matriculaAtiva ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                Matriculado · {matriculaAtiva.plano?.nome ?? "Plano"}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 inline-block" />
                Lead · aguardando matrícula
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 shrink-0 mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">
          {/* Medical alert — destaque no topo se houver */}
          {ficha.precisaLiberacaoMedica && (
            <div
              className="flex items-center gap-3 px-5 py-3"
              style={{
                background: "rgba(245,158,11,0.08)",
                borderBottom: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <AlertTriangle size={15} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <p className="text-xs font-medium" style={{ color: "#fbbf24" }}>
                Necessita de liberação médica antes de iniciar atividades físicas
              </p>
            </div>
          )}

          <div className="space-y-5 p-5">
            {/* ── Dados pessoais ── */}
            <div className="space-y-2.5">
              <SectionLabel>Dados pessoais</SectionLabel>
              <div
                className="grid grid-cols-2 gap-px overflow-hidden rounded-xl"
                style={{ border: "1px solid var(--border-color)" }}
              >
                {[
                  { label: "Nome completo", value: ficha.assinanteNome },
                  { label: "CPF", value: formatCpf(ficha.assinanteCpf) },
                  { label: "Telefone", value: ficha.aluno.telefone },
                  { label: "Consentimento LGPD", value: ficha.consentimentoLgpd ? "Aceito" : "Não aceito" },
                ].map(({ label, value }, i) => (
                  <div
                    key={label}
                    className="px-4 py-3"
                    style={{
                      background: "var(--bg-secondary)",
                      borderRight: i % 2 === 0 ? "1px solid var(--border-color)" : undefined,
                    }}
                  >
                    <p className="text-[10px] mb-0.5" style={{ color: "var(--text-secondary)" }}>
                      {label}
                    </p>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Respostas PAR-Q ── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <SectionLabel>Respostas PAR-Q</SectionLabel>
                {temAlgumSim && (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}
                  >
                    {Object.values(ficha.respostas).filter((r) => r === "S").length} sim
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {respostasOrdenadas.map(([perguntaId, resposta], index) => {
                  const isSim = resposta === "S";
                  return (
                    <div
                      key={perguntaId}
                      className="flex items-start gap-3 rounded-xl px-4 py-3"
                      style={{
                        background: isSim ? "rgba(245,158,11,0.06)" : "var(--bg-secondary)",
                        border: `1px solid ${isSim ? "rgba(245,158,11,0.25)" : "var(--border-color)"}`,
                      }}
                    >
                      <span
                        className="mt-0.5 shrink-0 text-[10px] font-bold w-4 text-center"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {index + 1}
                      </span>
                      <p className="flex-1 text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                        {perguntaMap.get(perguntaId) ?? `Pergunta #${perguntaId}`}
                      </p>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                        style={
                          isSim
                            ? { background: "rgba(245,158,11,0.2)", color: "#fbbf24" }
                            : { background: "rgba(52,211,153,0.12)", color: "#34d399" }
                        }
                      >
                        {isSim ? "Sim" : "Não"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Assinatura digital ── */}
            {ficha.assinaturaUrl && (
              <div className="space-y-2.5">
                <SectionLabel>Assinatura digital</SectionLabel>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  <div className="bg-white p-3">
                    <img
                      src={ficha.assinaturaUrl}
                      alt="Assinatura digital"
                      className="h-24 w-full object-contain"
                    />
                  </div>
                  <div
                    className="flex items-center gap-2 px-4 py-2.5"
                    style={{
                      background: "var(--bg-secondary)",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <Check size={11} style={{ color: "#34d399", flexShrink: 0 }} />
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      Assinado por <span style={{ color: "var(--text-primary)" }}>{ficha.assinanteNome}</span>
                      {" · "}{formatCpf(ficha.assinanteCpf)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Auditoria (colapsável) ── */}
            <div>
              <button
                type="button"
                onClick={() => setAuditExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
                style={{ color: "var(--text-secondary)", opacity: 0.5 }}
              >
                <span
                  className="inline-block transition-transform"
                  style={{ transform: auditExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                  ▶
                </span>
                Dados de auditoria
              </button>
              {auditExpanded && (
                <div
                  className="mt-2 rounded-xl px-4 py-3 space-y-1.5 font-mono text-[10px]"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <p><span style={{ opacity: 0.6 }}>IP: </span>{ficha.ip ?? "—"}</p>
                  <p className="break-all"><span style={{ opacity: 0.6 }}>Termo hash: </span>{ficha.termoHash}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Matricular ─────────────────────────────────────────────────────────

const MESES_POR_PERIODICIDADE: Record<string, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

function calcVencimento(inicio: string, periodicidade: string): string {
  const d = new Date(inicio);
  d.setMonth(d.getMonth() + (MESES_POR_PERIODICIDADE[periodicidade] ?? 1));
  return d.toISOString().split("T")[0];
}

function formatMoeda(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ModalMatricular({
  ficha,
  planos,
  onClose,
}: {
  ficha: Ficha;
  planos: Plano[];
  onClose: () => void;
}) {
  const hoje = new Date().toISOString().split("T")[0];
  const [planoId, setPlanoId] = useState(planos[0]?.id ?? "");
  const [dataInicio, setDataInicio] = useState(hoje);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const planoSelecionado = planos.find((p) => p.id === planoId);
  const dataVencimento = planoSelecionado
    ? calcVencimento(dataInicio, planoSelecionado.periodicidade)
    : "";

  function handleSubmit() {
    if (!planoId || !dataInicio) return;
    setErro(null);
    startTransition(async () => {
      try {
        await matricularLeadParq({
          alunoId: ficha.alunoId,
          planoId,
          dataInicio,
          dataVencimento,
        });
        setSucesso(true);
        setTimeout(onClose, 800);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao matricular.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-xl"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border-color)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Matricular aluno
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {ficha.aluno.nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Plan select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Plano
            </label>
            {planos.length === 0 ? (
              <p className="text-sm" style={{ color: "#f87171" }}>
                Nenhum plano ativo cadastrado.{" "}
                <a href="/planos-academia" className="underline">
                  Criar plano
                </a>
              </p>
            ) : (
              <select
                value={planoId}
                onChange={(e) => setPlanoId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              >
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {formatMoeda(p.valorCents)}/{p.periodicidade.toLowerCase()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Data início */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Data de início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Vencimento calculado */}
          {dataVencimento && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Vencimento:{" "}
              <span style={{ color: "var(--text-primary)" }}>
                {new Date(dataVencimento + "T12:00:00").toLocaleDateString("pt-BR")}
              </span>
            </p>
          )}

          {erro && (
            <p className="rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
              {erro}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !planoId || planos.length === 0 || sucesso}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {sucesso ? "Matriculado!" : pending ? "Matriculando…" : "Confirmar matrícula"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl border px-4 py-2.5 text-sm transition-colors"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Fichas ──────────────────────────────────────────────────────────────

type StatusFiltro = "todos" | "matriculado" | "lead";

function FiltroPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active ? "var(--accent)" : "var(--bg-primary)",
        color: active ? "#fff" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border-color)"}`,
      }}
    >
      {children}
    </button>
  );
}

function FichasTab({
  fichas,
  planos,
  perguntas,
  academiaName,
  onVerFicha,
  onMatricular,
}: {
  fichas: Ficha[];
  planos: Plano[];
  perguntas: Pergunta[];
  academiaName: string;
  onVerFicha: (id: string) => void;
  onMatricular: (id: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [apenasLibMedica, setApenasLibMedica] = useState(false);
  const [verArquivados, setVerArquivados] = useState(false);
  const [arquivandoId, setArquivandoId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleArquivar(id: string, arquivado: boolean) {
    setArquivandoId(id);
    startTransition(async () => {
      try {
        await arquivarFichaParq(id, arquivado);
      } finally {
        setArquivandoId(null);
      }
    });
  }

  const totalArquivadas = fichas.filter((f) => f.arquivado).length;

  const fichasFiltradas = fichas.filter((f) => {
    if (f.arquivado !== verArquivados) return false;

    const jaMatriculado = f.aluno.status !== "SEM_MATRICULA";
    if (statusFiltro === "matriculado" && !jaMatriculado) return false;
    if (statusFiltro === "lead" && jaMatriculado) return false;

    if (apenasLibMedica && !f.precisaLiberacaoMedica) return false;

    const termo = busca.trim().toLowerCase();
    if (termo) {
      const termoDigits = termo.replace(/\D/g, "");
      const nomeMatch = f.aluno.nome.toLowerCase().includes(termo);
      const cpfMatch = termoDigits.length > 0 && f.assinanteCpf.replace(/\D/g, "").includes(termoDigits);
      const telMatch = termoDigits.length > 0 && f.aluno.telefone.replace(/\D/g, "").includes(termoDigits);
      if (!nomeMatch && !cpfMatch && !telMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-secondary)" }}
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full rounded-lg border py-2 pl-8 pr-3 text-xs outline-none"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <FiltroPill active={statusFiltro === "todos"} onClick={() => setStatusFiltro("todos")}>
            Todos
          </FiltroPill>
          <FiltroPill active={statusFiltro === "matriculado"} onClick={() => setStatusFiltro("matriculado")}>
            Já matriculados
          </FiltroPill>
          <FiltroPill active={statusFiltro === "lead"} onClick={() => setStatusFiltro("lead")}>
            Leads
          </FiltroPill>
        </div>

        <FiltroPill active={apenasLibMedica} onClick={() => setApenasLibMedica((v) => !v)}>
          <span className="inline-flex items-center gap-1">
            <AlertTriangle size={11} />
            Lib. médica: Sim
          </span>
        </FiltroPill>

        <FiltroPill active={verArquivados} onClick={() => setVerArquivados((v) => !v)}>
          <span className="inline-flex items-center gap-1">
            <Archive size={11} />
            Arquivados
            {totalArquivadas > 0 && ` (${totalArquivadas})`}
          </span>
        </FiltroPill>
      </div>

      {fichasFiltradas.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
          }}
        >
          <ClipboardList
            size={32}
            className="mx-auto mb-3"
            style={{ color: "var(--text-secondary)" }}
          />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {fichas.length === 0
              ? "Nenhuma ficha PAR-Q recebida ainda."
              : verArquivados
                ? "Nenhuma ficha arquivada."
                : "Nenhuma ficha encontrada para os filtros selecionados."}
          </p>
          {fichas.length === 0 && (
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-secondary)", opacity: 0.7 }}
            >
              Compartilhe o link do formulário com seus alunos.
            </p>
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Nome", "CPF", "Telefone", "Data", "Lib. médica", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fichasFiltradas.map((f, i) => (
                <tr
                  key={f.id}
                  style={{
                    borderTop: i > 0 ? "1px solid var(--border-color)" : undefined,
                    opacity: arquivandoId === f.id ? 0.5 : 1,
                  }}
                >
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {f.aluno.nome}
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {formatCpf(f.assinanteCpf)}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {f.aluno.telefone}
                  </td>
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {formatData(f.assinadoEm)}
                  </td>
                  <td className="px-4 py-3">
                    {f.precisaLiberacaoMedica ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}
                      >
                        <AlertTriangle size={10} />
                        Sim
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
                      >
                        Não
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <ParqPdfButton
                        ficha={f}
                        perguntas={perguntas}
                        academiaName={academiaName}
                        termoTexto={PARQ_TERMO_V1}
                      />
                      <button
                        type="button"
                        onClick={() => onVerFicha(f.id)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-colors"
                        style={{
                          borderColor: "var(--border-color)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <FileText size={12} />
                        Ver ficha
                      </button>
                      <button
                        type="button"
                        disabled={arquivandoId === f.id}
                        onClick={() => handleArquivar(f.id, !f.arquivado)}
                        title={f.arquivado ? "Desarquivar" : "Arquivar"}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
                        style={{
                          borderColor: "var(--border-color)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {f.arquivado ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                        {f.arquivado ? "Desarquivar" : "Arquivar"}
                      </button>
                      {f.aluno.status === "SEM_MATRICULA" ? (
                        <button
                          type="button"
                          onClick={() => onMatricular(f.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: "var(--accent)" }}
                        >
                          <Plus size={12} />
                          Matricular
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                          style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}
                        >
                          <Check size={11} />
                          Matriculado
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Perguntas ───────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: Pergunta["tipo"] }) {
  if (tipo === "TEXTO") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
      >
        <Info size={10} />
        Informativo
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}
    >
      Sim/Não
    </span>
  );
}

function TipoSelect({
  value,
  onChange,
}: {
  value: Pergunta["tipo"];
  onChange: (tipo: Pergunta["tipo"]) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {(["PERGUNTA", "TEXTO"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{
            background: value === t ? "var(--accent)" : "var(--bg-primary)",
            color: value === t ? "#fff" : "var(--text-secondary)",
            border: `1px solid ${value === t ? "var(--accent)" : "var(--border-color)"}`,
          }}
        >
          {t === "PERGUNTA" ? "Pergunta médica (Sim/Não)" : "Texto informativo"}
        </button>
      ))}
    </div>
  );
}

function PerguntasTab({
  perguntas,
  setPerguntas,
}: {
  perguntas: Pergunta[];
  setPerguntas: Dispatch<SetStateAction<Pergunta[]>>;
}) {
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [textoEdit, setTextoEdit] = useState("");
  const [tipoEdit, setTipoEdit] = useState<Pergunta["tipo"]>("PERGUNTA");
  const [adicionando, setAdicionando] = useState(false);
  const [novoTexto, setNovoTexto] = useState("");
  const [novoTipo, setNovoTipo] = useState<Pergunta["tipo"]>("PERGUNTA");
  const [pending, startTransition] = useTransition();

  function mover(index: number, direcao: -1 | 1) {
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= perguntas.length) return;
    const items = Array.from(perguntas);
    [items[index], items[alvo]] = [items[alvo], items[index]];
    setPerguntas(items);
    startTransition(async () => {
      await reordenarPerguntasParq(items.map((p) => p.id));
    });
  }

  function iniciarEdicao(p: Pergunta) {
    setEditandoId(p.id);
    setTextoEdit(p.texto);
    setTipoEdit(p.tipo);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setTextoEdit("");
  }

  function handleSalvarEdicao(p: Pergunta) {
    if (!textoEdit.trim()) return;
    const novoTextoEdit = textoEdit;
    const novoTipoEdit = tipoEdit;
    setPerguntas((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, texto: novoTextoEdit, tipo: novoTipoEdit } : x))
    );
    setEditandoId(null);
    startTransition(async () => {
      await salvarPerguntaParq({ id: p.id, texto: novoTextoEdit, ordem: p.ordem, tipo: novoTipoEdit });
    });
  }

  function handleExcluir(id: number) {
    if (!window.confirm("Excluir esta pergunta? Esta ação não pode ser desfeita.")) return;
    setPerguntas((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      await excluirPerguntaParq(id);
    });
  }

  function handleToggle(p: Pergunta) {
    setPerguntas((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, ativo: !x.ativo } : x))
    );
    startTransition(async () => {
      await togglePerguntaAtiva(p.id);
    });
  }

  function handleAdicionarNova() {
    if (!novoTexto.trim()) return;
    const maxOrdem =
      perguntas.length > 0 ? Math.max(...perguntas.map((p) => p.ordem)) : 0;
    const texto = novoTexto;
    const tipo = novoTipo;
    setNovoTexto("");
    setNovoTipo("PERGUNTA");
    setAdicionando(false);
    startTransition(async () => {
      const criada = await salvarPerguntaParq({ texto, ordem: maxOrdem + 1, tipo });
      setPerguntas((prev) => [
        ...prev,
        { id: criada.id, ordem: criada.ordem, texto: criada.texto, tipo: criada.tipo, ativo: criada.ativo },
      ]);
    });
  }

  return (
    <div className="space-y-3">
      {perguntas.length === 0 && !adicionando && (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Nenhuma pergunta configurada.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {perguntas.map((p, index) => (
          <div
            key={p.id}
            className="flex items-start gap-3 rounded-2xl border px-4 py-3"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* Order arrows */}
            <div className="flex flex-col gap-0.5 mt-0.5 shrink-0">
              <button
                type="button"
                onClick={() => mover(index, -1)}
                disabled={index === 0 || pending}
                className="rounded p-0.5 transition-colors disabled:opacity-20"
                style={{ color: "var(--text-secondary)" }}
                title="Mover para cima"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => mover(index, 1)}
                disabled={index === perguntas.length - 1 || pending}
                className="rounded p-0.5 transition-colors disabled:opacity-20"
                style={{ color: "var(--text-secondary)" }}
                title="Mover para baixo"
              >
                <ArrowDown size={12} />
              </button>
            </div>

            {/* Order number */}
            <span
              className="mt-0.5 w-5 shrink-0 text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {index + 1}.
            </span>

            {/* Text or edit */}
            <div className="flex-1 space-y-2">
              {editandoId === p.id ? (
                <>
                  <TipoSelect value={tipoEdit} onChange={setTipoEdit} />
                  <textarea
                    className="w-full resize-none rounded-xl px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--accent)",
                      color: "var(--text-primary)",
                    }}
                    rows={tipoEdit === "TEXTO" ? 8 : 2}
                    value={textoEdit}
                    onChange={(e) => setTextoEdit(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && tipoEdit === "PERGUNTA") {
                        e.preventDefault();
                        handleSalvarEdicao(p);
                      }
                      if (e.key === "Escape") cancelarEdicao();
                    }}
                  />
                </>
              ) : (
                <>
                  <TipoBadge tipo={p.tipo} />
                  {p.tipo === "TEXTO" ? (
                    <TextoInformativo
                      texto={p.texto}
                      className="space-y-1 text-sm"
                      style={{
                        textDecoration: p.ativo ? undefined : "line-through",
                        opacity: p.ativo ? 1 : 0.45,
                      }}
                    />
                  ) : (
                    <p
                      className="text-sm"
                      style={{
                        color: "var(--text-primary)",
                        textDecoration: p.ativo ? undefined : "line-through",
                        opacity: p.ativo ? 1 : 0.45,
                      }}
                    >
                      {p.texto}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {editandoId === p.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSalvarEdicao(p)}
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ color: "#34d399" }}
                    title="Salvar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelarEdicao}
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleToggle(p)}
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    title={p.ativo ? "Desativar pergunta" : "Ativar pergunta"}
                  >
                    {p.ativo ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(p)}
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluir(p.id)}
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new question */}
      {adicionando ? (
        <div
          className="rounded-2xl border px-4 py-3 space-y-2"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--accent)",
          }}
        >
          <TipoSelect value={novoTipo} onChange={setNovoTipo} />
          <textarea
            className="w-full resize-none rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
            }}
            rows={novoTipo === "TEXTO" ? 8 : 2}
            placeholder={
              novoTipo === "TEXTO"
                ? "Texto informativo (ex: horário de funcionamento, regulamento)..."
                : "Texto da nova pergunta (Sim/Não)..."
            }
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && novoTipo === "PERGUNTA") {
                e.preventDefault();
                handleAdicionarNova();
              }
              if (e.key === "Escape") {
                setAdicionando(false);
                setNovoTexto("");
              }
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdicionarNova}
              disabled={pending || !novoTexto.trim()}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setAdicionando(false);
                setNovoTexto("");
                setNovoTipo("PERGUNTA");
              }}
              className="rounded-xl border px-3 py-1.5 text-xs transition-colors"
              style={{
                borderColor: "var(--border-color)",
                color: "var(--text-secondary)",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdicionando(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-sm transition-colors"
          style={{
            borderColor: "var(--border-color)",
            color: "var(--text-secondary)",
          }}
        >
          <Plus size={14} />
          Nova pergunta
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ParqConfigClient({ fichas, perguntas: perguntasIniciais, planos, tenantId, academiaName }: Props) {
  const [tab, setTab] = useState<"fichas" | "perguntas">("fichas");
  const [fichaModalId, setFichaModalId] = useState<string | null>(null);
  const [matricularFichaId, setMatricularFichaId] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [perguntas, setPerguntas] = useState<Pergunta[]>(perguntasIniciais);

  const perguntaMap = new Map(perguntas.map((p) => [String(p.id), p.texto]));

  function copiarLink() {
    navigator.clipboard
      .writeText(`${window.location.origin}/parq/${tenantId}`)
      .then(() => {
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 2000);
      });
  }

  const fichaAtual = fichas.find((f) => f.id === fichaModalId) ?? null;
  const fichaParaMatricular = fichas.find((f) => f.id === matricularFichaId) ?? null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--text-secondary)" }}
          >
            Academia
          </p>
          <h1
            className="mt-1 text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            PAR-Q
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/parq/${tenantId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
            style={{
              borderColor: "var(--border-color)",
              color: "var(--text-secondary)",
            }}
          >
            <ExternalLink size={13} />
            Preview
          </a>
          <button
            type="button"
            onClick={copiarLink}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
            style={{
              borderColor: "var(--border-color)",
              color: linkCopiado ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            <Link2 size={13} />
            {linkCopiado ? "Link copiado!" : "Copiar link"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-xl border p-1 w-fit"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        <TabButton
          active={tab === "fichas"}
          onClick={() => setTab("fichas")}
          icon={ClipboardList}
        >
          Fichas recebidas
          <span
            className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            {fichas.length}
          </span>
        </TabButton>
        <TabButton
          active={tab === "perguntas"}
          onClick={() => setTab("perguntas")}
          icon={Settings2}
        >
          Configurar perguntas
        </TabButton>
      </div>

      {/* Tab content */}
      {tab === "fichas" ? (
        <FichasTab
          fichas={fichas}
          planos={planos}
          perguntas={perguntas}
          academiaName={academiaName}
          onVerFicha={setFichaModalId}
          onMatricular={setMatricularFichaId}
        />
      ) : (
        <PerguntasTab perguntas={perguntas} setPerguntas={setPerguntas} />
      )}

      {/* Ficha detail modal */}
      {fichaAtual && (
        <ModalFicha
          ficha={fichaAtual}
          perguntaMap={perguntaMap}
          onClose={() => setFichaModalId(null)}
        />
      )}

      {/* Matricular modal */}
      {fichaParaMatricular && (
        <ModalMatricular
          ficha={fichaParaMatricular}
          planos={planos}
          onClose={() => setMatricularFichaId(null)}
        />
      )}
    </section>
  );
}
