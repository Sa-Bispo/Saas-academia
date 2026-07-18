import { notFound } from "next/navigation";
import { Check, Zap } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { CheckoutModal } from "./checkout-modal";

// ─── tipos ────────────────────────────────────────────────────────────────────

type NicheParam = "delivery" | "agendamentos" | "empresas";

const NICHE_MAP: Record<NicheParam, { dbNiche: string; label: string; desc: string }> = {
  delivery: {
    dbNiche: "DELIVERY",
    label: "Delivery",
    desc: "Para pizzarias, hamburguerias, açaíterias e qualquer negócio de entrega.",
  },
  agendamentos: {
    dbNiche: "CLINICA",
    label: "Agendamentos",
    desc: "Para salões, barbearias, estúdios, spas e qualquer negócio que trabalha com agenda.",
  },
  empresas: {
    dbNiche: "EMPRESA",
    label: "Empresas",
    desc: "Para suporte, FAQ e atendimento corporativo com base de conhecimento.",
  },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Labels amigáveis para cada feature flag / limite
function buildFeatureList(plan: Awaited<ReturnType<typeof getPlans>>[number]) {
  const items: string[] = [];

  // Mensagens
  if (plan.maxMessagesMonth === -1) items.push("Mensagens ilimitadas");
  else items.push(`Até ${plan.maxMessagesMonth.toLocaleString("pt-BR")} mensagens/mês`);

  // Produtos (delivery)
  if (plan.maxProducts !== -1) {
    items.push(`Até ${plan.maxProducts} produtos`);
  } else if (plan.niche === "DELIVERY") {
    items.push("Produtos ilimitados");
  }

  // Agendamentos (clínica)
  if (plan.maxAppointmentsMonth !== -1) {
    items.push(`Até ${plan.maxAppointmentsMonth} agendamentos/mês`);
  } else if (plan.niche === "CLINICA") {
    items.push("Agendamentos ilimitados");
  }

  // Profissionais (clínica)
  if (plan.maxProfessionals !== -1 && plan.niche === "CLINICA") {
    items.push(
      plan.maxProfessionals === 1
        ? "1 profissional"
        : `Até ${plan.maxProfessionals} profissionais`,
    );
  } else if (plan.multiProfessional) {
    items.push("Múltiplos profissionais");
  }

  // Atendimentos (empresa)
  if (plan.maxContactsMonth !== -1 && plan.niche === "EMPRESA") {
    items.push(`Até ${plan.maxContactsMonth.toLocaleString("pt-BR")} atendimentos/mês`);
  } else if (plan.niche === "EMPRESA") {
    items.push("Atendimentos ilimitados");
  }

  // Documentos (empresa)
  if (plan.maxDocuments !== -1 && plan.niche === "EMPRESA") {
    items.push(`${plan.maxDocuments} documento na base de conhecimento`);
  }

  // Features
  if (plan.menuReaderEnabled) items.push("Leitor de cardápio com IA");
  if (plan.ragEnabled) items.push("RAG — base de conhecimento");
  if (plan.humanHandoffEnabled) items.push("Transferência para humano");
  if (plan.remindersEnabled) items.push("Lembretes automáticos");
  if (plan.cancellationEnabled) items.push("Cancelamento pelo bot");
  if (plan.reportsEnabled) items.push("Relatórios completos");

  return items;
}

// ─── data ─────────────────────────────────────────────────────────────────────

async function getPlans(dbNiche: string) {
  return prisma.plan.findMany({
    where: { niche: dbNiche as "DELIVERY" | "CLINICA" | "EMPRESA" },
    orderBy: { priceCents: "asc" },
  });
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function PlanosPage({
  params,
  searchParams,
}: {
  params: Promise<{ niche: string }>;
  searchParams: Promise<{ tenantId?: string; autoCheckout?: string }>;
}) {
  const { niche } = await params;
  const { tenantId, autoCheckout } = await searchParams;

  const nicheConfig = NICHE_MAP[niche as NicheParam];
  if (!nicheConfig) notFound();

  const plans = await getPlans(nicheConfig.dbNiche);
  if (plans.length === 0) notFound();

  const midIndex = Math.floor(plans.length / 2);

  return (
    <main className="relative min-h-screen overflow-x-clip pt-16">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-180px] h-[540px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,168,132,0.20),rgba(0,168,132,0.03)_55%,transparent_70%)] blur-2xl" />
      </div>

      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-8 pt-10 text-center sm:px-8 lg:px-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-1.5 text-sm text-brand backdrop-blur">
          <Zap size={14} />
          {nicheConfig.label}
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Escolha o plano ideal para o seu negócio
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">
          {nicheConfig.desc}
        </p>
      </section>

      {/* Cards de planos */}
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 pb-24 sm:px-8 lg:grid-cols-3 lg:px-10">
        {plans.map((plan, i) => {
          const featured = i === midIndex;
          const features = buildFeatureList(plan);

          return (
            <article
              key={plan.id}
              className={
                featured
                  ? "relative flex flex-col rounded-3xl border border-brand/50 bg-[linear-gradient(155deg,rgba(0,168,132,0.14),rgba(9,17,26,0.94))] p-7 shadow-2xl shadow-brand/15"
                  : "relative flex flex-col rounded-3xl border border-line bg-[linear-gradient(155deg,rgba(255,255,255,0.05),rgba(9,17,26,0.92))] p-7"
              }
            >
              {featured && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-1 text-xs font-bold text-slate-950">
                  Mais popular
                </span>
              )}

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand/80">
                {plan.name}
              </p>

              <div className="mt-4 flex items-end gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {formatBRL(plan.priceCents)}
                </span>
                <span className="pb-1 text-sm text-muted">/mês</span>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/85">
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check size={11} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <CheckoutModal
                planCode={plan.code}
                planName={plan.name}
                priceCents={plan.priceCents}
                tenantId={tenantId ?? null}
                featured={featured}
                autoOpen={autoCheckout === "1" && featured}
              />
            </article>
          );
        })}
      </section>
    </main>
  );
}
