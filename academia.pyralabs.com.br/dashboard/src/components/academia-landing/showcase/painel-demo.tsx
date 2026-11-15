"use client";

import { useEffect, useState } from "react";

// Espelha a "Visão geral" real do painel: cards de alunos ativos / inadimplentes /
// receita do mês, gráfico de receita mensal e a lista de quem vence ou está atrasado.
// Números ilustrativos.

const RECEITA = [9.8, 11.2, 10.4, 12.6, 13.1, 14.2]; // mil R$, últimos 6 meses
const MIN_V = Math.min(...RECEITA);
const MAX_V = Math.max(...RECEITA);
// altura em % com piso de 25%, pra diferença entre os meses aparecer
const altura = (v: number) => 25 + ((v - MIN_V) / (MAX_V - MIN_V)) * 70;

const LISTAS = {
  vencer: [
    { nome: "Júlia Reis", plano: "Mensal", dias: 2, valor: "89,90" },
    { nome: "Pedro Alves", plano: "Trimestral", dias: 4, valor: "239,70" },
    { nome: "Bruno Costa", plano: "Mensal", dias: 6, valor: "89,90" },
  ],
  atrasados: [
    { nome: "Rafael Melo", plano: "Mensal", dias: -3, valor: "89,90" },
    { nome: "Beatriz Nunes", plano: "Mensal", dias: -6, valor: "89,90" },
    { nome: "Lucas Rocha", plano: "Trimestral", dias: -11, valor: "239,70" },
  ],
} as const;

type Aba = keyof typeof LISTAS;

function dataDaqui(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function Metric({ label, value, nota, cor }: { label: string; value: string; nota: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#161419] px-3.5 py-3">
      <p className="text-[11px] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight" style={{ color: cor }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{nota}</p>
    </div>
  );
}

export function PainelDemo() {
  const [hover, setHover] = useState<number | null>(null);
  const [aba, setAba] = useState<Aba>("atrasados");
  // meses e datas só no cliente, pra não divergir do HTML do servidor
  const [meses, setMeses] = useState<string[]>([]);
  const [datas, setDatas] = useState<Record<Aba, string[]>>({ vencer: [], atrasados: [] });

  useEffect(() => {
    const hoje = new Date();
    setMeses(
      RECEITA.map((_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - (RECEITA.length - 1 - i), 1);
        return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      })
    );
    setDatas({
      vencer: LISTAS.vencer.map((a) => dataDaqui(a.dias)),
      atrasados: LISTAS.atrasados.map((a) => dataDaqui(a.dias)),
    });
  }, []);

  return (
    <div className="flex h-full flex-col gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Academia</p>
        <p className="text-base font-semibold">Visão geral</p>
      </div>

      {/* cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <Metric label="Alunos ativos" value="156" nota="+6 este mês" />
        <Metric label="Inadimplentes" value="4" nota="2,5% da base" cor="#f87171" />
        <Metric label="Receita do mês" value="R$ 14.240" nota="+8% vs mês passado" />
      </div>

      {/* receita mensal */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border)] bg-[#161419] p-4">
        <p className="mb-3 text-[12px] font-semibold">Receita mensal</p>
        <div className="flex min-h-0 flex-1 items-stretch justify-between gap-3">
          {RECEITA.map((v, i) => {
            const ultimo = i === RECEITA.length - 1;
            return (
              <div
                key={i}
                className="relative flex flex-1 flex-col justify-end"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {hover === i && (
                  <span
                    className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-semibold shadow-lg"
                    style={{ bottom: `${altura(v)}%` }}
                  >
                    R$ {v.toFixed(1).replace(".", ",")} mil
                  </span>
                )}
                <div
                  className={`w-full rounded-t-md transition-colors ${
                    ultimo || hover === i ? "bg-[var(--wpp)]" : "bg-white/[0.14]"
                  }`}
                  style={{ height: `${altura(v)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between gap-3">
          {RECEITA.map((_, i) => (
            <span key={i} className="flex-1 text-center text-[10px] text-[var(--text-tertiary)]">
              {meses[i] ?? ""}
            </span>
          ))}
        </div>
      </div>

      {/* quem vence / quem deve */}
      <div className="rounded-xl border border-[var(--border)] bg-[#161419] p-3">
        <div className="mb-2 flex gap-1 text-[11px] font-medium">
          {(
            [
              ["atrasados", "Atrasados"],
              ["vencer", "Vencendo esta semana"],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                aba === id
                  ? "bg-white/[0.08] text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          {LISTAS[aba].map((a, i) => (
            <div key={a.nome} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.03]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold">
                {a.nome[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold">{a.nome}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {a.plano} · {aba === "atrasados" ? "venceu" : "vence"} {datas[aba][i] ?? ""}
                </p>
              </div>
              <span className="text-[12px] font-semibold">R$ {a.valor}</span>
              <span
                className={`w-[64px] shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-semibold ${
                  aba === "atrasados" ? "bg-red-500/15 text-red-300" : "bg-white/[0.06] text-[var(--text-secondary)]"
                }`}
              >
                {aba === "atrasados" ? "Vencido" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
