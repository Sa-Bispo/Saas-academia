"use client";

import { useEffect, useRef, useState } from "react";

type TabKey = "adega" | "lanchonete" | "pizzaria";

type Message = {
  sender: "customer" | "bot";
  text: string;
  delay: number;
};

const chatMessages: Record<TabKey, Message[]> = {
  adega: [
    { sender: "customer", text: "Opa, tem combo de Heineken pra agora?", delay: 0.5 },
    { sender: "bot", text: "Temos sim! 🍻 Combo com 12x 600ml saindo a R$ 99. Vai gelo?", delay: 1.5 },
    { sender: "customer", text: "Manda! Rua das Flores, 120.", delay: 2.5 },
    { sender: "bot", text: "Pedido #342 confirmado. Chega em 15 min! 🛵", delay: 3.5 },
  ],
  lanchonete: [
    { sender: "customer", text: "Quero 2 X-Tudo, por favor.", delay: 0.5 },
    { sender: "bot", text: "Anotado! 🍔 Vai adicionar refri de 2L por +R$ 10?", delay: 1.5 },
    { sender: "customer", text: "Sim, uma Coca.", delay: 2.5 },
    { sender: "bot", text: "Tudo certo. Total: R$ 60,00. Confirma no Pix?", delay: 3.5 },
  ],
  pizzaria: [
    { sender: "customer", text: "Uma meia calabresa, meia mussarela.", delay: 0.5 },
    {
      sender: "bot",
      text: "🍕 Tamanho G selecionado. Deseja borda recheada de Catupiry?",
      delay: 1.5,
    },
    { sender: "customer", text: "Sem borda. Pode mandar.", delay: 2.5 },
    { sender: "bot", text: "Pedido na cozinha! Tempo estimado: 40 minutos. ⏲️", delay: 3.5 },
  ],
};

export function ChatSimulation({ activeTab }: { activeTab: TabKey }) {
  const messages = chatMessages[activeTab];
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);

  useEffect(() => {
    const element = containerRef.current;

    if (!element || hasEnteredView) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      {
        threshold: [0.3],
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasEnteredView]);

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto h-[470px] w-[230px] rounded-[2rem] border border-white/15 bg-[linear-gradient(180deg,rgba(10,19,34,0.96),rgba(5,11,22,0.98))] p-3 shadow-[0_34px_56px_-24px_rgba(2,6,23,0.85)] sm:h-[510px] sm:w-[248px] ${
        hasEnteredView ? "screen-turn-on" : "screen-idle"
      }`}
    >
      <div className="mx-auto mb-2 h-1.5 w-14 rounded-full bg-white/15" />

      <div className="flex h-[calc(100%-14px)] flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,#0b1322,#07101d)]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] text-white/65">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            WhatsApp Bot
          </span>
          <span>online</span>
        </div>

        <div className="flex-1 space-y-2.5 p-3">
          {messages.map((message, index) => {
            const isBot = message.sender === "bot";
            return (
              <div
                key={`${activeTab}-${index}-${message.text}`}
                className={`${hasEnteredView ? "message-enter" : "message-idle"} flex ${isBot ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: `${message.delay}s` }}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-3 py-2 text-[11px] leading-5 ${
                    isBot
                      ? "rounded-tr-md bg-[linear-gradient(135deg,#34d399,#00a884)] text-slate-950"
                      : "rounded-tl-md bg-slate-700/85 text-slate-100"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .screen-idle {
          opacity: 0;
          transform: scale(0.95);
          filter: brightness(0.7);
        }

        .screen-turn-on {
          animation: screenTurnOn 0.38s cubic-bezier(0.18, 0.9, 0.3, 1) both;
          transform-origin: center;
        }

        .message-idle {
          opacity: 0;
          transform: translateY(14px);
        }

        .message-enter {
          opacity: 0;
          transform: translateY(14px);
          animation: bubbleIn 0.44s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        @keyframes screenTurnOn {
          0% {
            opacity: 0;
            transform: scale(0.95);
            filter: brightness(0.7);
          }
          70% {
            opacity: 1;
            transform: scale(1.01);
            filter: brightness(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: brightness(1);
          }
        }

        @keyframes bubbleIn {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
