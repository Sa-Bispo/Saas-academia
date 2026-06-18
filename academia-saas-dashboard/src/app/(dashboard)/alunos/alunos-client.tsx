"use client";

import { useState, useTransition } from "react";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronDown,
  X,
  Phone,
  Mail,
  Calendar,
  Dumbbell,
} from "lucide-react";

import { criarAluno, atualizarAluno, excluirAluno } from "@/actions/alunos.actions";
import { matricularAluno, criarPlanoAcademia } from "@/actions/planos-academia.actions";

type Plano = {
  id: string;
  nome: string;
  valorCents: number;
  periodicidade: string;
  ativo: boolean;
};

type Cobranca = {
  id: string;
  status: string;
  valorCents: number;
  dataVencimento: Date;
};

type Matricula = {
  id: string;
  dataVencimento: Date;
  status: string;
  plano: Plano;
};

type Aluno = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  status: string;
  createdAt: Date;
  matriculas: Matricula[];
  cobrancas: Cobranca[];
};

type Props = {
  alunos: Aluno[];
  planos: Plano[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ATIVO: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400", icon: UserCheck },
  INADIMPLENTE: { label: "Inadimplente", color: "bg-red-500/15 text-red-400", icon: UserX },
  INATIVO: { label: "Inativo", color: "bg-slate-500/15 text-slate-400", icon: UserX },
  SUSPENSO: { label: "Suspenso", color: "bg-amber-500/15 text-amber-400", icon: AlertTriangle },
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isVencendo(dataVencimento: Date) {
  const diff = new Date(dataVencimento).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function calcVencimento(inicio: string, periodicidade: string): string {
  const d = new Date(inicio + "T12:00:00");
  switch (periodicidade) {
    case "MENSAL":     d.setMonth(d.getMonth() + 1); break;
    case "TRIMESTRAL": d.setMonth(d.getMonth() + 3); break;
    case "SEMESTRAL":  d.setMonth(d.getMonth() + 6); break;
    case "ANUAL":      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

// ─── Modal Novo Aluno ─────────────────────────────────────────────────────────

function ModalNovoAluno({
  onClose,
  planos,
}: {
  onClose: () => void;
  planos: Plano[];
}) {
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"aluno" | "matricula">("aluno");
  const [alunoId, setAlunoId] = useState<string | null>(null);

  // Form aluno
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // Form matrícula
  const [planoId, setPlanoId] = useState(planos[0]?.id ?? "");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [dataVencimento, setDataVencimento] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });

  // Form novo plano inline
  const [novoPlanoCriando, setNovoPlanoCriando] = useState(false);
  const [novoPlanoNome, setNovoPlanoNome] = useState("");
  const [novoPlanoValor, setNovoPlanoValor] = useState("");
  const [novoPlanoPeriodicidade, setNovoPlanoPeriodicidade] = useState<
    "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL"
  >("MENSAL");

  async function handleSalvarAluno() {
    if (!nome.trim() || !telefone.trim()) return;
    startTransition(async () => {
      const aluno = await criarAluno({ nome, telefone, email: email || undefined });
      setAlunoId(aluno.id);
      setStep("matricula");
    });
  }

  async function handleMatricular() {
    if (!alunoId || !planoId) return;
    startTransition(async () => {
      await matricularAluno({
        alunoId,
        planoId,
        dataInicio,
        dataVencimento,
      });
      onClose();
    });
  }

  async function handleCriarPlano() {
    if (!novoPlanoNome || !novoPlanoValor) return;
    startTransition(async () => {
      await criarPlanoAcademia({
        nome: novoPlanoNome,
        valorCents: Math.round(parseFloat(novoPlanoValor.replace(",", ".")) * 100),
        periodicidade: novoPlanoPeriodicidade,
      });
      setNovoPlanoCriando(false);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {step === "aluno" ? "Novo aluno" : "Matricular aluno"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {step === "aluno" ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Nome completo *</label>
                <input
                  className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">WhatsApp / Telefone *</label>
                <input
                  className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">E-mail (opcional)</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                  placeholder="joao@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Plano</label>
                <select
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                  value={planoId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setPlanoId(newId);
                    const plano = planos.find((p) => p.id === newId);
                    if (plano) setDataVencimento(calcVencimento(dataInicio, plano.periodicidade));
                  }}
                >
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {formatCents(p.valorCents)}/{p.periodicidade.toLowerCase()}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mt-1.5 text-xs text-brand hover:underline"
                  onClick={() => setNovoPlanoCriando(!novoPlanoCriando)}
                >
                  {novoPlanoCriando ? "Cancelar" : "+ Criar novo plano"}
                </button>
              </div>

              {novoPlanoCriando && (
                <div className="rounded-xl border border-line/50 bg-white/[0.03] p-3 space-y-3">
                  <input
                    className="w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:outline-none"
                    placeholder="Nome do plano"
                    value={novoPlanoNome}
                    onChange={(e) => setNovoPlanoNome(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:outline-none"
                      placeholder="Valor (R$)"
                      value={novoPlanoValor}
                      onChange={(e) => setNovoPlanoValor(e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-line bg-surface px-2 py-2 text-sm text-white focus:outline-none"
                      value={novoPlanoPeriodicidade}
                      onChange={(e) =>
                        setNovoPlanoPeriodicidade(
                          e.target.value as "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL"
                        )
                      }
                    >
                      <option value="MENSAL">Mensal</option>
                      <option value="TRIMESTRAL">Trimestral</option>
                      <option value="SEMESTRAL">Semestral</option>
                      <option value="ANUAL">Anual</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleCriarPlano}
                    disabled={pending}
                    className="w-full rounded-lg bg-brand/20 py-2 text-xs font-medium text-brand hover:bg-brand/30 disabled:opacity-50"
                  >
                    Salvar plano
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Início</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                    value={dataInicio}
                    onChange={(e) => {
                      setDataInicio(e.target.value);
                      const plano = planos.find((p) => p.id === planoId);
                      if (plano) setDataVencimento(calcVencimento(e.target.value, plano.periodicidade));
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Vencimento</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          {step === "aluno" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Cancelar
            </button>
          )}
          {step === "aluno" ? (
            <button
              type="button"
              disabled={pending || !nome || !telefone}
              onClick={handleSalvarAluno}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Próximo →"}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={onClose}
                className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-foreground disabled:opacity-50"
              >
                Pular matrícula
              </button>
              <button
                type="button"
                disabled={pending || !planoId}
                onClick={handleMatricular}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
              >
                {pending ? "Matriculando..." : "Matricular aluno"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AlunosPageClient({ alunos, planos }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [, startTransition] = useTransition();

  const alunosFiltrados = alunos.filter((a) => {
    const matchBusca =
      !busca ||
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.telefone.includes(busca);
    const matchStatus = filtroStatus === "todos" || a.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const totais = {
    todos: alunos.length,
    ATIVO: alunos.filter((a) => a.status === "ATIVO").length,
    INADIMPLENTE: alunos.filter((a) => a.status === "INADIMPLENTE").length,
    INATIVO: alunos.filter((a) => a.status === "INATIVO").length,
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Alunos</h1>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          <Plus size={15} />
          Novo aluno
        </button>
      </div>

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "todos", label: "Todos", count: totais.todos },
          { key: "ATIVO", label: "Ativos", count: totais.ATIVO },
          { key: "INADIMPLENTE", label: "Inadimplentes", count: totais.INADIMPLENTE },
          { key: "INATIVO", label: "Inativos", count: totais.INATIVO },
        ].map(({ key, label, count }) => (
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
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                filtroStatus === key ? "bg-white/20 text-white" : "bg-white/10 text-muted"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="w-full rounded-xl border border-line bg-surface/60 py-2.5 pl-9 pr-4 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
          placeholder="Buscar por nome ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Lista de alunos */}
      {alunosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-10 text-center">
          <Users size={32} className="mx-auto mb-3 text-muted/50" />
          <p className="text-sm text-muted">
            {alunos.length === 0
              ? 'Nenhum aluno cadastrado ainda. Clique em "Novo aluno" para começar.'
              : "Nenhum aluno encontrado com esse filtro."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
          {/* Header da tabela — desktop */}
          <div className="hidden grid-cols-[2fr_1fr_1.5fr_1fr_1fr] gap-4 border-b border-line/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted lg:grid">
            <span>Aluno</span>
            <span>Status</span>
            <span>Plano ativo</span>
            <span>Vencimento</span>
            <span>Pendência</span>
          </div>

          <div className="divide-y divide-line/30">
            {alunosFiltrados.map((aluno) => {
              const matriculaAtiva = aluno.matriculas[0];
              const cobrancaPendente = aluno.cobrancas[0];
              const statusCfg = STATUS_CONFIG[aluno.status] ?? STATUS_CONFIG.INATIVO;
              const vencendo = matriculaAtiva ? isVencendo(matriculaAtiva.dataVencimento) : false;

              return (
                <div
                  key={aluno.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-white/[0.02] lg:grid-cols-[2fr_1fr_1.5fr_1fr_1fr] lg:items-center lg:gap-4"
                >
                  {/* Nome + contato */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{aluno.nome}</p>
                    <div className="mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Phone size={10} />
                        {aluno.telefone}
                      </span>
                      {aluno.email && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Mail size={10} />
                          {aluno.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCfg.color}`}
                    >
                      <statusCfg.icon size={10} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Plano */}
                  <div>
                    {matriculaAtiva ? (
                      <span className="flex items-center gap-1 text-xs text-foreground">
                        <Dumbbell size={11} className="text-brand" />
                        {matriculaAtiva.plano.nome}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Sem matrícula</span>
                    )}
                  </div>

                  {/* Vencimento */}
                  <div>
                    {matriculaAtiva ? (
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          vencendo ? "text-amber-400" : "text-muted"
                        }`}
                      >
                        <Calendar size={10} />
                        {new Date(matriculaAtiva.dataVencimento).toLocaleDateString("pt-BR")}
                        {vencendo && <span className="text-[10px]">⚠</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>

                  {/* Pendência */}
                  <div>
                    {cobrancaPendente ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          cobrancaPendente.status === "VENCIDO"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {formatCents(cobrancaPendente.valorCents)}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400">Em dia ✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modalAberto && (
        <ModalNovoAluno onClose={() => setModalAberto(false)} planos={planos} />
      )}
    </section>
  );
}
