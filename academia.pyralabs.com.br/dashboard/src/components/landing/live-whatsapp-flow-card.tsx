"use client";

import { MessageCircle } from "lucide-react";

export function LiveWhatsAppFlowCard() {
  return (
    <article className="group relative flex h-full flex-col overflow-visible rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10">
      <div className="mb-3 flex items-center gap-2 px-1">
        <MessageCircle className="text-brand" size={16} />
        <p className="text-sm font-semibold text-slate-800">WhatsApp Bot</p>
      </div>

      <div className="flex min-h-[442px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-[0_30px_50px_-20px_rgba(2,6,23,0.72)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            WhatsApp Web
          </span>
          <span>online</span>
        </div>

        <div className="min-h-[154px] flex-1 space-y-3 bg-[linear-gradient(180deg,#0f172a,#0b1220)] p-4">
          <div className="chat-customer max-w-[82%] rounded-2xl rounded-tl-md bg-slate-700 px-3 py-2.5 text-[11px] text-slate-100">
            Combo Heineken + carvao?
          </div>

          <div className="chat-typing ml-auto inline-flex items-center gap-1 rounded-2xl rounded-tr-md bg-emerald-500/20 px-3 py-2.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>

          <div className="chat-bot ml-auto max-w-[82%] rounded-2xl rounded-tr-md bg-emerald-600/90 px-3 py-2.5 text-[11px] text-white">
            R$ 69,90. Entrega 35min. Confirmar?
          </div>

          <div className="chat-customer-2 max-w-[82%] rounded-2xl rounded-tl-md bg-slate-700 px-3 py-2.5 text-[11px] text-slate-100">
            Inclui 2 Red Bull.
          </div>

          <div className="chat-typing-2 ml-auto inline-flex items-center gap-1 rounded-2xl rounded-tr-md bg-emerald-500/20 px-3 py-2.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>

          <div className="chat-bot-2 ml-auto max-w-[82%] rounded-2xl rounded-tr-md bg-emerald-600/90 px-3 py-2.5 text-[11px] text-white">
            Pedido #4212 confirmado.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-slate-800/95 p-3">
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-slate-700/60 px-2 py-1.5 text-[10px] text-slate-200"
          >
            Cardapio
          </button>
          <button
            type="button"
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-2 py-1.5 text-[10px] text-emerald-300"
          >
            Confirmar
          </button>
        </div>
      </div>

      <style jsx>{`
        .chat-customer,
        .chat-typing,
        .chat-bot,
        .chat-customer-2,
        .chat-typing-2,
        .chat-bot-2 {
          opacity: 0;
          transform: translateY(8px);
        }

        .chat-customer {
          animation: customerCycle 10s ease-in-out infinite;
        }

        .chat-typing {
          animation: typingCycle 10s ease-in-out infinite;
        }

        .chat-bot {
          animation: botCycle 10s ease-in-out infinite;
        }

        .chat-customer-2 {
          animation: customer2Cycle 10s ease-in-out infinite;
        }

        .chat-typing-2 {
          animation: typing2Cycle 10s ease-in-out infinite;
        }

        .chat-bot-2 {
          animation: bot2Cycle 10s ease-in-out infinite;
        }

        .typing-dot {
          width: 4px;
          height: 4px;
          border-radius: 9999px;
          background: rgb(110 231 183);
          animation: dotBounce 0.8s infinite ease-in-out;
        }

        .typing-dot:nth-child(2) {
          animation-delay: 0.12s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0.24s;
        }

        @keyframes customerCycle {
          0%,
          6%,
          100% {
            opacity: 0;
            transform: translateY(8px);
          }
          10%,
          28% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typingCycle {
          0%,
          22%,
          100% {
            opacity: 0;
            transform: translateY(8px);
          }
          30%,
          38% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes botCycle {
          0%,
          34%,
          100% {
            opacity: 0;
            transform: translateY(8px);
          }
          40%,
          58% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes customer2Cycle {
          0%,
          54%,
          100% {
            opacity: 0;
            transform: translateY(8px);
          }
          60%,
          74% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typing2Cycle {
          0%,
          70%,
          100% {
            opacity: 0;
            transform: translateY(8px);
          }
          76%,
          82% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bot2Cycle {
          0%,
          80%,
          100% {
            opacity: 0;
            transform: translateY(8px);
          }
          86%,
          96% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes dotBounce {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-2px);
            opacity: 1;
          }
        }
      `}</style>
    </article>
  );
}
