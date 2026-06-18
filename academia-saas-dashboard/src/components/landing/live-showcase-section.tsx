import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { LiveKanbanCard } from "@/components/landing/live-kanban-card";
import { LiveStockDashboardCard } from "@/components/landing/live-stock-dashboard-card";
import { LiveWhatsAppFlowCard } from "@/components/landing/live-whatsapp-flow-card";

export function LiveShowcaseSection() {
  const cardLiftOptions = [
    "relative overflow-visible rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,168,132,0.15)] transition-transform duration-300 after:pointer-events-none after:absolute after:inset-x-6 after:-bottom-8 after:h-10 after:rounded-full after:bg-[rgba(0,168,132,0.16)] after:blur-2xl after:content-['']",
    "relative overflow-visible rounded-2xl shadow-[0_36px_72px_-20px_rgba(0,168,132,0.2)] transition-transform duration-300 after:pointer-events-none after:absolute after:inset-x-5 after:-bottom-10 after:h-14 after:rounded-full after:bg-[rgba(0,168,132,0.2)] after:blur-3xl after:content-['']",
  ];
  const cardLiftClass = cardLiftOptions[1];

  return (
    <section className="relative isolate w-full overflow-hidden bg-white/95 px-4 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40 lg:px-10">
      {/* Linha de Luz - Glow Divider */}
      <div className="absolute left-0 top-0 z-20 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.3)]" />

      <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_90%)]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
            backgroundPosition: "center",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-sm font-semibold text-brand">
            <Sparkles size={14} />
            Visualize o Sistema
          </span>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Veja como funciona na pratica
          </h2>
          <p className="mt-4 text-lg text-slate-600 sm:text-xl">
            Conheca a plataforma que automatiza seu delivery do WhatsApp ate o kanban
          </p>
        </div>

        <div className="grid gap-6 pb-12 sm:grid-cols-2 lg:grid-cols-3">
          {/* Use cardLiftOptions[0] (mais sutil) ou cardLiftOptions[1] (mais intenso). */}
          <div className={cardLiftClass}>
            <LiveWhatsAppFlowCard />
          </div>
          <div className={cardLiftClass}>
            <LiveKanbanCard />
          </div>
          <div className={cardLiftClass}>
            <LiveStockDashboardCard />
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/test-drive?niche=adega"
            className="group inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#34d399_0%,#00a884_55%,#059669_100%)] px-8 py-4 text-base font-semibold text-slate-950 shadow-[0_18px_38px_-14px_rgba(0,168,132,0.55)] ring-1 ring-emerald-300/60 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_48px_-16px_rgba(0,168,132,0.68)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Testar todos os sistemas
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
