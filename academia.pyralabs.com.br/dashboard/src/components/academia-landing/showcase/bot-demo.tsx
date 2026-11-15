"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RotateCcw, Send } from "lucide-react";

type Option = { label: string; next: string };
type Node = { bot: ReactNode; options: Option[] };

// Respostas fiéis ao bot real (academia_flow.py / chains.py): chave Pix + comprovante na
// conversa (sem gateway, sem "copia-e-cola"); aula experimental = o bot anota nome e
// horário e a equipe confirma.
const CHAVE = "financeiro@suaacademia.com.br";

function vencimento() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
}

const FLOW: Record<string, Node> = {
  start: {
    bot: <>Oi! 👋 Sou o assistente da academia. Como posso te ajudar?</>,
    options: [
      { label: "Quando vence meu plano?", next: "venc" },
      { label: "Horários", next: "horarios" },
      { label: "Quero conhecer a academia", next: "novo" },
    ],
  },
  venc: {
    bot: (
      <>
        Seu plano <b>Mensal</b> vence <b><Venc /></b>, no valor de R${" "}
        <span className="font-mono">89,90</span>. Quer a chave Pix pra pagar?
      </>
    ),
    options: [
      { label: "Quero a chave Pix", next: "pix" },
      { label: "Vou pagar em dinheiro", next: "dinheiro" },
    ],
  },
  pix: {
    bot: (
      <>
        Aqui está 👇
        <span className="mt-2 block rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-[var(--text-secondary)]">
          {CHAVE}
        </span>
        <span className="mt-1.5 block">Depois é só me mandar o comprovante por aqui 😉</span>
      </>
    ),
    options: [{ label: "📎 Enviar comprovante", next: "comprovante" }],
  },
  comprovante: {
    bot: (
      <>
        Recebi seu comprovante! ✅ Assim que a academia conferir, você recebe a
        confirmação aqui mesmo.
      </>
    ),
    options: [
      { label: "Horários", next: "horarios" },
      { label: "Recomeçar", next: "start" },
    ],
  },
  dinheiro: {
    bot: (
      <>
        Fechado! Seu código de pagamento é <b className="font-mono">#A3K7B2</b>. É só
        mostrar na recepção, que o recibo chega aqui no WhatsApp 🧾
      </>
    ),
    options: [{ label: "Recomeçar", next: "start" }],
  },
  horarios: {
    bot: <>Funcionamos de seg a sex, das 6h às 22h, e sábado das 8h às 14h 🕒</>,
    options: [
      { label: "Quando vence meu plano?", next: "venc" },
      { label: "Recomeçar", next: "start" },
    ],
  },
  novo: {
    bot: (
      <>
        Que bom! 🎉 A primeira aula experimental é <b>gratuita</b>. Me diz seu nome e o
        melhor dia e horário pra você?
      </>
    ),
    options: [{ label: "Ana, quinta às 19h", next: "agendar" }],
  },
  agendar: {
    bot: (
      <>
        Anotado, Ana! ✅ Já passei pra equipe, e eles confirmam sua aula por aqui.
      </>
    ),
    options: [{ label: "Recomeçar", next: "start" }],
  },
};

function Venc() {
  return <>{vencimento()}</>;
}

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
          A
        </div>
        <div className="flex-1 leading-tight">
          <p className="text-sm font-semibold">Assistente da academia</p>
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
