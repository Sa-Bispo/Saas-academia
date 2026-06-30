"use client";

import { useState, useTransition } from "react";
import { Plus, Dumbbell, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from "lucide-react";

import {
  criarPlanoAcademia,
  atualizarPlanoAcademia,
  excluirPlanoAcademia,
} from "@/actions/planos-academia.actions";

type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  valorCents: number;
  valorCentsDinheiro: number | null;
  valorCentsPix: number | null;
  periodicidade: string;
  ativo: boolean;
  createdAt: Date;
};

type Props = { planos: Plano[] };

const PERIODICIDADE_LABEL: Record<string, string> = {
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Modal criar/editar ───────────────────────────────────────────────────────

function ModalPlano({
  plano,
  onClose,
}: {
  plano?: Plano;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState(plano?.nome ?? "");
  const [descricao, setDescricao] = useState(plano?.descricao ?? "");
  const [valor, setValor] = useState(plano ? String(plano.valorCents / 100).replace(".", ",") : "");
  const [valorDinheiro, setValorDinheiro] = useState(
    plano?.valorCentsDinheiro ? String(plano.valorCentsDinheiro / 100).replace(".", ",") : ""
  );
  const [valorPix, setValorPix] = useState(
    plano?.valorCentsPix ? String(plano.valorCentsPix / 100).replace(".", ",") : ""
  );
  const [periodicidade, setPeriodicidade] = useState<"MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL">(
    (plano?.periodicidade as "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL") ?? "MENSAL"
  );
  const [erro, setErro] = useState<string | null>(null);

  const isEditing = Boolean(plano);

  async function handleSalvar() {
    if (!nome.trim() || !valor) return;
    const valorCents = Math.round(parseFloat(valor.replace(",", ".")) * 100);
    if (isNaN(valorCents) || valorCents <= 0) return;

    const valorCentsDinheiro = valorDinheiro
      ? Math.round(parseFloat(valorDinheiro.replace(",", ".")) * 100)
      : null;
    const valorCentsPix = valorPix
      ? Math.round(parseFloat(valorPix.replace(",", ".")) * 100)
      : null;

    setErro(null);
    startTransition(async () => {
      try {
        if (isEditing && plano) {
          await atualizarPlanoAcademia(plano.id, {
            nome,
            descricao: descricao || undefined,
            valorCents,
            valorCentsDinheiro,
            valorCentsPix,
            periodicidade,
          });
        } else {
          await criarPlanoAcademia({
            nome,
            descricao: descricao || undefined,
            valorCents,
            valorCentsDinheiro,
            valorCentsPix,
            periodicidade,
          });
        }
        onClose();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar plano.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {isEditing ? "Editar plano" : "Novo plano"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Nome do plano *</label>
            <input
              className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
              placeholder="Ex: Plano Mensal, Plano Anual..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Valor padrão (R$) *</label>
              <input
                className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                placeholder="99,90"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Periodicidade *</label>
              <select
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                value={periodicidade}
                onChange={(e) => setPeriodicidade(e.target.value as typeof periodicidade)}
              >
                <option value="MENSAL">Mensal</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-line/50 bg-white/[0.02] p-3 space-y-3">
            <p className="text-xs font-medium text-muted">Valores por forma de pagamento (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">💵 Dinheiro (R$)</label>
                <input
                  className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                  placeholder="Ex: 90,00"
                  value={valorDinheiro}
                  onChange={(e) => setValorDinheiro(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">🔑 Pix (R$)</label>
                <input
                  className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
                  placeholder="Ex: 95,00"
                  value={valorPix}
                  onChange={(e) => setValorPix(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Descrição (opcional)</label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none resize-none"
              placeholder="Detalhes do plano, benefícios inclusos..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>

        {erro && <p className="px-5 pb-2 text-xs text-red-400">{erro}</p>}

        {/* Footer */}
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
            disabled={pending || !nome || !valor}
            onClick={handleSalvar}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            <Check size={14} />
            {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar plano"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PlanosAcademiaClient({ planos }: Props) {
  const [modalAberto, setModalAberto] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<Plano | undefined>();
  const [pending, startTransition] = useTransition();

  function handleToggleAtivo(plano: Plano) {
    startTransition(async () => {
      try {
        await atualizarPlanoAcademia(plano.id, { ativo: !plano.ativo });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao atualizar plano.");
      }
    });
  }

  function handleExcluir(plano: Plano) {
    if (!confirm(`Excluir o plano "${plano.nome}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      try {
        await excluirPlanoAcademia(plano.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao excluir plano.");
      }
    });
  }

  function abrirEdicao(plano: Plano) {
    setPlanoEditando(plano);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setPlanoEditando(undefined);
  }

  const ativos = planos.filter((p) => p.ativo);
  const inativos = planos.filter((p) => !p.ativo);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Planos</h1>
        </div>
        <button
          type="button"
          onClick={() => { setPlanoEditando(undefined); setModalAberto(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          <Plus size={15} />
          Novo plano
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface/60 p-4">
          <p className="text-xs text-muted">Total de planos</p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{planos.length}</p>
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

      {/* Lista de planos */}
      {planos.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-10 text-center">
          <Dumbbell size={32} className="mx-auto mb-3 text-muted/50" />
          <p className="text-sm text-muted">
            Nenhum plano cadastrado ainda. Clique em &quot;Novo plano&quot; para começar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
          {/* Header */}
          <div className="hidden grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b border-line/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted sm:grid">
            <span>Plano</span>
            <span>Valor</span>
            <span>Periodicidade</span>
            <span>Ações</span>
          </div>

          <div className="divide-y divide-line/30">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className={`grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-white/[0.02] sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-center sm:gap-4 ${
                  !plano.ativo ? "opacity-50" : ""
                }`}
              >
                {/* Nome */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={13} className={plano.ativo ? "text-brand" : "text-muted"} />
                    <p className="truncate text-sm font-medium text-white">{plano.nome}</p>
                    {!plano.ativo && (
                      <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                        Inativo
                      </span>
                    )}
                  </div>
                  {plano.descricao && (
                    <p className="mt-0.5 truncate text-xs text-muted">{plano.descricao}</p>
                  )}
                </div>

                {/* Valor */}
                <div>
                  <p className="text-sm font-semibold text-white tabular-nums">
                    {formatCents(plano.valorCents)}
                  </p>
                  {(plano.valorCentsDinheiro || plano.valorCentsPix) && (
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                      {plano.valorCentsDinheiro && (
                        <span className="text-[11px] text-muted">💵 {formatCents(plano.valorCentsDinheiro)}</span>
                      )}
                      {plano.valorCentsPix && (
                        <span className="text-[11px] text-muted">🔑 {formatCents(plano.valorCentsPix)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Periodicidade */}
                <p className="text-sm text-muted">
                  {PERIODICIDADE_LABEL[plano.periodicidade] ?? plano.periodicidade}
                </p>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title={plano.ativo ? "Desativar" : "Ativar"}
                    disabled={pending}
                    onClick={() => handleToggleAtivo(plano)}
                    className="rounded-lg border border-line p-1.5 text-muted transition hover:border-brand/30 hover:text-brand disabled:opacity-50"
                  >
                    {plano.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => abrirEdicao(plano)}
                    className="rounded-lg border border-line p-1.5 text-muted transition hover:border-brand/30 hover:text-brand"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    title="Excluir"
                    disabled={pending}
                    onClick={() => handleExcluir(plano)}
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
        <ModalPlano plano={planoEditando} onClose={fecharModal} />
      )}
    </section>
  );
}
