"use client";

import { MousePointer2, ShoppingBag } from "lucide-react";

export function LiveKanbanCard() {
  return (
    <article className="group relative flex h-full flex-col overflow-visible rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10">
      <div className="mb-3 flex items-center gap-2 px-1">
        <ShoppingBag className="text-brand" size={16} />
        <p className="text-sm font-semibold text-slate-800">Gestao de Pedidos</p>
      </div>

      <div className="kanban-board relative flex min-h-[442px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(155deg,#071427,#0d2038)] p-4 shadow-[0_30px_50px_-20px_rgba(2,6,23,0.72)]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
        <h4 className="mt-1 text-[13px] font-semibold text-white">Gestao de Pedidos (Ao Vivo)</h4>

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-300">
          <span>Acompanhe o fluxo em tempo real</span>
          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">
            ao vivo
          </span>
        </div>

        <div className="mt-3 grid flex-1 grid-cols-2 gap-3">
          <div className="rounded-xl border border-rose-400/30 bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-200">Novos Pedidos</p>
              <span className="badge-pulse rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] text-rose-300">2</span>
            </div>
            <div className="space-y-2.5">
              <article className="queue-card rounded-xl border border-slate-700 bg-slate-800/70 p-2.5 text-[10px] text-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">#3512</p>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] text-rose-300">novo</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-100">Combo Heineken</p>
              </article>
              <article className="queue-card rounded-xl border border-slate-700 bg-slate-800/70 p-2.5 text-[10px] text-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">#3516</p>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] text-amber-300">urgente</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-100">Whisky + Energetico</p>
              </article>
            </div>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-200">Em Preparo</p>
              <span className="badge-pulse rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] text-amber-300">2</span>
            </div>
            <div className="space-y-2.5">
              <article className="pickup-card rounded-xl border border-brand/40 bg-brand/10 p-2.5 text-[10px] text-brand">
                <div className="flex items-center justify-between gap-2 text-brand">
                  <p className="font-semibold">#3498</p>
                  <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[9px]">preparo</span>
                </div>
                <p className="mt-1 text-[10px] text-brand/90">Kit Gin Tonica</p>
              </article>
              <article className="queue-card rounded-xl border border-slate-700 bg-slate-800/70 p-2.5 text-[10px] text-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">#3505</p>
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[9px] text-cyan-300">separando</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-100">Skol 700ml (x12)</p>
              </article>
            </div>
          </div>
        </div>

        <div className="drag-card pointer-events-none absolute left-[34%] top-[164px] rounded-xl border border-brand/40 bg-brand/15 px-2 py-1.5 text-[9px] text-brand shadow-lg shadow-brand/25">
          #3498 Kit Gin Tonica
        </div>

        <div className="cursor-pointer-ui pointer-events-none absolute left-[33%] top-[156px] text-brand">
          <MousePointer2 size={14} />
        </div>

        <div className="click-ring pointer-events-none absolute left-[34.5%] top-[167px] h-2.5 w-2.5 rounded-full border border-brand/70" />

        <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-slate-400">
          <span className="truncate">3 pedidos em andamento</span>
          <span className="truncate text-right text-emerald-300">Tempo medio: 17 min</span>
        </div>

        <div className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/40 px-2 py-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/70">
            <span className="status-progress block h-full w-1/2 rounded-full bg-gradient-to-r from-brand/70 via-cyan-300/80 to-emerald-300/80" />
          </div>
          <p className="mt-1 text-center text-[8px] text-slate-400">fluxo de pedidos em atualizacao continua</p>
        </div>
      </div>

      <style jsx>{`
        .queue-card {
          animation: cardFloat 4.6s ease-in-out infinite;
        }

        .pickup-card {
          animation: pickupPulse 6.5s ease-in-out infinite;
          transform-origin: center;
        }

        .badge-pulse {
          animation: badgePulse 2.2s ease-in-out infinite;
        }

        .drag-card {
          opacity: 0;
          animation: dragMove 6.5s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
        }

        .cursor-pointer-ui {
          opacity: 0;
          animation: cursorMove 6.5s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
        }

        .click-ring {
          opacity: 0;
          animation: clickPulse 6.5s ease-out infinite;
        }

        .status-progress {
          animation: progressRun 3.2s ease-in-out infinite;
        }

        @keyframes cardFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-1px);
          }
        }

        @keyframes badgePulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
          45% {
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
          }
        }

        @keyframes pickupPulse {
          0%,
          24%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(16, 185, 129, 0);
          }
          30%,
          38% {
            transform: scale(1.035);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25);
          }
        }

        @keyframes cursorMove {
          0%,
          18%,
          100% {
            opacity: 0;
            transform: translate(0, 0) scale(1);
          }
          24%,
          34% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          36% {
            opacity: 1;
            transform: translate(0, 0) scale(0.93);
          }
          40%,
          72% {
            opacity: 1;
            transform: translate(136px, 6px) scale(0.96);
          }
          78%,
          92% {
            opacity: 1;
            transform: translate(136px, 6px) scale(1);
          }
        }

        @keyframes dragMove {
          0%,
          33%,
          100% {
            opacity: 0;
            transform: translate(0, 0) scale(1);
          }
          38%,
          42% {
            opacity: 1;
            transform: translate(0, 0) scale(1.03);
          }
          48%,
          74% {
            opacity: 1;
            transform: translate(136px, 6px) scale(1);
          }
          80% {
            opacity: 0;
            transform: translate(136px, 6px) scale(1);
          }
        }

        @keyframes progressRun {
          0%,
          100% {
            transform: scaleX(0.52);
            transform-origin: left;
          }
          50% {
            transform: scaleX(0.88);
            transform-origin: left;
          }
        }

        @keyframes clickPulse {
          0%,
          34%,
          100% {
            opacity: 0;
            transform: scale(0.5);
          }
          36% {
            opacity: 0.85;
            transform: scale(0.8);
          }
          46% {
            opacity: 0;
            transform: scale(2.2);
          }
        }
      `}</style>
    </article>
  );
}
