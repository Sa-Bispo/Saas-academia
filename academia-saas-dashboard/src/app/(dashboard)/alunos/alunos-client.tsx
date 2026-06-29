"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Phone,
  Mail,
  Calendar,
  Dumbbell,
  Pencil,
  Trash2,
  IdCard,
  Cake,
  FileText,
  Receipt,
  ClipboardList,
  Loader2,
  MessageCircle,
  UserPlus,
  Clock,
  ImageIcon,
  Stethoscope,
  Upload,
} from "lucide-react";
import FloatingActionMenu from "@/components/ui/floating-action-menu";

import { criarAluno, atualizarAluno, excluirAluno, buscarAluno, enviarLembrete } from "@/actions/alunos.actions";
import { matricularAluno, criarPlanoAcademia, listarPlanosAcademia } from "@/actions/planos-academia.actions";
import { validarComprovante, rejeitarComprovante } from "@/actions/cobrancas.actions";
import { ModalImportar } from "@/components/alunos/modal-importar";

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
  precisaLiberacaoMedica: boolean;
  createdAt: Date;
  matriculas: Matricula[];
  cobrancas: Cobranca[];
  frequencias: { data: Date }[];
};

type Stats = {
  vencendo7d: number;
  inadimplentes: number;
  semFrequencia7d: number;
};

type Props = {
  alunos: Aluno[];
  planos: Plano[];
  tenantId: string;
  stats: Stats;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ATIVO: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400", icon: UserCheck },
  INADIMPLENTE: { label: "Inadimplente", color: "bg-red-500/15 text-red-400", icon: UserX },
  INATIVO: { label: "Inativo", color: "bg-slate-500/15 text-slate-400", icon: UserX },
  SUSPENSO: { label: "Suspenso", color: "bg-amber-500/15 text-amber-400", icon: AlertTriangle },
  SEM_MATRICULA: { label: "Lead", color: "bg-indigo-500/15 text-indigo-400", icon: UserPlus },
};

const MATRICULA_STATUS_COLOR: Record<string, string> = {
  ATIVA: "bg-emerald-500/15 text-emerald-400",
  VENCIDA: "bg-red-500/15 text-red-400",
  CANCELADA: "bg-slate-500/15 text-slate-400",
};

const COBRANCA_STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  AGUARDANDO_VALIDACAO: "Aguardando validação",
  PAGO: "Pago",
  VENCIDO: "Vencido",
  CANCELADA: "Cancelada",
};

const COBRANCA_STATUS_COLOR: Record<string, string> = {
  PENDENTE: "bg-amber-500/15 text-amber-400",
  AGUARDANDO_VALIDACAO: "bg-sky-500/15 text-sky-400",
  PAGO: "bg-emerald-500/15 text-emerald-400",
  VENCIDO: "bg-red-500/15 text-red-400",
  CANCELADA: "bg-slate-500/15 text-slate-400",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatCpf(cpf: string | null | undefined) {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function toDateInputValue(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
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
  planos: planosProp,
}: {
  onClose: () => void;
  planos: Plano[];
}) {
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"aluno" | "matricula">("aluno");
  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Form aluno
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [maisDetalhes, setMaisDetalhes] = useState(false);

  // Lista de planos — começa com a prop do servidor, atualiza quando um novo plano é criado
  const [planos, setPlanos] = useState<Plano[]>(planosProp);

  // Form matrícula
  const [planoId, setPlanoId] = useState(planosProp[0]?.id ?? "");
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
    setErro(null);
    startTransition(async () => {
      try {
        const aluno = await criarAluno({
          nome,
          telefone,
          email: email || undefined,
          cpf: cpf || undefined,
          dataNascimento: dataNascimento || undefined,
          observacoes: observacoes || undefined,
        });
        setAlunoId(aluno.id);
        setStep("matricula");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao cadastrar aluno.");
      }
    });
  }

  async function handleMatricular() {
    if (!alunoId || !planoId) return;
    setErro(null);
    startTransition(async () => {
      try {
        await matricularAluno({
          alunoId,
          planoId,
          dataInicio,
          dataVencimento,
        });
        onClose();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao matricular aluno.");
      }
    });
  }

  async function handleCriarPlano() {
    if (!novoPlanoNome || !novoPlanoValor) return;
    setErro(null);
    startTransition(async () => {
      try {
        await criarPlanoAcademia({
          nome: novoPlanoNome,
          valorCents: Math.round(parseFloat(novoPlanoValor.replace(",", ".")) * 100),
          periodicidade: novoPlanoPeriodicidade,
        });
        const planosAtualizados = await listarPlanosAcademia() as Plano[];
        setPlanos(planosAtualizados);
        const novo = planosAtualizados.find((p) => p.nome === novoPlanoNome);
        if (novo) {
          setPlanoId(novo.id);
          setDataVencimento(calcVencimento(dataInicio, novo.periodicidade));
        } else if (planosAtualizados.length > 0 && !planoId) {
          setPlanoId(planosAtualizados[0].id);
        }
        setNovoPlanoCriando(false);
        setNovoPlanoNome("");
        setNovoPlanoValor("");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao criar plano.");
      }
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

              <button
                type="button"
                onClick={() => setMaisDetalhes(!maisDetalhes)}
                className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <ChevronDown
                  size={13}
                  className={`transition ${maisDetalhes ? "rotate-180" : ""}`}
                />
                {maisDetalhes ? "Ocultar detalhes" : "+ Adicionar mais detalhes (opcional)"}
              </button>

              {maisDetalhes && (
                <div className="space-y-3 rounded-xl border border-line/50 bg-white/[0.03] p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">CPF</label>
                      <input
                        className="w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(maskCpf(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">Nascimento</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Observações</label>
                    <textarea
                      className="w-full resize-none rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                      placeholder="Restrições médicas, objetivo, indicação, etc."
                      rows={2}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                    />
                  </div>
                </div>
              )}
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

        {/* Erro */}
        {erro && (
          <p className="px-5 pb-2 text-xs text-red-400">{erro}</p>
        )}

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

// ─── Modal Detalhe / Editar Aluno ──────────────────────────────────────────────

type AlunoDetalhe = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  cpf: string | null;
  dataNascimento: Date | string | null;
  observacoes: string | null;
  status: string;
  precisaLiberacaoMedica: boolean;
  createdAt: Date | string;
  matriculas: {
    id: string;
    dataInicio: Date | string;
    dataVencimento: Date | string;
    status: string;
    plano: { nome: string; valorCents: number; periodicidade: string };
  }[];
  cobrancas: {
    id: string;
    status: string;
    valorCents: number;
    dataVencimento: Date | string;
    dataPagamento: Date | string | null;
    comprovanteUrl: string | null;
    comprovanteEnviadoEm: Date | string | null;
  }[];
  frequencias: {
    id: string;
    data: Date | string;
    horaEntrada: string | null;
    horaSaida: string | null;
  }[];
  fichasParq: {
    id: string;
    assinadoEm: Date | string;
    precisaLiberacaoMedica: boolean;
  }[];
};

function SecaoCard({
  icon: Icon,
  titulo,
  children,
}: {
  icon: React.ElementType;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line/50 bg-white/[0.03] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <Icon size={12} />
        {titulo}
      </p>
      {children}
    </div>
  );
}

function ModalDetalheAluno({
  alunoId,
  onClose,
}: {
  alunoId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [comprovantePending, startComprovanteTransition] = useTransition();
  const [comprovantePendingId, setComprovantePendingId] = useState<string | null>(null);
  const [comprovanteAmpliado, setComprovanteAmpliado] = useState<string | null>(null);
  // undefined = ainda carregando | null = não encontrado | AlunoDetalhe = carregado
  const [aluno, setAluno] = useState<AlunoDetalhe | null | undefined>(undefined);
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  // Form de edição
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<"ATIVO" | "INADIMPLENTE" | "INATIVO" | "SUSPENSO" | "SEM_MATRICULA">("ATIVO");

  function handleValidarComprovante(cobrancaId: string) {
    setComprovantePendingId(cobrancaId);
    startComprovanteTransition(async () => {
      await validarComprovante(cobrancaId);
      const data = await buscarAluno(alunoId);
      if (data) setAluno(data as unknown as AlunoDetalhe);
      setComprovantePendingId(null);
    });
  }

  function handleRejeitarComprovante(cobrancaId: string) {
    if (!confirm("Rejeitar o comprovante? O aluno será avisado pelo WhatsApp para reenviar.")) return;
    setComprovantePendingId(cobrancaId);
    startComprovanteTransition(async () => {
      await rejeitarComprovante(cobrancaId);
      const data = await buscarAluno(alunoId);
      if (data) setAluno(data as unknown as AlunoDetalhe);
      setComprovantePendingId(null);
    });
  }

  function carregarFormDeAluno(a: AlunoDetalhe) {
    setNome(a.nome);
    setTelefone(a.telefone);
    setEmail(a.email ?? "");
    setCpf(a.cpf ?? "");
    setDataNascimento(toDateInputValue(a.dataNascimento));
    setObservacoes(a.observacoes ?? "");
    setStatus(a.status as "ATIVO" | "INADIMPLENTE" | "INATIVO" | "SUSPENSO" | "SEM_MATRICULA");
  }

  useEffect(() => {
    setAluno(undefined);
    buscarAluno(alunoId)
      .then((data) => {
        const resultado = (data as unknown as AlunoDetalhe) ?? null;
        setAluno(resultado);
        if (resultado) carregarFormDeAluno(resultado);
      })
      .catch((err) => {
        console.error("[ModalDetalheAluno] erro ao buscar aluno:", err);
        setAluno(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunoId]);

  async function handleSalvarEdicao() {
    if (!nome.trim() || !telefone.trim()) return;
    startTransition(async () => {
      await atualizarAluno(alunoId, {
        nome,
        telefone,
        email: email || undefined,
        cpf: cpf || undefined,
        dataNascimento: dataNascimento || undefined,
        observacoes: observacoes || undefined,
        status,
      });
      const atualizado = await buscarAluno(alunoId);
      if (atualizado) {
        setAluno(atualizado as unknown as AlunoDetalhe);
        carregarFormDeAluno(atualizado as unknown as AlunoDetalhe);
      }
      setEditando(false);
    });
  }

  async function handleExcluir() {
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true);
      return;
    }
    startTransition(async () => {
      await excluirAluno(alunoId);
      onClose();
    });
  }

  const statusCfg = aluno ? STATUS_CONFIG[aluno.status] ?? STATUS_CONFIG.INATIVO : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {aluno === undefined ? "Carregando..." : aluno?.nome ?? "Aluno"}
            </h2>
            {statusCfg && !editando && (
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCfg.color}`}
                >
                  <statusCfg.icon size={10} />
                  {statusCfg.label}
                </span>
                {aluno?.precisaLiberacaoMedica && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                    <Stethoscope size={9} />
                    Avaliação médica recomendada
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {aluno === undefined ? (
            <div className="flex items-center justify-center py-10 text-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : aluno === null ? (
            <p className="py-10 text-center text-sm text-muted">Aluno não encontrado.</p>
          ) : editando ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Nome completo *</label>
                <input
                  className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Telefone *</label>
                  <input
                    className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">E-mail</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">CPF</label>
                  <input
                    className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Nascimento</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Status</label>
                <select
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as
                        | "ATIVO"
                        | "INADIMPLENTE"
                        | "INATIVO"
                        | "SUSPENSO"
                        | "SEM_MATRICULA"
                    )
                  }
                >
                  <option value="SEM_MATRICULA">Lead (sem matrícula)</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="INADIMPLENTE">Inadimplente</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="SUSPENSO">Suspenso</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Observações</label>
                <textarea
                  className="w-full resize-none rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <SecaoCard icon={Phone} titulo="Contato">
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-sm text-foreground">
                    <Phone size={12} className="text-muted" /> {aluno.telefone}
                  </p>
                  {aluno.email && (
                    <p className="flex items-center gap-1.5 text-sm text-foreground">
                      <Mail size={12} className="text-muted" /> {aluno.email}
                    </p>
                  )}
                </div>
              </SecaoCard>

              <SecaoCard icon={IdCard} titulo="Dados pessoais">
                <div className="grid grid-cols-2 gap-2 text-sm text-foreground">
                  <p className="flex items-center gap-1.5">
                    <IdCard size={12} className="text-muted" /> {formatCpf(aluno.cpf) ?? "—"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Cake size={12} className="text-muted" /> {formatData(aluno.dataNascimento)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted">Aluno desde {formatData(aluno.createdAt)}</p>
              </SecaoCard>

              {aluno.observacoes && (
                <SecaoCard icon={FileText} titulo="Observações">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{aluno.observacoes}</p>
                </SecaoCard>
              )}

              <SecaoCard icon={ClipboardList} titulo="PAR-Q">
                {aluno.fichasParq.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <Check size={10} />
                        Respondido
                      </span>
                      <span className="text-xs text-muted">
                        em {formatData(aluno.fichasParq[0].assinadoEm)}
                      </span>
                    </div>
                    {aluno.fichasParq[0].precisaLiberacaoMedica && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        <AlertTriangle size={9} />
                        Avaliação médica
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                    <X size={10} />
                    Não respondido
                  </span>
                )}
              </SecaoCard>

              <SecaoCard icon={Dumbbell} titulo="Matrículas">
                {aluno.matriculas.length === 0 ? (
                  <p className="text-sm text-muted">Nenhuma matrícula registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {aluno.matriculas.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-foreground">{m.plano.nome}</p>
                          <p className="text-xs text-muted">
                            {formatData(m.dataInicio)} → {formatData(m.dataVencimento)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            MATRICULA_STATUS_COLOR[m.status] ?? "bg-slate-500/15 text-slate-400"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SecaoCard>

              <SecaoCard icon={Receipt} titulo="Cobranças">
                {aluno.cobrancas.length === 0 ? (
                  <p className="text-sm text-muted">Nenhuma cobrança registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {aluno.cobrancas.map((c) => {
                      const aguardando = c.status === "AGUARDANDO_VALIDACAO";
                      const isPending = comprovantePendingId === c.id && comprovantePending;
                      return (
                        <div key={c.id} className="flex flex-col gap-2 text-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-foreground">{formatCents(c.valorCents)}</p>
                              <p className="text-xs text-muted">
                                Venc. {formatData(c.dataVencimento)}
                                {c.dataPagamento && ` · Pago em ${formatData(c.dataPagamento)}`}
                                {aguardando && c.comprovanteEnviadoEm && (
                                  <> · Comprovante em {formatData(c.comprovanteEnviadoEm)}</>
                                )}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                COBRANCA_STATUS_COLOR[c.status] ?? "bg-slate-500/15 text-slate-400"
                              }`}
                            >
                              {aguardando && <ImageIcon size={9} className="inline mr-1" />}
                              {COBRANCA_STATUS_LABEL[c.status] ?? c.status}
                            </span>
                          </div>

                          {aguardando && (
                            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 space-y-2">
                              {c.comprovanteUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.comprovanteUrl}
                                  alt="Comprovante de pagamento"
                                  onClick={() => setComprovanteAmpliado(c.comprovanteUrl)}
                                  className="h-32 w-full rounded-lg border border-line/50 object-contain bg-black/20 cursor-zoom-in"
                                />
                              ) : (
                                <p className="text-xs text-muted text-center py-2">
                                  Comprovante sem imagem disponível.
                                </p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleValidarComprovante(c.id)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand py-1.5 text-xs font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
                                >
                                  <Check size={11} />
                                  {isPending ? "Confirmando..." : "Confirmar"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleRejeitarComprovante(c.id)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                >
                                  <X size={11} />
                                  {isPending ? "Rejeitando..." : "Rejeitar"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SecaoCard>

              <SecaoCard icon={ClipboardList} titulo="Frequência recente">
                {aluno.frequencias.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum check-in registrado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {aluno.frequencias.map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{formatData(f.data)}</span>
                        <span className="text-xs text-muted">
                          {f.horaEntrada ?? "—"} {f.horaSaida ? `→ ${f.horaSaida}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SecaoCard>
            </>
          )}
        </div>

        {/* Footer */}
        {aluno && (
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            {editando ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setEditando(false);
                    carregarFormDeAluno(aluno);
                  }}
                  className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-foreground disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={pending || !nome || !telefone}
                  onClick={handleSalvarEdicao}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
                >
                  {pending ? "Salvando..." : "Salvar alterações"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleExcluir}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
                    confirmandoExclusao
                      ? "bg-red-500/20 text-red-400"
                      : "text-muted hover:text-red-400"
                  }`}
                >
                  <Trash2 size={13} />
                  {confirmandoExclusao ? "Confirmar exclusão?" : "Excluir aluno"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
                >
                  <Pencil size={13} />
                  Editar
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox comprovante */}
      {comprovanteAmpliado && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setComprovanteAmpliado(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={comprovanteAmpliado}
            alt="Comprovante ampliado"
            className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setComprovanteAmpliado(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers de urgência ─────────────────────────────────────────────────────

function diasSemFrequencia(frequencias: { data: Date }[]): number | null {
  if (!frequencias.length) return null;
  const ultima = new Date(frequencias[0].data);
  return Math.floor((Date.now() - ultima.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyScore(aluno: Aluno): number {
  if (aluno.status === "INADIMPLENTE") return 3;
  if (aluno.matriculas[0] && isVencendo(aluno.matriculas[0].dataVencimento)) return 2;
  const dias = diasSemFrequencia(aluno.frequencias);
  if (dias !== null && dias >= 7) return 1;
  return 0;
}

function diasParaVencer(dataVencimento: Date): number {
  return Math.ceil((new Date(dataVencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function avatarInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-500/30 text-indigo-300",
  "bg-violet-500/30 text-violet-300",
  "bg-sky-500/30 text-sky-300",
  "bg-emerald-500/30 text-emerald-300",
  "bg-amber-500/30 text-amber-300",
  "bg-rose-500/30 text-rose-300",
];

function avatarColor(nome: string): string {
  const sum = nome.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AlunosPageClient({ alunos, planos, tenantId, stats }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState<"urgencia" | "nome">("urgencia");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modalAberto, setModalAberto] = useState(false);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string | null>(null);
  const [lembreteEnviado, setLembreteEnviado] = useState<Set<string>>(new Set());
  const [filtrosAberto, setFiltrosAberto] = useState(false);
  const [, startTransition] = useTransition();

  const alunosFiltrados = alunos
    .filter((a) => {
      const matchBusca =
        !busca ||
        a.nome.toLowerCase().includes(busca.toLowerCase()) ||
        a.telefone.includes(busca) ||
        (a.email ?? "").toLowerCase().includes(busca.toLowerCase());
      let matchStatus = true;
      if (filtroStatus === "VENCENDO") {
        matchStatus = !!a.matriculas[0] && isVencendo(a.matriculas[0].dataVencimento);
      } else if (filtroStatus !== "todos") {
        matchStatus = a.status === filtroStatus;
      }
      return matchBusca && matchStatus;
    })
    .sort((a, b) => {
      if (ordenacao === "urgencia") return urgencyScore(b) - urgencyScore(a);
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

  const totais = {
    todos: alunos.length,
    ATIVO: alunos.filter((a) => a.status === "ATIVO").length,
    INADIMPLENTE: alunos.filter((a) => a.status === "INADIMPLENTE").length,
    INATIVO: alunos.filter((a) => a.status === "INATIVO").length,
    VENCENDO: alunos.filter((a) => !!a.matriculas[0] && isVencendo(a.matriculas[0].dataVencimento)).length,
  };

  const todosSelecionados =
    alunosFiltrados.length > 0 && alunosFiltrados.every((a) => selecionados.has(a.id));

  function toggleSelecionarTodos() {
    if (todosSelecionados) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(alunosFiltrados.map((a) => a.id)));
    }
  }

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleLembrete(e: React.MouseEvent, alunoId: string) {
    e.stopPropagation();
    startTransition(async () => {
      await enviarLembrete(alunoId);
      setLembreteEnviado((prev) => new Set(prev).add(alunoId));
    });
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Alunos</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalImportarAberto(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-muted transition hover:text-foreground"
          >
            <Upload size={14} />
            Importar CSV
          </button>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
          >
            <Plus size={15} />
            Novo aluno
          </button>
        </div>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setFiltroStatus(filtroStatus === "VENCENDO" ? "todos" : "VENCENDO")}
          className={`rounded-2xl border p-4 text-left transition ${
            filtroStatus === "VENCENDO"
              ? "border-amber-500/50 bg-amber-500/10"
              : "border-amber-500/20 bg-surface/60 hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center gap-2 text-amber-400">
            <Clock size={14} />
            <span className="text-xs font-medium">Vencendo em 7 dias</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.vencendo7d}</p>
        </button>

        <button
          type="button"
          onClick={() => setFiltroStatus(filtroStatus === "INADIMPLENTE" ? "todos" : "INADIMPLENTE")}
          className={`rounded-2xl border p-4 text-left transition ${
            filtroStatus === "INADIMPLENTE"
              ? "border-red-500/50 bg-red-500/10"
              : "border-red-500/20 bg-surface/60 hover:border-red-500/40"
          }`}
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium">Inadimplentes</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.inadimplentes}</p>
        </button>
      </div>

      {/* Busca + ordenação */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-line bg-surface/60 py-2.5 pl-9 pr-4 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setOrdenacao(ordenacao === "urgencia" ? "nome" : "urgencia")}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            ordenacao === "urgencia"
              ? "border-brand/50 bg-brand/10 text-brand"
              : "border-line bg-surface/60 text-muted hover:text-foreground"
          }`}
        >
          <AlertTriangle size={13} />
          Urgência
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFiltrosAberto((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              filtroStatus !== "todos"
                ? "border-brand/50 bg-brand/10 text-brand"
                : "border-line bg-surface/60 text-muted hover:text-foreground"
            }`}
          >
            <ChevronDown size={13} />
            Filtros
            {filtroStatus !== "todos" && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
                1
              </span>
            )}
          </button>

          {filtrosAberto && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
              {[
                { key: "todos", label: "Todos", count: totais.todos },
                { key: "ATIVO", label: "Ativos", count: totais.ATIVO },
                { key: "INADIMPLENTE", label: "Inadimplentes", count: totais.INADIMPLENTE },
                { key: "INATIVO", label: "Inativos", count: totais.INATIVO },
                { key: "VENCENDO", label: "Vencendo", count: totais.VENCENDO },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setFiltroStatus(key); setFiltrosAberto(false); }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-white/5 ${
                    filtroStatus === key ? "text-brand" : "text-foreground"
                  }`}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-muted">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
          {/* Header da tabela */}
          <div className="flex items-center gap-4 border-b border-line/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <input
              type="checkbox"
              checked={todosSelecionados}
              onChange={toggleSelecionarTodos}
              className="h-3.5 w-3.5 rounded border-line accent-brand"
            />
            <span className="flex-1">Aluno</span>
            <span className="hidden w-40 lg:block">Vencimento</span>
            <span className="hidden w-28 lg:block">Ações</span>
          </div>

          <div className="divide-y divide-line/30">
            {alunosFiltrados.map((aluno) => {
              const matriculaAtiva = aluno.matriculas[0];

              return (
                <div
                  key={aluno.id}
                  onClick={() => setAlunoSelecionadoId(aluno.id)}
                  className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.02]"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selecionados.has(aluno.id)}
                    onChange={() => toggleSelecionado(aluno.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3.5 w-3.5 rounded border-line accent-brand"
                  />

                  {/* Avatar */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(aluno.nome)}`}
                  >
                    {avatarInitials(aluno.nome)}
                  </div>

                  {/* Nome + info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-white">{aluno.nome}</span>
                      {aluno.precisaLiberacaoMedica && (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                          av. médica
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <span>{aluno.telefone}</span>
                      {matriculaAtiva && (
                        <>
                          <span className="text-line">·</span>
                          <span>{matriculaAtiva.plano.periodicidade.charAt(0) + matriculaAtiva.plano.periodicidade.slice(1).toLowerCase()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Vencimento */}
                  <div className="hidden w-36 lg:block">
                    {matriculaAtiva ? (
                      <span className="text-xs text-muted">
                        {formatData(matriculaAtiva.dataVencimento)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>

                  {/* Ações */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={`https://wa.me/${aluno.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir WhatsApp"
                      className="rounded-lg border border-line p-1.5 text-muted/60 transition hover:border-brand/50 hover:text-brand"
                    >
                      <MessageCircle size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setAlunoSelecionadoId(aluno.id)}
                      className="rounded-lg border border-line p-1.5 text-muted/60 transition hover:border-line/80 hover:text-foreground"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-line/30 px-5 py-2.5 text-xs text-muted">
            Mostrando {alunosFiltrados.length} de {alunos.length} alunos
            {ordenacao === "urgencia" && " · ordenado por urgência"}
            {selecionados.size > 0 && (
              <span className="ml-2 text-brand">· {selecionados.size} selecionado{selecionados.size > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      )}

      {modalAberto && (
        <ModalNovoAluno onClose={() => setModalAberto(false)} planos={planos} />
      )}

      {modalImportarAberto && (
        <ModalImportar
          onClose={() => setModalImportarAberto(false)}
          planos={planos}
        />
      )}

      {alunoSelecionadoId && (
        <ModalDetalheAluno
          alunoId={alunoSelecionadoId}
          onClose={() => setAlunoSelecionadoId(null)}
        />
      )}

      <FloatingActionMenu
        options={[
          {
            label: "Novo aluno",
            Icon: <UserPlus size={14} />,
            onClick: () => setModalAberto(true),
          },
          {
            label: "Importar CSV/Excel",
            Icon: <Upload size={14} />,
            onClick: () => setModalImportarAberto(true),
          },
          {
            label: `Inadimplentes (${totais.INADIMPLENTE})`,
            Icon: <AlertTriangle size={14} />,
            onClick: () => setFiltroStatus("INADIMPLENTE"),
          },
          {
            label: `Vencendo esta semana (${totais.VENCENDO})`,
            Icon: <Clock size={14} />,
            onClick: () => setFiltroStatus("VENCENDO"),
          },
        ]}
      />
    </section>
  );
}
