"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import { FotoViewer } from "@/components/ui/foto-viewer";
import { comprimirFoto } from "@/lib/comprimir-foto";

import {
  criarAluno,
  atualizarAluno,
  atualizarVencimentoMatricula,
  atualizarFotoAluno,
  removerFotoDoAluno,
  excluirAluno,
  buscarAluno,
  enviarLembrete,
  marcarMensalidade,
} from "@/actions/alunos.actions";
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
  dataInicio: Date;
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
  fotoUrl: string | null;
  precisaLiberacaoMedica: boolean;
  createdAt: Date;
  dataNascimento: Date | null;
  observacoes: string | null;
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
  temFinanceiro: boolean;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ATIVO: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400", icon: UserCheck },
  INADIMPLENTE: { label: "Inadimplente", color: "bg-red-500/15 text-red-400", icon: UserX },
  INATIVO: { label: "Inativo", color: "bg-slate-500/15 text-slate-400", icon: UserX },
  SUSPENSO: { label: "Suspenso", color: "bg-amber-500/15 text-amber-400", icon: AlertTriangle },
  SEM_MATRICULA: { label: "Lead", color: "bg-emerald-500/15 text-emerald-400", icon: UserPlus },
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

const BRT = "America/Sao_Paulo";

function formatData(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: BRT });
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
  // en-CA returns YYYY-MM-DD, exactly what <input type="date"> expects
  return new Date(d).toLocaleDateString("en-CA", { timeZone: BRT });
}

function calcularIdade(dataNascimento: Date | string | null | undefined): number | null {
  if (!dataNascimento) return null;
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: BRT }); // YYYY-MM-DD
  const [nascY, nascM, nascD] = fmt(new Date(dataNascimento)).split("-").map(Number);
  const [hojeY, hojeM, hojeD] = fmt(new Date()).split("-").map(Number);
  let idade = hojeY - nascY;
  if (hojeM < nascM || (hojeM === nascM && hojeD < nascD)) idade--;
  return idade;
}

function isVencendo(dataVencimento: Date) {
  const diff = new Date(dataVencimento).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

// Dias até o próximo aniversário (0 = hoje). null se sem data.
function diasAteAniversario(dataNascimento: Date | null | undefined): number | null {
  if (!dataNascimento) return null;
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: BRT });
  const [, nascM, nascD] = fmt(new Date(dataNascimento)).split("-").map(Number);
  const [hojeY, hojeM, hojeD] = fmt(new Date()).split("-").map(Number);
  const proxAniv = new Date(`${hojeY}-${String(nascM).padStart(2,"0")}-${String(nascD).padStart(2,"0")}T12:00:00`);
  if (proxAniv.toLocaleDateString("en-CA", { timeZone: BRT }) < fmt(new Date())) {
    proxAniv.setFullYear(hojeY + 1);
  }
  const hoje = new Date(new Date().toLocaleDateString("en-CA", { timeZone: BRT }) + "T12:00:00");
  return Math.round((proxAniv.getTime() - hoje.getTime()) / 86400000);
}

function labelAniversario(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias === 0) return "🎂 hoje";
  if (dias === 1) return "🎂 amanhã";
  if (dias <= 7) return `🎂 em ${dias}d`;
  return null;
}

// Aluno "novo" = matriculado hoje (compara dia local, não só 24h corridas)
function ehNovo(dataMatricula: Date | string): boolean {
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: BRT });
  const dia = new Date(dataMatricula).toLocaleDateString("pt-BR", { timeZone: BRT });
  return hoje === dia;
}

// "novo" no dia da matrícula; dos dias seguintes em diante, mostra a data real
function tempoDeCasa(dataMatricula: Date | string): string {
  if (ehNovo(dataMatricula)) return "novo";
  return formatData(dataMatricula);
}

// Data de referência do aluno: matrícula ativa mais recente, ou data de
// cadastro se ele ainda não tem matrícula ativa (ex: lead sem plano).
function dataEntrada(a: {
  matriculas: { status: string; dataInicio: Date | string }[];
  createdAt: Date | string;
}): Date | string {
  return a.matriculas.find((m) => m.status === "ATIVA")?.dataInicio ?? a.createdAt;
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
  // "Hoje" em BRT explícito, não toISOString() (que dá o dia UTC — errado
  // entre 21h e meia-noite no horário de Brasília, mostraria amanhã).
  const [dataInicio, setDataInicio] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: BRT })
  );
  const [dataVencimento, setDataVencimento] = useState(() => {
    const d = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: BRT })}T12:00:00`);
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
  fotoUrl: string | null;
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
  // null = ocioso · true = marcando Pago · false = marcando Pendente
  const [mensalidadeSalvando, setMensalidadeSalvando] = useState<null | boolean>(null);
  const [comprovanteAmpliado, setComprovanteAmpliado] = useState<string | null>(null);
  // undefined = ainda carregando | null = não encontrado | AlunoDetalhe = carregado
  const [aluno, setAluno] = useState<AlunoDetalhe | null | undefined>(undefined);
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [fotoPending, startFotoTransition] = useTransition();
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Form de edição
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<"ATIVO" | "INADIMPLENTE" | "INATIVO" | "SUSPENSO" | "SEM_MATRICULA">("ATIVO");
  const [matriculaAtivaId, setMatriculaAtivaId] = useState<string | null>(null);
  const [dataVencimentoMatricula, setDataVencimentoMatricula] = useState("");

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

  function handleMarcarMensalidade(pago: boolean) {
    setMensalidadeSalvando(pago);
    startTransition(async () => {
      try {
        await marcarMensalidade(alunoId, pago);
        const data = await buscarAluno(alunoId);
        if (data) setAluno(data as unknown as AlunoDetalhe);
      } finally {
        setMensalidadeSalvando(null);
      }
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
    const matriculaAtiva = a.matriculas.find((m) => m.status === "ATIVA") ?? null;
    setMatriculaAtivaId(matriculaAtiva?.id ?? null);
    setDataVencimentoMatricula(toDateInputValue(matriculaAtiva?.dataVencimento));
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
      if (matriculaAtivaId && dataVencimentoMatricula) {
        await atualizarVencimentoMatricula(matriculaAtivaId, dataVencimentoMatricula);
      }
      const atualizado = await buscarAluno(alunoId);
      if (atualizado) {
        setAluno(atualizado as unknown as AlunoDetalhe);
        carregarFormDeAluno(atualizado as unknown as AlunoDetalhe);
      }
      setEditando(false);
    });
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fotoInputRef.current) fotoInputRef.current.value = "";
    if (!file) return;
    setErroFoto(null);
    let base64: string;
    try {
      base64 = await comprimirFoto(file);
    } catch {
      setErroFoto("Não foi possível carregar a foto. Tente outra.");
      return;
    }
    startFotoTransition(async () => {
      try {
        const { fotoUrl } = await atualizarFotoAluno(alunoId, base64);
        setAluno((prev) => (prev ? { ...prev, fotoUrl } : prev));
      } catch (err) {
        setErroFoto(err instanceof Error ? err.message : "Não foi possível salvar a foto.");
      }
    });
  }

  function handleRemoverFoto() {
    setErroFoto(null);
    startFotoTransition(async () => {
      try {
        await removerFotoDoAluno(alunoId);
        setAluno((prev) => (prev ? { ...prev, fotoUrl: null } : prev));
      } catch (err) {
        setErroFoto(err instanceof Error ? err.message : "Não foi possível remover a foto.");
      }
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
          <div className="flex items-center gap-3">
            {aluno && (
              <div className="relative shrink-0">
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFotoChange}
                />
                {aluno.fotoUrl ? (
                  <FotoViewer
                    src={aluno.fotoUrl}
                    alt={aluno.nome}
                    className="h-10 w-10 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-line"
                    style={{ background: "var(--bg-tertiary)" }}
                  >
                    <ImageIcon size={15} className="text-muted" />
                  </div>
                )}
                {fotoPending ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <Loader2 size={13} className="animate-spin text-white" />
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      title={aluno.fotoUrl ? "Trocar foto" : "Adicionar foto"}
                      onClick={() => fotoInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:text-brand"
                    >
                      <Pencil size={10} />
                    </button>
                    {aluno.fotoUrl && (
                      <button
                        type="button"
                        title="Remover foto"
                        onClick={handleRemoverFoto}
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:text-red-400"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
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
            {erroFoto && <p className="mt-1 text-[11px] text-red-400">{erroFoto}</p>}
            </div>
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
              {matriculaAtivaId ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Data de cobrança/pagamento
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                    value={dataVencimentoMatricula}
                    onChange={(e) => setDataVencimentoMatricula(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Próximo vencimento da matrícula ativa — define quando a próxima cobrança é gerada.
                  </p>
                </div>
              ) : null}
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
              <a
                href={`https://wa.me/${aluno.telefone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-brand-strong"
              >
                <MessageCircle size={16} /> Conversar no WhatsApp
              </a>

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
                    <Cake size={12} className="text-muted" />
                    {aluno.dataNascimento
                      ? `${formatData(aluno.dataNascimento)} · ${calcularIdade(aluno.dataNascimento)} anos`
                      : "—"}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted">Aluno desde {formatData(dataEntrada(aluno))}</p>
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

              {/* Mensalidade — controle manual (Pago/Pendente, sem mensagem/automação) */}
              {(() => {
                const mat = aluno.matriculas.find((m) => m.status === "ATIVA");
                const estaPago = aluno.cobrancas[0]?.status === "PAGO";
                return (
                  <SecaoCard icon={Receipt} titulo="Mensalidade atual">
                    {mat ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <p className="text-foreground">
                              {mat.plano.nome} · <span className="font-mono">{formatCents(mat.plano.valorCents)}</span>
                            </p>
                            <p className="text-xs text-muted">Vence {formatData(mat.dataVencimento)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={mensalidadeSalvando !== null}
                            onClick={() => handleMarcarMensalidade(false)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              !estaPago
                                ? "text-[var(--danger-text)]"
                                : "border border-line text-muted hover:text-foreground"
                            }`}
                            style={!estaPago ? { background: "rgba(224,106,84,.15)" } : undefined}
                          >
                            {mensalidadeSalvando === false ? (
                              <><Loader2 size={13} className="animate-spin" /> Processando…</>
                            ) : (
                              "● Pendente"
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={mensalidadeSalvando !== null}
                            onClick={() => handleMarcarMensalidade(true)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              estaPago
                                ? "bg-brand text-[var(--accent-text)]"
                                : "border border-line text-muted hover:text-foreground"
                            }`}
                          >
                            {mensalidadeSalvando === true ? (
                              <><Loader2 size={13} className="animate-spin" /> Processando…</>
                            ) : (
                              "✓ Pago"
                            )}
                          </button>
                        </div>
                        {mensalidadeSalvando !== null ? (
                          <p className="flex items-center gap-1.5 text-[11px] font-medium text-brand">
                            <Loader2 size={11} className="animate-spin" />
                            Salvando alteração… não feche esta janela.
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted">
                            Você marca na mão quando o aluno paga — sem cobrança nem mensagem automática.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">Sem matrícula ativa.</p>
                    )}
                  </SecaoCard>
                );
              })()}

              {/* Histórico de pagamentos */}
              {aluno.cobrancas.length > 0 && (
                <SecaoCard icon={ClipboardList} titulo="Histórico de pagamentos">
                  <div className="space-y-1.5">
                    {aluno.cobrancas.map((c) => {
                      const mesRef = new Date(c.dataVencimento).toLocaleDateString("pt-BR", {
                        month: "short",
                        year: "numeric",
                      });
                      const isPago = c.status === "PAGO";
                      const isVencido = c.status === "VENCIDO";
                      const statusLabel =
                        isPago ? "Pago"
                        : isVencido ? "Vencido"
                        : c.status === "CANCELADA" ? "Cancelado"
                        : "Pendente";
                      const statusColor =
                        isPago ? "bg-emerald-500/15 text-emerald-400"
                        : isVencido ? "bg-red-500/15 text-red-400"
                        : c.status === "CANCELADA" ? "bg-slate-500/15 text-slate-400"
                        : "bg-amber-500/15 text-amber-400";

                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}
                            >
                              {statusLabel}
                            </span>
                            <span className="text-muted capitalize">{mesRef}</span>
                            {c.dataPagamento && (
                              <span className="text-muted/60 hidden sm:inline">
                                pago em {formatData(c.dataPagamento)}
                              </span>
                            )}
                          </div>
                          <span className={`font-mono font-semibold tabular-nums shrink-0 ${isPago ? "text-emerald-400" : "text-foreground"}`}>
                            {formatCents(c.valorCents)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </SecaoCard>
              )}
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

// Dias até o vencimento — comparação DATE-ONLY (evita off-by-one por hora/timezone).
// Negativo = vencido; 0 = vence hoje.
function diasAteVencimento(dataVencimento: Date | string): number {
  const v = new Date(dataVencimento);
  const venc = new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const h = new Date();
  const hoje = new Date(h.getFullYear(), h.getMonth(), h.getDate());
  return Math.round((venc.getTime() - hoje.getTime()) / 86400000);
}

// Inadimplente = mensalidade vencida (data), OU status gravado como INADIMPLENTE
// (ex.: marcado manualmente em /cobrancas). Nenhum job automático atualiza o status
// guardado quando a data vence, então não dá pra confiar só nele — mesmo motivo da
// correção em mensalidadeInfo() abaixo.
function estaInadimplente(a: Aluno): boolean {
  if (a.status === "INADIMPLENTE") return true;
  const venc = a.matriculas[0]?.dataVencimento;
  return !!venc && diasAteVencimento(venc) < 0;
}

// Situação da mensalidade DERIVADA da data (não do status guardado — corrige o "Em dia" errado)
function mensalidadeInfo(
  dataVencimento: Date | string | null | undefined,
): { texto: string; sub: string | null; cor: string } {
  if (!dataVencimento) return { texto: "Sem plano", sub: null, cor: "var(--text-tertiary)" };
  const dias = diasAteVencimento(dataVencimento);
  if (dias < 0) return { texto: `Vencido há ${-dias}d`, sub: formatData(dataVencimento), cor: "var(--danger-text)" };
  if (dias === 0) return { texto: "Vence hoje", sub: formatData(dataVencimento), cor: "var(--danger-text)" };
  if (dias < 3) return { texto: `Vence em ${dias}d`, sub: formatData(dataVencimento), cor: "var(--danger-text)" };
  if (dias <= 7) return { texto: `Vence em ${dias}d`, sub: formatData(dataVencimento), cor: "var(--warning-text)" };
  return { texto: "Em dia", sub: `vence ${formatData(dataVencimento)}`, cor: "var(--success-text)" };
}

function avatarInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-emerald-500/30 text-emerald-300",
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

type SortKey = "nome" | "desde" | "aniversario" | "vencimento";

export function AlunosPageClient({ alunos, planos, tenantId, stats, temFinanceiro }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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
      if (filtroStatus === "NOVO") {
        matchStatus = ehNovo(dataEntrada(a));
      } else if (filtroStatus === "VENCENDO") {
        matchStatus = !!a.matriculas[0] && isVencendo(a.matriculas[0].dataVencimento);
      } else if (filtroStatus === "INADIMPLENTE") {
        matchStatus = estaInadimplente(a);
      } else if (filtroStatus !== "todos") {
        matchStatus = a.status === filtroStatus;
      }
      return matchBusca && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "nome") {
        cmp = a.nome.localeCompare(b.nome, "pt-BR");
      } else if (sortKey === "desde") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortKey === "aniversario") {
        const da = diasAteAniversario(a.dataNascimento);
        const db = diasAteAniversario(b.dataNascimento);
        // sem data de nascimento sempre vai pro fim, em qualquer direção
        if (da == null && db == null) cmp = 0;
        else if (da == null) return 1;
        else if (db == null) return -1;
        else cmp = da - db;
      } else if (sortKey === "vencimento") {
        const va = a.matriculas[0]?.dataVencimento;
        const vb = b.matriculas[0]?.dataVencimento;
        // sem matrícula sempre vai pro fim, em qualquer direção
        if (!va && !vb) cmp = 0;
        else if (!va) return 1;
        else if (!vb) return -1;
        else cmp = new Date(va).getTime() - new Date(vb).getTime();
      }
      if (cmp === 0) cmp = a.nome.localeCompare(b.nome, "pt-BR"); // desempate estável por nome
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totais = {
    todos: alunos.length,
    ATIVO: alunos.filter((a) => a.status === "ATIVO").length,
    NOVO: alunos.filter((a) => ehNovo(dataEntrada(a))).length,
    INADIMPLENTE: alunos.filter(estaInadimplente).length,
    INATIVO: alunos.filter((a) => a.status === "INATIVO").length,
    VENCENDO: alunos.filter((a) => !!a.matriculas[0] && isVencendo(a.matriculas[0].dataVencimento)).length,
  };

  // "Pra fazer hoje" — relacionamento manual (sem cobrança/automação)
  const aniversariantes = alunos.filter((a) => {
    const d = diasAteAniversario(a.dataNascimento);
    return d !== null && d <= 7;
  });
  const parqPendentes = alunos.filter((a) => a.precisaLiberacaoMedica);

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

  // Cabeçalho de coluna clicável (ordena; clica de novo inverte a direção)
  const sortHeader = (label: string, col: SortKey, className: string) => {
    const active = sortKey === col;
    return (
      <button
        type="button"
        onClick={() => {
          if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
          else {
            setSortKey(col);
            setSortDir("asc");
          }
        }}
        className={`items-center gap-1 uppercase tracking-wider transition hover:text-foreground ${
          active ? "text-foreground" : "text-muted"
        } ${className}`}
      >
        {label}
        <span className={`text-[9px] leading-none ${active ? "text-brand" : "text-muted/40"}`}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    );
  };

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="font-display mt-1 text-2xl font-bold uppercase tracking-tight text-white">Alunos</h1>
          <p className="mt-1 text-sm text-muted">Seus alunos organizados — um alô no WhatsApp a um clique.</p>
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

      {/* Pra fazer hoje — relacionamento manual */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Aniversariantes da semana */}
        <div className="rounded-2xl border border-line bg-surface/60 p-4">
          <div className="flex items-center gap-2">
            <Cake size={14} className="text-muted" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Aniversariantes</p>
            {aniversariantes.length > 0 && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "var(--warning-text)" }} />
            )}
          </div>
          <p className="font-display mt-2.5 text-[28px] font-bold leading-none tabular-nums text-white">
            {aniversariantes.length}
          </p>
          <p className="mt-1.5 text-[11px] text-muted">na semana · mande os parabéns</p>
        </div>

        {/* Novos este mês — clicável, filtra a lista */}
        <button
          type="button"
          onClick={() => setFiltroStatus(filtroStatus === "NOVO" ? "todos" : "NOVO")}
          className={`rounded-2xl border bg-surface/60 p-4 text-left transition hover:border-white/15 ${
            filtroStatus === "NOVO" ? "border-brand/40" : "border-line"
          }`}
        >
          <div className="flex items-center gap-2">
            <UserPlus size={14} className="text-muted" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Novos este mês</p>
            {totais.NOVO > 0 && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            )}
          </div>
          <p className="font-display mt-2.5 text-[28px] font-bold leading-none tabular-nums text-white">
            {totais.NOVO}
          </p>
          <p className="mt-1.5 text-[11px] text-muted">
            {filtroStatus === "NOVO" ? "filtrando · clique p/ limpar" : "dê as boas-vindas · filtrar"}
          </p>
        </button>

        {/* PAR-Q pendente */}
        <div className="rounded-2xl border border-line bg-surface/60 p-4">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-muted" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">PAR-Q pendente</p>
            {parqPendentes.length > 0 && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "var(--warning-text)" }} />
            )}
          </div>
          <p className="font-display mt-2.5 text-[28px] font-bold leading-none tabular-nums text-white">
            {parqPendentes.length}
          </p>
          <p className="mt-1.5 text-[11px] text-muted">avaliação não assinada</p>
        </div>
      </div>

      {/* Segmentos + busca */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface/60 p-1">
          {[
            { key: "todos",        label: "Todos",        count: totais.todos,         danger: false },
            { key: "ATIVO",        label: "Ativos",       count: totais.ATIVO,         danger: false },
            { key: "NOVO",         label: "Novos",        count: totais.NOVO,          danger: false },
            { key: "VENCENDO",     label: "Vencendo",     count: totais.VENCENDO,      danger: true  },
            { key: "INADIMPLENTE", label: "Inadimplentes",count: totais.INADIMPLENTE,  danger: true  },
            { key: "INATIVO",      label: "Inativos",     count: totais.INATIVO,       danger: false },
          ]
            .filter((s) => temFinanceiro || !s.danger)
            .map(({ key, label, count, danger }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFiltroStatus(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filtroStatus === key
                  ? danger
                    ? "bg-red-500/15 text-red-400"
                    : "bg-white/[0.07] text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
              <span className={`font-mono text-[11px] ${
                filtroStatus === key
                  ? danger ? "text-red-400" : "text-brand"
                  : count > 0 && danger ? "text-red-400/60" : "text-muted"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[220px] flex-1 sm:flex-none">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-line bg-surface/60 py-2.5 pl-9 pr-4 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
            placeholder="Buscar aluno, telefone…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
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
          <div className="flex items-center gap-3 border-b border-line/50 bg-white/[0.015] px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted">
            {sortHeader("Aluno", "nome", "flex flex-1")}
            <span className="hidden w-24 md:block">Plano</span>
            {sortHeader("Aluno desde", "desde", "hidden w-24 lg:flex")}
            {sortHeader("Aniversário", "aniversario", "hidden w-28 lg:flex")}
            <span className="hidden flex-1 xl:block">Observação</span>
            {temFinanceiro && sortHeader("Mensalidade", "vencimento", "hidden w-36 lg:flex")}
            <span className="w-24">Status</span>
            <span className="w-14 text-right">Whats</span>
          </div>

          <div className="divide-y divide-line/30">
            {alunosFiltrados.map((aluno) => {
              const matriculaAtiva = aluno.matriculas[0];
              const anivLabel = labelAniversario(diasAteAniversario(aluno.dataNascimento));
              const st = aluno.status;
              const chip =
                estaInadimplente(aluno)
                  ? { t: "Atrasado", c: "var(--warning-text)", bg: "rgba(224,179,65,.10)" }
                  : st === "ATIVO"
                    ? { t: "Ativo", c: "var(--success-text)", bg: "rgba(37,211,102,.10)" }
                    : { t: st === "SUSPENSO" ? "Suspenso" : "Inativo", c: "var(--text-tertiary)", bg: "rgba(255,255,255,.05)" };

              return (
                <div
                  key={aluno.id}
                  onClick={() => setAlunoSelecionadoId(aluno.id)}
                  className="flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-white/[0.02]"
                >
                  {/* Aluno */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {aluno.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={aluno.fotoUrl}
                        alt={aluno.nome}
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${avatarColor(aluno.nome)}`}>
                        {avatarInitials(aluno.nome)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-white">{aluno.nome}</span>
                        {ehNovo(matriculaAtiva?.dataInicio ?? aluno.createdAt) && (
                          <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand">novo</span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-muted">{aluno.telefone}</span>
                    </div>
                  </div>

                  {/* Plano */}
                  <div className="hidden w-24 md:block">
                    {matriculaAtiva ? (
                      <span className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted">
                        {matriculaAtiva.plano.periodicidade.charAt(0) + matriculaAtiva.plano.periodicidade.slice(1).toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>

                  {/* Aluno desde */}
                  <div className="hidden w-24 font-mono text-[12px] text-muted lg:block">
                    {tempoDeCasa(matriculaAtiva?.dataInicio ?? aluno.createdAt)}
                  </div>

                  {/* Aniversário */}
                  <div className="hidden w-28 lg:block">
                    {anivLabel ? (
                      <span className="font-mono text-[11.5px]" style={{ color: "var(--warning-text)" }}>{anivLabel}</span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>

                  {/* Observação */}
                  <div className="hidden flex-1 truncate text-[12.5px] text-muted xl:block">
                    {aluno.observacoes || "—"}
                  </div>

                  {/* Mensalidade — derivada ao vivo da data (gated no Financeiro) */}
                  {temFinanceiro && (
                    <div className="hidden w-36 lg:block">
                      {(() => {
                        const info = mensalidadeInfo(matriculaAtiva?.dataVencimento);
                        return (
                          <>
                            <span className="font-mono text-[12px] font-semibold" style={{ color: info.cor }}>
                              {info.texto}
                            </span>
                            {info.sub && (
                              <span className="block font-mono text-[10px] text-muted">{info.sub}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Status */}
                  <div className="w-24">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ color: chip.c, background: chip.bg }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.c }} />
                      {chip.t}
                    </span>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex w-14 justify-end" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`https://wa.me/${aluno.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir conversa no WhatsApp"
                      className="rounded-lg border p-1.5 transition hover:brightness-110"
                      style={{ color: "var(--accent)", borderColor: "rgba(37,211,102,.28)" }}
                    >
                      <MessageCircle size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-line/30 px-5 py-2.5 text-xs text-muted">
            Mostrando {alunosFiltrados.length} de {alunos.length} alunos
            {" · ordenado por "}
            {{ nome: "nome", desde: "aluno desde", aniversario: "aniversário", vencimento: "vencimento" }[sortKey]}
            {sortDir === "asc" ? " ↑" : " ↓"}
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
            label: `Aniversariantes (${aniversariantes.length})`,
            Icon: <Users size={14} />,
            onClick: () => {},
          },
        ]}
      />
    </section>
  );
}
