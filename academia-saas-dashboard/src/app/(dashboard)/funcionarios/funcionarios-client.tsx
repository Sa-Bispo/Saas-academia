"use client";

import { useState, useTransition } from "react";
import { Plus, UserCheck, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight, Phone } from "lucide-react";
import {
  criarFuncionario,
  atualizarFuncionario,
  excluirFuncionario,
} from "@/actions/funcionarios.actions";

type Funcionario = {
  id: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  createdAt: Date;
};

type Props = { funcionarios: Funcionario[] };

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

function formatPhone(tel: string) {
  const d = tel.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return tel;
}

// ─── Modal criar/editar ───────────────────────────────────────────────────────

function ModalFuncionario({
  funcionario,
  onClose,
}: {
  funcionario?: Funcionario;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState(funcionario?.nome ?? "");
  const [telefone, setTelefone] = useState(funcionario ? formatPhone(funcionario.telefone) : "");
  const [erro, setErro] = useState<string | null>(null);

  const isEditing = Boolean(funcionario);

  function handleSalvar() {
    if (!nome.trim() || !telefone.replace(/\D/g, "")) return;
    setErro(null);
    startTransition(async () => {
      try {
        if (isEditing && funcionario) {
          await atualizarFuncionario(funcionario.id, { nome, telefone });
        } else {
          await criarFuncionario({ nome, telefone });
        }
        onClose();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {isEditing ? "Editar funcionário" : "Novo funcionário"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Nome *</label>
            <input
              className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
              placeholder="Ex: Maria Recepção"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">WhatsApp *</label>
            <input
              className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
            />
            <p className="mt-1 text-xs text-muted">
              Número usado para confirmar pagamentos via bot.
            </p>
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
            disabled={pending || !nome.trim() || !telefone.replace(/\D/g, "")}
            onClick={handleSalvar}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            <Check size={14} />
            {pending ? "Salvando..." : isEditing ? "Salvar" : "Criar funcionário"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FuncionariosClient({ funcionarios }: Props) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Funcionario | undefined>();
  const [pending, startTransition] = useTransition();

  function handleToggle(f: Funcionario) {
    startTransition(async () => {
      try {
        await atualizarFuncionario(f.id, { ativo: !f.ativo });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  function handleExcluir(f: Funcionario) {
    if (!confirm(`Remover "${f.nome}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      try {
        await excluirFuncionario(f.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  const ativos = funcionarios.filter((f) => f.ativo);
  const inativos = funcionarios.filter((f) => !f.ativo);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Funcionários</h1>
        </div>
        <button
          type="button"
          onClick={() => { setEditando(undefined); setModalAberto(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          <Plus size={15} />
          Novo funcionário
        </button>
      </div>

      {/* Info box */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-indigo-300/80 leading-relaxed">
        <p className="font-semibold text-indigo-300 mb-1">Como funciona o pagamento em dinheiro via bot</p>
        <p>
          Quando um aluno escolhe pagar em dinheiro, o bot gera um código (ex: <span className="font-mono font-semibold">#A3K7B2</span>).
          O aluno apresenta o código na recepção. O funcionário envia o código pelo WhatsApp para o bot,
          que registra o pagamento e envia automaticamente o recibo para o aluno.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface/60 p-4">
          <p className="text-xs text-muted">Total</p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{funcionarios.length}</p>
        </div>
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <p className="text-xs text-muted">Ativos</p>
          <p className="mt-2 text-2xl font-semibold text-brand tabular-nums">{ativos.length}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-line bg-surface/60 p-4 sm:col-span-1">
          <p className="text-xs text-muted">Inativos</p>
          <p className="mt-2 text-2xl font-semibold text-muted tabular-nums">{inativos.length}</p>
        </div>
      </div>

      {funcionarios.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-10 text-center">
          <UserCheck size={32} className="mx-auto mb-3 text-muted/50" />
          <p className="text-sm text-muted">
            Nenhum funcionário cadastrado. Adicione recepcionistas ou professores para habilitar o pagamento em dinheiro via bot.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
          <div className="hidden grid-cols-[2fr_1fr_auto] gap-4 border-b border-line/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted sm:grid">
            <span>Nome</span>
            <span>WhatsApp</span>
            <span>Ações</span>
          </div>
          <div className="divide-y divide-line/30">
            {funcionarios.map((f) => (
              <div
                key={f.id}
                className={`grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-white/[0.02] sm:grid-cols-[2fr_1fr_auto] sm:items-center sm:gap-4 ${!f.ativo ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck size={13} className={f.ativo ? "text-brand shrink-0" : "text-muted shrink-0"} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{f.nome}</p>
                    {!f.ativo && (
                      <span className="text-[10px] text-slate-400">Inativo</span>
                    )}
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <Phone size={11} />
                  {formatPhone(f.telefone)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title={f.ativo ? "Desativar" : "Ativar"}
                    disabled={pending}
                    onClick={() => handleToggle(f)}
                    className="rounded-lg border border-line p-1.5 text-muted transition hover:border-brand/30 hover:text-brand disabled:opacity-50"
                  >
                    {f.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => { setEditando(f); setModalAberto(true); }}
                    className="rounded-lg border border-line p-1.5 text-muted transition hover:border-brand/30 hover:text-brand"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    title="Remover"
                    disabled={pending}
                    onClick={() => handleExcluir(f)}
                    className="rounded-lg border border-line p-1.5 text-muted transition hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalAberto && (
        <ModalFuncionario funcionario={editando} onClose={() => { setModalAberto(false); setEditando(undefined); }} />
      )}
    </section>
  );
}
