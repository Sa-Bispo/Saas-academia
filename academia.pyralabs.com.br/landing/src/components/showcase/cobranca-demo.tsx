"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Play, RotateCcw } from "lucide-react";

const STEPS = [
  "Vencimento identificado",
  "Cobrança enviada no WhatsApp",
  "Pix gerado e entregue",
  "Pagamento confirmado — baixa automática",
];

export function CobrancaDemo() {
  const [done, setDone] = useState(-1); // índice do último passo concluído
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const run = () => {
    clear();
    setDone(-1);
    setRunning(true);
    STEPS.forEach((_, i) => {
      const t = setTimeout(() => {
        setDone(i);
        if (i === STEPS.length - 1) setRunning(false);
      }, 900 * (i + 1));
      timers.current.push(t);
    });
  };

  const reset = () => {
    clear();
    setDone(-1);
    setRunning(false);
  };

  useEffect(() => clear, []);

  const paid = done >= STEPS.length - 1;

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      {/* cartão do aluno */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#161419] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-sm font-medium text-[var(--text-secondary)]">
            M
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Marcos Lima</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              vence amanhã · R$ <span className="font-mono">89,90</span>
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            paid
              ? "bg-[rgba(37,211,102,0.12)] text-[var(--wpp)]"
              : "bg-white/[0.06] text-[var(--text-tertiary)]"
          }`}
        >
          {paid ? "Pago" : "Pendente"}
        </span>
      </div>

      {/* etapas */}
      <div className="flex-1 space-y-2.5">
        {STEPS.map((s, i) => {
          const isDone = done >= i;
          const isCurrent = running && done === i - 1;
          return (
            <div
              key={s}
              className={`flex items-center gap-3 text-sm transition-opacity ${
                isDone || isCurrent ? "opacity-100" : "opacity-40"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  isDone
                    ? "border-transparent bg-[var(--wpp)] text-[#04140a]"
                    : "border-[var(--border-strong)] text-[var(--text-tertiary)]"
                }`}
              >
                {isDone ? (
                  <Check size={13} strokeWidth={3} />
                ) : isCurrent ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <span className="font-mono text-[10px]">{i + 1}</span>
                )}
              </span>
              <span className={isDone ? "text-[var(--text-primary)]" : ""}>{s}</span>
              {i === 2 && isDone && (
                <span className="ml-auto rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-[var(--text-tertiary)]">
                  Pix ···802BR
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* controle */}
      <button
        onClick={running ? undefined : paid ? reset : run}
        disabled={running}
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
          running
            ? "cursor-not-allowed bg-white/[0.05] text-[var(--text-tertiary)]"
            : paid
              ? "border border-[var(--border-strong)] bg-white/[0.03] text-[var(--text-primary)] hover:bg-white/[0.06]"
              : "bg-[var(--wpp)] text-[#04140a] hover:bg-[var(--wpp-strong)]"
        }`}
      >
        {running ? (
          <>
            <Loader2 size={15} className="animate-spin" /> cobrando…
          </>
        ) : paid ? (
          <>
            <RotateCcw size={15} /> Rodar de novo
          </>
        ) : (
          <>
            <Play size={15} /> Simular vencimento
          </>
        )}
      </button>
    </div>
  );
}
