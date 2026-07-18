"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  CheckCheck,
  Phone,
  Video,
  Smile,
  Paperclip,
  Camera,
  Mic,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";

type Step = { from: "user" | "bot"; time: string; node: ReactNode };
type Conversa = { steps: Step[]; confirm?: boolean };

// Conversas baseadas nos modelos reais de mensagem do bot (script_responses.py,
// academia_flow.py, cobranca_worker.py)
const SCRIPTS: Conversa[] = [
  // 1 — vencimento + Pix (cobrança automática)
  {
    confirm: true,
    steps: [
      { from: "user", time: "09:41", node: "Oi, ainda dá pra treinar hoje?" },
      {
        from: "bot",
        time: "09:41",
        node: (
          <>
            Oi, <b>Marcos</b>! 💪 Sua matrícula está <b>ativa</b> — vence 28/07.
            Pode vir tranquilo!
          </>
        ),
      },
      {
        from: "bot",
        time: "09:41",
        node: (
          <>
            👋 Passando pra avisar: sua mensalidade de <b>R$ 99,90</b> vence
            amanhã. Quer pagar no Pix agora?
          </>
        ),
      },
      { from: "user", time: "09:42", node: "Pode ser 👍" },
      {
        from: "bot",
        time: "09:42",
        node: (
          <>
            Prontinho! Aqui está o Pix copia-e-cola 👇
            <span className="mt-2 block rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-[var(--text-secondary)]">
              00020126···5204000053039865802BR
            </span>
          </>
        ),
      },
    ],
  },
  // 2 — horários de funcionamento
  {
    steps: [
      { from: "user", time: "07:58", node: "Que horas abre no sábado?" },
      {
        from: "bot",
        time: "07:58",
        node: (
          <>
            🕐 <b>Horários da Studio RM:</b>
            <span className="mt-1 block text-[var(--text-secondary)]">
              <b>Sáb</b> · 08:00 às 14:00
            </span>
            <span className="block text-[var(--text-secondary)]">
              <b>Seg a Sex</b> · 06:00 às 22:00
            </span>
          </>
        ),
      },
      { from: "user", time: "07:59", node: "Show, valeu! 🙏" },
      {
        from: "bot",
        time: "07:59",
        node: <>Foi um prazer ajudar! 💪 Bons treinos! 🏋️</>,
      },
    ],
  },
  // 3 — consulta de matrícula / cobranças
  {
    steps: [
      { from: "user", time: "19:22", node: "Tô com alguma coisa pendente?" },
      {
        from: "bot",
        time: "19:22",
        node: <>Deixa eu conferir seu cadastro… 🔎</>,
      },
      {
        from: "bot",
        time: "19:22",
        node: <>✅ Você não possui cobranças pendentes. Tudo em dia! 🎉</>,
      },
      {
        from: "bot",
        time: "19:22",
        node: (
          <>
            🏋️ Sua matrícula — <b>Plano Trimestral</b> — está ativa até{" "}
            <b>12/09</b>.
          </>
        ),
      },
    ],
  },
  // 4 — novo aluno / planos
  {
    steps: [
      { from: "user", time: "14:07", node: "Oi! Quero começar a treinar 🙂" },
      {
        from: "bot",
        time: "14:07",
        node: (
          <>
            Que massa! 🎉 Bem-vindo à <b>Studio RM</b> 🏋️
          </>
        ),
      },
      {
        from: "bot",
        time: "14:07",
        node: (
          <>
            Temos <b>Mensal R$ 99,90</b>, <b>Trimestral R$ 89,90/mês</b> e{" "}
            <b>Anual R$ 79,90/mês</b>. Bora marcar uma aula experimental grátis?
          </>
        ),
      },
      { from: "user", time: "14:08", node: "Quero sim! 💪" },
      {
        from: "bot",
        time: "14:08",
        node: (
          <>
            Fechado! Aula marcada pra <b>amanhã às 18h</b> ✅ Te espero!
          </>
        ),
      },
    ],
  },
];

function Time({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <span
      className={`ml-1.5 shrink-0 translate-y-0.5 text-[10px] ${
        light ? "text-[#8fcea6]" : "text-[var(--text-tertiary)]"
      }`}
    >
      {children}
    </span>
  );
}

function BotBubble({ time, children }: { time: string; children: ReactNode }) {
  return (
    <div className="msg-in max-w-[82%] self-start rounded-2xl rounded-tl-md bg-[#221f26] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-primary)] shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
      <span className="[&>span]:inline-block">{children}</span>
      <div className="-mt-0.5 flex justify-end">
        <Time>{time}</Time>
      </div>
    </div>
  );
}

function UserBubble({ time, children }: { time: string; children: ReactNode }) {
  return (
    <div className="msg-in max-w-[82%] self-end rounded-2xl rounded-tr-md bg-[#12341f] px-3 py-2 text-[13px] leading-relaxed text-[#dbf3e4] shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
      <span>{children}</span>
      <div className="-mt-0.5 flex items-center justify-end gap-0.5">
        <Time light>{time}</Time>
        <CheckCheck size={13} className="shrink-0 translate-y-0.5 text-[#4fd48a]" />
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="msg-in flex items-center gap-1 self-start rounded-2xl rounded-tl-md bg-[#221f26] px-3.5 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between bg-[#161419] px-6 pt-2.5 pb-1 text-[11px] font-semibold text-white">
      <span className="font-mono tracking-tight">9:41</span>
      <span className="flex items-center gap-1.5">
        <Signal size={13} />
        <Wifi size={13} />
        <BatteryFull size={17} />
      </span>
    </div>
  );
}

export function BotChatMock({ bare = false }: { bare?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setCount(SCRIPTS[0].steps.length);
      setConfirmed(!!SCRIPTS[0].confirm);
      return;
    }

    let cancelled = false;
    const push = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.current.push(t);
    };

    const run = (i: number) => {
      setIdx(i);
      setCount(0);
      setTyping(false);
      setConfirmed(false);

      const conv = SCRIPTS[i];
      let delay = 650;
      conv.steps.forEach((step, s) => {
        if (step.from === "bot") {
          push(() => setTyping(true), delay);
          delay += 1100;
          push(() => {
            setTyping(false);
            setCount(s + 1);
          }, delay);
          delay += 550;
        } else {
          push(() => setCount(s + 1), delay);
          delay += 850;
        }
      });

      if (conv.confirm) {
        push(() => setConfirmed(true), delay);
        delay += 500;
      }

      delay += 3600; // pausa pra ler
      push(() => run((i + 1) % SCRIPTS.length), delay); // próxima conversa
    };

    run(0);
    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const conv = SCRIPTS[idx];

  const shell = bare
    ? "flex h-full w-full flex-col bg-[#0e0d11]"
    : "overflow-hidden rounded-[26px] border border-[var(--border-strong)] bg-[#0e0d11] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]";

  const messagesCls = bare
    ? "wa-wallpaper flex flex-1 flex-col px-3.5 py-3"
    : "wa-wallpaper flex min-h-[372px] flex-col px-3.5 py-3";

  const inner = (
    <div className={shell}>
      {bare && <StatusBar />}

      {/* topo do chat — cara de WhatsApp */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[#161419] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">
          P
        </div>
        <div className="flex-1 leading-tight">
          <p className="text-sm font-semibold">Assistente PyraLabs</p>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--wpp)]">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--wpp)]" />
            {typing ? "digitando…" : "online"}
          </p>
        </div>
        <div className="flex items-center gap-4 text-[var(--text-tertiary)]">
          <Video size={18} strokeWidth={1.75} />
          <Phone size={16} strokeWidth={1.75} />
        </div>
      </div>

      {/* mensagens */}
      <div className={messagesCls}>
        <div className="mb-1 flex justify-center">
          <span className="rounded-md bg-[#221f26] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Hoje
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-2">
          {conv.steps.slice(0, count).map((step, i) =>
            step.from === "bot" ? (
              <BotBubble key={`${idx}-${i}`} time={step.time}>
                {step.node}
              </BotBubble>
            ) : (
              <UserBubble key={`${idx}-${i}`} time={step.time}>
                {step.node}
              </UserBubble>
            )
          )}
          {typing && <Typing />}
          {confirmed && (
            <div className="msg-in flex items-center gap-1 self-center pt-0.5 text-[10px] text-[var(--text-tertiary)]">
              <Check size={11} /> pagamento confirmado automaticamente
            </div>
          )}
        </div>
      </div>

      {/* barra de digitação (demo) */}
      <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[#161419] px-3 py-2.5">
        <Smile size={20} className="shrink-0 text-[var(--text-tertiary)]" />
        <div className="flex flex-1 items-center gap-2 rounded-full bg-[#221f26] px-3.5 py-2 text-[13px] text-[var(--text-tertiary)]">
          <span className="flex-1">Mensagem</span>
          <Paperclip size={15} />
          <Camera size={15} />
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--wpp)] text-[#04140a]">
          <Mic size={16} strokeWidth={2} />
        </div>
      </div>

      {bare && (
        <div className="flex justify-center bg-[#161419] pb-1.5 pt-0.5">
          <span className="h-1 w-28 rounded-full bg-white/25" />
        </div>
      )}
    </div>
  );

  if (bare) return inner;
  return <div className="relative w-full max-w-sm">{inner}</div>;
}
