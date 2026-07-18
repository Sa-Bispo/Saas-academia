"use client";

import { useState } from "react";

type Periodo = "semana" | "mes";

const DADOS: Record<
  Periodo,
  { receita: string; ativos: string; freq: string; labels: string[]; barras: number[] }
> = {
  semana: {
    receita: "R$ 2.480",
    ativos: "142",
    freq: "68%",
    labels: ["S", "T", "Q", "Q", "S", "S", "D"],
    barras: [40, 65, 52, 78, 90, 72, 30],
  },
  mes: {
    receita: "R$ 11.240",
    ativos: "156",
    freq: "74%",
    labels: ["S1", "S2", "S3", "S4"],
    barras: [62, 80, 71, 95],
  },
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#161419] px-3.5 py-3">
      <p className="font-mono text-xl font-bold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{label}</p>
    </div>
  );
}

export function PainelDemo() {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [hover, setHover] = useState<number | null>(null);
  const d = DADOS[periodo];

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      {/* toggle período */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Visão geral</p>
        <div className="flex rounded-lg border border-[var(--border)] bg-[#161419] p-0.5 text-xs">
          {(["semana", "mes"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                periodo === p
                  ? "bg-white/[0.08] text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {p === "mes" ? "Mês" : "Semana"}
            </button>
          ))}
        </div>
      </div>

      {/* métricas */}
      <div className="grid grid-cols-3 gap-2.5">
        <Metric label="Receita" value={d.receita} />
        <Metric label="Alunos ativos" value={d.ativos} />
        <Metric label="Frequência" value={d.freq} />
      </div>

      {/* gráfico de barras */}
      <div className="flex flex-1 flex-col rounded-xl border border-[var(--border)] bg-[#161419] p-4">
        <div className="flex flex-1 items-end justify-between gap-2">
          {d.barras.map((h, i) => (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === i && (
                <span className="absolute -top-1 z-10 -translate-y-full rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-primary)] shadow-lg">
                  {h}%
                </span>
              )}
              <div
                className="w-full rounded-t-md bg-[var(--wpp)]/70 transition-all duration-500 ease-out group-hover:bg-[var(--wpp)]"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between gap-2">
          {d.labels.map((l, i) => (
            <span
              key={i}
              className="flex-1 text-center font-mono text-[10px] text-[var(--text-tertiary)]"
            >
              {l}
            </span>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-[var(--text-tertiary)]">
        Frequência por dia · passe o mouse nas barras
      </p>
    </div>
  );
}
