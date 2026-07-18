"use client";

import Link from "next/link";
import { Check, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChatSimulation } from "@/components/landing/chat-simulation";

type TabKey = "adega" | "lanchonete" | "pizzaria";

type TabContent = {
  label: string;
  title: string;
  before: string[];
  after: string[];
  tags: string[];
  ctaLabel: string;
  ctaHref: string;
  accent: {
    activeTab: string;
    border: string;
    beforeTone: string;
    afterTone: string;
    ring: string;
    glow: string;
  };
};

type StarDot = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  tint: "white" | "blue";
};

type StarFieldOptions = {
  seed: number;
  sizeMin: number;
  sizeRange: number;
  durationBase: number;
  durationRange: number;
  delayMax: number;
  opacityMin: number;
  opacityRange: number;
  blueChance: number;
};

function buildStarField(count: number, options: StarFieldOptions): StarDot[] {
  let seed = options.seed;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967295;
  };

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: next() * 100,
    top: next() * 100,
    size: options.sizeMin + next() * options.sizeRange,
    duration: options.durationBase + next() * options.durationRange,
    delay: next() * options.delayMax,
    opacity: options.opacityMin + next() * options.opacityRange,
    tint: next() < options.blueChance ? "blue" : "white",
  }));
}

const STAR_FIELD_FAR = buildStarField(180, {
  seed: 73,
  sizeMin: 0.8,
  sizeRange: 1.2,
  durationBase: 26,
  durationRange: 20,
  delayMax: 36,
  opacityMin: 0.12,
  opacityRange: 0.34,
  blueChance: 0.45,
});

const STAR_FIELD_NEAR = buildStarField(120, {
  seed: 103,
  sizeMin: 1.2,
  sizeRange: 2.1,
  durationBase: 16,
  durationRange: 14,
  delayMax: 28,
  opacityMin: 0.22,
  opacityRange: 0.56,
  blueChance: 0.35,
});

const tabOrder: TabKey[] = ["adega", "lanchonete", "pizzaria"];

const tabMap: Record<TabKey, TabContent> = {
  adega: {
    label: "Adega de Bairro",
    title: "Sua adega vendendo até de madrugada, no piloto automático.",
    before: [
      "Mensagem chegou tarde, venda perdida.",
      "Produto acabou e o cliente só descobre depois.",
      "Celular lotado no pico do fim de semana.",
    ],
    after: [
      "Bot responde na hora e fecha pedido.",
      "Estoque zerou? Item sai do fluxo automático.",
      "Múltiplos atendimentos sem fila no WhatsApp.",
    ],
    tags: ["Estoque", "Combos", "Reposição", "Kanban"],
    ctaLabel: "Testar pra adega agora",
    ctaHref: "/test-drive?niche=adega",
    accent: {
      activeTab: "border-emerald-300/50 bg-emerald-400/15 text-emerald-200",
      border: "border-emerald-400/25",
      beforeTone: "border-rose-400/20 bg-rose-500/8",
      afterTone: "border-emerald-400/25 bg-emerald-500/10",
      ring: "ring-emerald-300/35",
      glow: "from-emerald-300/35 via-emerald-500/15 to-cyan-300/10",
    },
  },
  lanchonete: {
    label: "Lanchonete",
    title: "Seu rush de almoço rodando sem gargalo no atendimento.",
    before: [
      "Várias conversas abertas e pouca resposta.",
      "Combo do dia passa batido no chat.",
      "Pedido entra errado e gera retrabalho.",
    ],
    after: [
      "Bot responde todos em segundos.",
      "Combos entram no pitch automaticamente.",
      "Confirmação de itens antes do fechamento.",
    ],
    tags: ["Cardápio", "Combos", "Confirmação", "Fila"],
    ctaLabel: "Testar pra lanchonete agora",
    ctaHref: "/test-drive?niche=lanchonete",
    accent: {
      activeTab: "border-orange-300/50 bg-orange-400/15 text-orange-200",
      border: "border-orange-400/25",
      beforeTone: "border-rose-400/20 bg-rose-500/8",
      afterTone: "border-emerald-400/25 bg-emerald-500/10",
      ring: "ring-orange-300/35",
      glow: "from-orange-300/35 via-amber-500/15 to-rose-300/10",
    },
  },
  pizzaria: {
    label: "Pizzaria",
    title: "Pedido de pizza guiado do tamanho à borda, sem confusão.",
    before: [
      "Vai e volta para definir tamanho e borda.",
      "Sexta à noite com fila de mensagens.",
      "Anotação ambígua e pedido errado.",
    ],
    after: [
      "Fluxo guiado em passos claros.",
      "Atendimento simultâneo em horário de pico.",
      "Pedido estruturado pronto para produção.",
    ],
    tags: ["Tamanho", "Sabor", "Borda", "Produção"],
    ctaLabel: "Testar pra pizzaria agora",
    ctaHref: "/test-drive?niche=pizzaria",
    accent: {
      activeTab: "border-red-300/50 bg-red-400/15 text-red-200",
      border: "border-red-400/25",
      beforeTone: "border-rose-400/20 bg-rose-500/8",
      afterTone: "border-emerald-400/25 bg-emerald-500/10",
      ring: "ring-red-300/35",
      glow: "from-red-300/35 via-rose-500/15 to-orange-300/10",
    },
  },
};

export function DeliveryModalitiesTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("adega");
  const [displayedTab, setDisplayedTab] = useState<TabKey>("adega");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const syncTabWithHash = () => {
      if (typeof window === "undefined") return;

      const hash = window.location.hash.replace("#", "");
      if (hash === "adega" || hash === "lanchonete" || hash === "pizzaria") {
        setActiveTab(hash);
      }
    };

    syncTabWithHash();
    window.addEventListener("hashchange", syncTabWithHash);

    return () => window.removeEventListener("hashchange", syncTabWithHash);
  }, []);

  useEffect(() => {
    if (activeTab === displayedTab) {
      return;
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setDisplayedTab(activeTab);
      setIsVisible(true);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [activeTab, displayedTab]);

  const content = useMemo(() => tabMap[displayedTab], [displayedTab]);

  return (
    <section
      id="segmentos"
      className="relative w-full overflow-hidden bg-slate-950 flex min-h-screen flex-col items-center justify-center scroll-mt-20 pt-24 pb-24"
    >
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-[#0F172A] via-[#0f172a]/70 via-40% to-transparent z-10 pointer-events-none animate-fade-in" style={{ animationDelay: '0s', animationDuration: '2.2s' }}></div>

      {/* Star Field Layer - Plano distante */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.35),black_20%,black_72%,rgba(0,0,0,0))]">
        {STAR_FIELD_FAR.map((star) => (
          <span
            key={`far-${star.id}`}
            className={`star-dot star-far ${star.tint === "blue" ? "star-blue" : "star-white"}`}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDuration: `${star.duration}s, ${Math.max(star.duration * 0.48, 9)}s`,
              animationDelay: `-${star.delay}s, -${star.delay * 0.62}s`,
            }}
          />
        ))}
      </div>

      {/* Star Field Layer - Plano próximo */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.2),black_14%,black_74%,rgba(0,0,0,0))]">
        {STAR_FIELD_NEAR.map((star) => (
          <span
            key={`near-${star.id}`}
            className={`star-dot star-near ${star.tint === "blue" ? "star-blue" : "star-white"}`}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDuration: `${star.duration}s, ${Math.max(star.duration * 0.42, 7)}s`,
              animationDelay: `-${star.delay}s, -${star.delay * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Aurora Glow central para profundidade */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/8 blur-[130px]" />

      {/* Fade to Gradient no rodapé para conexão suave com a próxima faixa escura */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-96 bg-gradient-to-b from-transparent via-slate-950/50 via-50% to-black" />

      <div className="relative z-20 mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-10">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Modalidades de delivery prontas para operar hoje</h2>
          <p className="mt-2 text-sm text-muted sm:text-base">Escolha seu nicho e veja o fluxo ideal em segundos.</p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur">
          {tabOrder.map((tab) => {
            const item = tabMap[tab];
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                id={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? `${item.accent.activeTab} shadow-[0_10px_28px_-14px_rgba(0,0,0,0.75)]`
                    : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          className={`rounded-3xl border border-white/10 bg-slate-800/60 p-8 backdrop-blur-xl transition-opacity duration-300 md:p-12 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div>
              <h3 className="max-w-xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">{content.title}</h3>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <article className={`rounded-2xl border p-4 sm:p-5 ${content.accent.beforeTone}`}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-rose-300/80">Antes</p>
                  <ul className="space-y-2.5">
                    {content.before.map((line) => (
                      <li key={line} className="flex items-start gap-2.5 text-sm text-white/75">
                        <X size={14} className="mt-0.5 shrink-0 text-rose-300" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className={`rounded-2xl border p-4 sm:p-5 ${content.accent.afterTone}`}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300/80">Depois</p>
                  <ul className="space-y-2.5">
                    {content.after.map((line) => (
                      <li key={line} className="flex items-start gap-2.5 text-sm text-white/80">
                        <Check size={14} className="mt-0.5 shrink-0 text-emerald-300" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {content.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs text-white/75">
                    {tag}
                  </span>
                ))}
              </div>

              <Link
                href={content.ctaHref}
                className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#34d399_0%,#00a884_55%,#059669_100%)] px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_16px_32px_-14px_rgba(0,168,132,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-16px_rgba(0,168,132,0.7)]"
              >
                <Zap size={16} />
                {content.ctaLabel}
              </Link>
            </div>

            <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(9,17,26,0.85),rgba(6,11,19,0.98))] p-4 sm:min-h-[360px]">
              <div className={`absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br blur-3xl ${content.accent.glow}`} />
              <div className={`absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-gradient-to-br blur-3xl ${content.accent.glow}`} />

              <div className="relative z-10 flex h-full items-center justify-center">
                <div className="w-full">
                  <ChatSimulation activeTab={activeTab} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .star-dot {
          position: absolute;
          border-radius: 9999px;
          will-change: transform, opacity;
          animation-timing-function: linear, ease-in-out;
          animation-iteration-count: infinite, infinite;
          filter: drop-shadow(0 0 5px rgba(148, 163, 184, 0.35));
        }

        .star-far {
          animation-name: starRiseFar, starTwinkle;
          filter: drop-shadow(0 0 3px rgba(148, 163, 184, 0.24));
        }

        .star-near {
          animation-name: starRiseNear, starTwinkle;
          filter: drop-shadow(0 0 6px rgba(186, 230, 253, 0.32));
        }

        .star-white {
          background: rgba(248, 250, 252, 0.95);
        }

        .star-blue {
          background: rgba(191, 219, 254, 0.9);
        }

        @keyframes starRiseFar {
          0% {
            transform: translate3d(0, 18px, 0);
          }
          100% {
            transform: translate3d(0, -105px, 0);
          }
        }

        @keyframes starRiseNear {
          0% {
            transform: translate3d(0, 26px, 0);
          }
          100% {
            transform: translate3d(0, -175px, 0);
          }
        }

        @keyframes starTwinkle {
          0%,
          100% {
            opacity: 0.22;
          }
          50% {
            opacity: 0.95;
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fadeIn forwards;
        }
      `}</style>
    </section>
  );
}
