"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  Search,
  LogIn,
  LogOut,
  Clock,
  Users,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

import { registrarCheckIn, registrarCheckOut } from "@/actions/frequencia.actions";

type FrequenciaHoje = {
  id: string;
  horaEntrada: string | null;
  horaSaida: string | null;
  aluno: { id: string; nome: string; telefone: string; status: string };
};

type AlunoComFrequencia = {
  id: string;
  nome: string;
  telefone: string;
  status: string;
};

type Props = {
  alunos: AlunoComFrequencia[];
  presencasHoje: FrequenciaHoje[];
};

function hojeFormatado() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function FrequenciaPageClient({ alunos, presencasHoje }: Props) {
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"checkin" | "presentes">("checkin");
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // IDs dos alunos que já fizeram check-in hoje
  const presentesIds = new Set(presencasHoje.map((p) => p.aluno.id));
  // IDs dos alunos que ainda não fizeram check-out
  const semCheckoutIds = new Set(
    presencasHoje.filter((p) => !p.horaSaida).map((p) => p.aluno.id)
  );

  const alunosFiltrados = alunos.filter(
    (a) =>
      !busca ||
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.telefone.includes(busca)
  );

  function handleCheckIn(alunoId: string) {
    setLoadingId(alunoId);
    startTransition(async () => {
      await registrarCheckIn(alunoId);
      setLoadingId(null);
    });
  }

  function handleCheckOut(alunoId: string) {
    setLoadingId(alunoId);
    startTransition(async () => {
      await registrarCheckOut(alunoId);
      setLoadingId(null);
    });
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Frequência</h1>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-3 py-2">
          <CalendarDays size={13} className="text-muted" />
          <span className="text-xs text-muted capitalize">{hojeFormatado()}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface/60 p-4">
          <p className="text-xs text-muted">Ativos na academia</p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{alunos.length}</p>
        </div>
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <p className="text-xs text-muted">Presentes hoje</p>
          <p className="mt-2 text-2xl font-semibold text-brand tabular-nums">
            {presencasHoje.length}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-line bg-surface/60 p-4 sm:col-span-1">
          <p className="text-xs text-muted">Ainda na academia</p>
          <p className="mt-2 text-2xl font-semibold text-brand tabular-nums">
            {semCheckoutIds.size}
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface/60 p-1">
        {[
          { key: "checkin", label: "Check-in", icon: LogIn },
          { key: "presentes", label: `Presentes hoje (${presencasHoje.length})`, icon: CheckCircle2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setAba(key as "checkin" | "presentes")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              aba === key
                ? "bg-brand text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Busca (só na aba check-in) */}
      {aba === "checkin" && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-line bg-surface/60 py-2.5 pl-9 pr-4 text-sm text-white placeholder-muted focus:border-brand/50 focus:outline-none"
            placeholder="Buscar aluno por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}

      {/* Lista check-in */}
      {aba === "checkin" && (
        <>
          {alunosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface/60 p-10 text-center">
              <Users size={32} className="mx-auto mb-3 text-muted/50" />
              <p className="text-sm text-muted">Nenhum aluno ativo encontrado.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
              <div className="divide-y divide-line/30">
                {alunosFiltrados.map((aluno) => {
                  const presente = presentesIds.has(aluno.id);
                  const semSaida = semCheckoutIds.has(aluno.id);
                  const isLoading = loadingId === aluno.id && pending;

                  return (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-white/[0.02]"
                    >
                      {/* Info */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{aluno.nome}</p>
                        <p className="text-xs text-muted">{aluno.telefone}</p>
                      </div>

                      {/* Status + ação */}
                      <div className="flex shrink-0 items-center gap-2">
                        {presente && !semSaida && (
                          <span className="flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            <Clock size={9} />
                            Saiu
                          </span>
                        )}
                        {presente && semSaida && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            <Activity size={9} />
                            Presente
                          </span>
                        )}

                        {!presente ? (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleCheckIn(aluno.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand/20 disabled:opacity-50"
                          >
                            <LogIn size={12} />
                            {isLoading ? "..." : "Check-in"}
                          </button>
                        ) : semSaida ? (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleCheckOut(aluno.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand/30 hover:text-brand disabled:opacity-50"
                          >
                            <LogOut size={12} />
                            {isLoading ? "..." : "Check-out"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Lista presentes hoje */}
      {aba === "presentes" && (
        <>
          {presencasHoje.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface/60 p-10 text-center">
              <Activity size={32} className="mx-auto mb-3 text-muted/50" />
              <p className="text-sm text-muted">Nenhum check-in registrado hoje ainda.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
              {/* Cabeçalho */}
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-line/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted sm:grid">
                <span>Aluno</span>
                <span>Entrada</span>
                <span>Saída</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-line/30">
                {presencasHoje.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 gap-2 px-5 py-3.5 sm:grid-cols-[2fr_1fr_1fr_1fr] sm:items-center sm:gap-4"
                  >
                    <p className="text-sm font-medium text-white">{p.aluno.nome}</p>
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <LogIn size={10} />
                      {p.horaEntrada ?? "—"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <LogOut size={10} />
                      {p.horaSaida ?? "—"}
                    </span>
                    <span>
                      {p.horaSaida ? (
                        <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          Saiu
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <Activity size={9} />
                          Na academia
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
