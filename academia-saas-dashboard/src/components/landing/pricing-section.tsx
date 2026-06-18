"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { SubscriptionModal } from "@/components/landing/subscription-modal";

type Plan = {
  code: string;
  name: string;
  priceCents: number;
  reportsEnabled: boolean;
  menuReaderEnabled: boolean;
};

function toCurrencyBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const PLAN_FEATURES: Record<string, string[]> = {
  delivery_basico: ["Bot ativo 24h", "Estoque com controle", "Pedidos no kanban", "Cardápio dinâmico"],
  delivery_pro: [
    "Tudo do Básico",
    "Resumo do dia",
    "Top produtos vendidos",
    "Alertas inteligentes",
  ],
  delivery_growth: [
    "Tudo do Pro",
    "Horários de pico",
    "Clientes frequentes",
    "Faturamento mensal",
  ],
};

export function PricingSection({ plans }: { plans: Plan[] }) {
  const [activePlan, setActivePlan] = useState<Plan | null>(null);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-3">
        {plans.map((plan, i) => {
          const isPro = i === 1;
          const features = PLAN_FEATURES[plan.code] ?? [];
          return (
            <article
              key={plan.code}
              className={`relative flex flex-col rounded-3xl border p-6 transition-all duration-300 ${
                isPro
                  ? "z-10 scale-105 bg-slate-800/60 backdrop-blur-lg border border-emerald-500/50 shadow-[0_0_40px_-10px_rgba(16,185,129,0.25)]"
                  : "bg-slate-900/40 backdrop-blur-md border border-slate-700/50"
              }`}
            >
              {isPro && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 border border-emerald-400 px-4 py-1 text-xs font-bold text-emerald-950 shadow-sm">
                  Mais popular
                </span>
              )}
              <p
                className={`text-sm font-semibold uppercase tracking-[0.14em] ${
                  isPro ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {plan.name}
              </p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-bold text-white">
                  {toCurrencyBRL(plan.priceCents)}
                </span>
                <span className="mb-1 text-sm text-slate-400">/mês</span>
              </div>
              {isPro && (
                <p className="mt-1 text-xs font-medium text-slate-300">Menos de R$ 3 por dia</p>
              )}
              <ul className="mt-5 flex-1 space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setActivePlan(plan)}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  isPro
                    ? "bg-[linear-gradient(135deg,#6ee7b7_0%,#34d399_40%,#10b981_100%)] text-slate-950 shadow-lg shadow-emerald-400/30 hover:-translate-y-0.5 hover:shadow-xl"
                    : "text-white border border-slate-600 bg-transparent hover:bg-slate-800 transition-colors"
                }`}
              >
                Assine aqui
              </button>
            </article>
          );
        })}
      </div>

      {activePlan && (
        <SubscriptionModal
          plan={activePlan}
          isOpen={true}
          onClose={() => setActivePlan(null)}
        />
      )}
    </>
  );
}
