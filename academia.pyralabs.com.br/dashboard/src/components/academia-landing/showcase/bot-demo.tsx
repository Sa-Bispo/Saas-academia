"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RotateCcw, Send } from "lucide-react";

type Option = { label: string; next: string };
type Node = { bot: ReactNode; options: Option[] };

const FLOW: Record<string, Node> = {
  start: {
    bot: (
      <>
        Oi! 👋 Sou o assistente da academia. Como posso te ajudar hoje?
      </>
    ),
    options: [
      { label: "Meu vencimento", next: "venc" },
      { label: "Horários", next: "horarios" },
      { label: "Sou novo aluno", next: "novo" },
    ],
  },
  venc: {
    bot: (
      <>
        Sua mensalidade vence <b>amanhã (28/07)</b> — R${" "}
        <span className="font-mono">89,90</span>. Quer pagar agora no Pix?
      </>
    ),
    options: [
      { label: "Pagar no Pix", next: "pix" },
      { label: "Voltar", next: "start" },
    ],
  },
  pix: {
    bot: (
      <>
        Prontinho! Aqui está o Pix copia-e-cola 👇
        <span className="mt-2 block rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-[var(--text-secondary)]">
          00020126···5204000053039865802BR
        </span>
        <span className="mt-1.5 block text-[12px] text-[var(--wpp)]">
          Assim que cair, dou baixa automático ✅
        </span>
      </>
    ),
    options: [
      { label: "Ver horários", next: "horarios" },
      { label: "Recomeçar", next: "start" },
    ],
  },
  horarios: {
    bot: <>Funcionamos seg a sex das 6h às 22h e sábado das 8h às 14h 🕒</>,
    options: [
      { label: "Meu vencimento", next: "venc" },
      { label: "Recomeçar", next: "start" },
    ],
  },
  novo: {
    bot: (
      <>
        Que massa! 🎉 Posso te mandar os planos e já agendar sua{" "}
        <b>aula experimental grátis</b>. Bora?
      </>
    ),
    options: [
      { label: "Ver planos", next: "planos" },
      { label: "Recomeçar", next: "start" },
    ],
  },
  planos: {
    bot: (
      <>
        Temos Mensal, Trimestral e Anual. O Trimestral sai por R${" "}
        <span className="font-mono">89,90</span>/mês 💪
      </>
    ),
    options: [
      { label: "Agendar aula", next: "agendar" },
      { label: "Recomeçar", next: "start" },
    ],
  },
  agendar: {
    bot: (
      <>
        Fechado! Sua aula experimental está marcada pra <b>amanhã às 18h</b> ✅
        Te espero!
      </>
    ),
    options: [{ label: "Recomeçar", next: "start" }],
  },
};

type Msg = { from: "bot" | "user"; node: ReactNode };

export function BotDemo() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const goTo = (id: string, withUser?: string) => {
    clearTimers();
    const node = FLOW[id];
    if (!node) return;
    if (withUser) setMsgs((m) => [...m, { from: "user", node: withUser }]);
    setOptions([]);
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: "bot", node: node.bot }]);
      setOptions(node.options);
    }, 850);
    timers.current.push(t);
  };

  const reset = () => {
    clearTimers();
    setMsgs([]);
    setOptions([]);
    goTo("start");
  };

  useEffect(() => {
    goTo("start");
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [msgs, typing, options]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0e0d11]">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[#161419] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-strong)]">
          P
        </div>
        <div className="flex-1 leading-tight">
          <p className="text-sm font-semibold">Assistente PyraLabs</p>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--wpp)]">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--wpp)]" />
            {typing ? "digitando…" : "online"}
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <RotateCcw size={13} /> recomeçar
        </button>
      </div>

      {/* mensagens */}
      <div
        ref={scrollRef}
        className="wa-wallpaper flex-1 space-y-2 overflow-y-auto px-4 py-4"
      >
        {msgs.map((m, i) =>
          m.from === "bot" ? (
            <div
              key={i}
              className="msg-in max-w-[85%] rounded-2xl rounded-tl-md bg-[#221f26] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-primary)]"
            >
              {m.node}
            </div>
          ) : (
            <div
              key={i}
              className="msg-in ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[#12341f] px-3 py-2 text-[13px] leading-relaxed text-[#dbf3e4]"
            >
              {m.node}
            </div>
          )
        )}
        {typing && (
          <div className="msg-in flex w-max items-center gap-1 rounded-2xl rounded-tl-md bg-[#221f26] px-3.5 py-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* opções clicáveis */}
      <div className="border-t border-[var(--border)] bg-[#161419] px-3 py-3">
        <div className="flex flex-wrap gap-2">
          {options.length > 0 ? (
            options.map((o) => (
              <button
                key={o.label}
                onClick={() => goTo(o.next, o.label)}
                className="rounded-full border border-[var(--border-strong)] bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-primary)] transition-all hover:border-[var(--wpp)] hover:bg-[var(--wpp)]/10 hover:text-[var(--wpp)]"
              >
                {o.label}
              </button>
            ))
          ) : (
            <span className="flex items-center gap-2 px-1 py-1.5 text-[13px] text-[var(--text-tertiary)]">
              <Send size={13} /> respondendo…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
