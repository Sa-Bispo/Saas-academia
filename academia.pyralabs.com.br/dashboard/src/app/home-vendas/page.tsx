import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { DeliveryModalitiesTabs } from "@/components/landing/delivery-modalities-tabs";
import { LiveShowcaseSection } from "@/components/landing/live-showcase-section";

export default function HomeVendasPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_55%)] px-6 pb-14 pt-18 sm:px-10 sm:pt-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            <Sparkles size={14} />
            Home de vendas
          </span>

          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Pagina de vendas em desenvolvimento
            </h1>
            <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
              Esta rota foi criada para voce desenvolver a landing comercial sem depender dos fluxos de login.
              Use este espaco para iterar copys, blocos e conversao.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/planos/delivery"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-brand-strong"
            >
              Ver planos
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand"
            >
              Ir para login
            </Link>
          </div>
        </div>
      </section>

      <DeliveryModalitiesTabs />
      <LiveShowcaseSection />
    </main>
  );
}