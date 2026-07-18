"use client";

import { AlertTriangle, Package } from "lucide-react";

export function LiveStockDashboardCard() {
  return (
    <article className="group relative overflow-visible rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10">
      <div className="mb-3 flex items-center gap-2 px-1">
        <Package className="text-brand" size={16} />
        <p className="text-sm font-semibold text-slate-800">Estoque</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(155deg,#071427,#0d2038)] p-4 shadow-[0_30px_50px_-20px_rgba(2,6,23,0.72)]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">Gestao de estoque</p>
        <h4 className="mt-1 text-[13px] font-semibold text-white">Estoque & Cardapio</h4>
        <p className="mt-0.5 text-[10px] text-slate-400">Adega Demo • 6 produtos cadastrados</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,rgba(14,31,54,0.8),rgba(10,22,39,0.95))] p-3">
          <div className="mb-1.5 flex items-center justify-between text-[9px]">
            <span className="font-semibold tracking-wide text-emerald-200">Consumo semanal ao vivo</span>
            <span className="rounded-full border border-brand/30 bg-brand/10 px-1.5 py-0.5 text-brand">
              atualizando
            </span>
          </div>

          <div className="relative mb-2 h-11 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/70 px-1.5 pt-1">
            <div className="absolute inset-y-0 left-0 w-10 animate-[chartSweep_2.8s_linear_infinite] bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent" />

            <svg viewBox="0 0 120 28" className="h-full w-full">
              <path
                d="M4 22 L20 18 L34 20 L50 14 L64 16 L80 10 L96 12 L114 8"
                fill="none"
                stroke="rgb(0 168 132)"
                strokeWidth="2"
                strokeLinecap="round"
                className="sparkline"
              />
              <path
                d="M4 26 L4 22 L20 18 L34 20 L50 14 L64 16 L80 10 L96 12 L114 8 L114 26 Z"
                fill="url(#stockGradient)"
                className="spark-area"
              />
              <defs>
                <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0,168,132,0.34)" />
                  <stop offset="100%" stopColor="rgba(0,168,132,0.03)" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="grid grid-cols-7 items-end gap-1">
            {[35, 48, 42, 58, 51, 67, 61].map((height, idx) => (
              <div key={height} className="flex flex-col items-center gap-1">
                <span
                  className="chart-bar w-full rounded-sm bg-gradient-to-t from-brand/75 to-emerald-300/85"
                  style={{ height: `${height}%`, animationDelay: `${idx * 0.12}s` }}
                />
                <span className="text-[8px] text-slate-500">{["S", "T", "Q", "Q", "S", "S", "D"][idx]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5 text-[9px]">
          <div className="rounded-md border border-slate-600 bg-slate-800/80 p-1.5 text-slate-300">
            Total
            <p className="counter-up text-sm font-semibold text-white">6</p>
          </div>
          <div className="rounded-md border border-slate-600 bg-slate-800/80 p-1.5 text-slate-300">
            Em estoque
            <p className="text-sm font-semibold text-white">3</p>
          </div>
          <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-1.5 text-amber-200">
            Baixo
            <p className="text-sm font-semibold text-amber-300">2</p>
          </div>
          <div className="rounded-md border border-rose-400/30 bg-rose-500/10 p-1.5 text-rose-200">
            Esgotados
            <p className="text-sm font-semibold text-rose-300">1</p>
          </div>
        </div>

        <div className="mt-2 overflow-hidden rounded-md border border-slate-700 bg-slate-800/60">
          <div className="grid grid-cols-3 text-[9px] font-medium text-slate-300">
            <span className="bg-brand px-2 py-1 text-slate-950">Produtos</span>
            <span className="px-2 py-1 text-center">Combos</span>
            <span className="px-2 py-1 text-center">Mov.</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5">
            <div className="grid grid-cols-[1.5fr_0.8fr_1fr] items-center gap-2 text-[10px] text-slate-200">
              <span>Red Bull 250ml</span>
              <span className="font-medium">2 un</span>
              <span className="inline-flex items-center justify-center gap-1 rounded-full border border-rose-400/50 bg-rose-500/20 px-2 py-1 text-[9px] font-semibold text-rose-200">
                <AlertTriangle size={10} />
                Estoque Baixo
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5">
            <div className="grid grid-cols-[1.5fr_0.8fr_1fr] items-center gap-2 text-[10px] text-slate-200">
              <span>Heineken 600ml</span>
              <span className="font-medium">4 un</span>
              <span className="inline-flex items-center justify-center gap-1 rounded-full border border-rose-400/50 bg-rose-500/20 px-2 py-1 text-[9px] font-semibold text-rose-200">
                <AlertTriangle size={10} />
                Estoque Baixo
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5">
            <div className="grid grid-cols-[1.5fr_0.8fr_1fr] items-center gap-2 text-[10px] text-slate-200">
              <span>Smirnoff 998ml</span>
              <span className="font-medium">18 un</span>
              <span className="inline-flex items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-[9px] font-semibold text-emerald-300">
                Estoque OK
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .counter-up {
          display: inline-block;
          animation: counterBlink 2.8s ease-in-out infinite;
        }

        .sparkline {
          stroke-dasharray: 140;
          stroke-dashoffset: 140;
          animation: drawLine 2.4s ease-in-out infinite;
        }

        .spark-area {
          animation: areaFade 2.4s ease-in-out infinite;
          transform-origin: bottom;
        }

        .chart-bar {
          min-height: 5px;
          animation: barPulse 1.8s ease-in-out infinite;
        }

        @keyframes drawLine {
          0%,
          15% {
            stroke-dashoffset: 140;
            opacity: 0.5;
          }
          50%,
          80% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 140;
            opacity: 0.5;
          }
        }

        @keyframes counterBlink {
          0%,
          100% {
            opacity: 1;
          }
          45% {
            opacity: 0.7;
          }
          55% {
            opacity: 1;
          }
        }

        @keyframes areaFade {
          0%,
          100% {
            opacity: 0.45;
          }
          50% {
            opacity: 0.9;
          }
        }

        @keyframes barPulse {
          0%,
          100% {
            opacity: 0.75;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }

        @keyframes chartSweep {
          0% {
            transform: translateX(-140%);
          }
          100% {
            transform: translateX(500%);
          }
        }
      `}</style>
    </article>
  );
}
