import { redirect } from "next/navigation";

import { ActivePlanView } from "@/components/plano/active-plan-view";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getPlanosPathByNiche(niche: "DELIVERY" | "CLINICA" | "EMPRESA") {
  if (niche === "CLINICA") return "/planos/agendamentos";
  if (niche === "EMPRESA") return "/planos/empresas";
  return "/planos/delivery";
}

function getStatusLabel(status: "ACTIVE" | "PENDING" | "PAST_DUE" | "CANCELLED" | "EXPIRED") {
  if (status === "ACTIVE") return "Ativo";
  if (status === "PENDING") return "Pendente";
  if (status === "PAST_DUE") return "Pagamento pendente";
  if (status === "CANCELLED") return "Cancelado";
  return "Expirado";
}

export default async function PlanoEUsoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenant = await prisma.tenant.findFirst({
    where: { userId: user.id },
    orderBy: { dataCriacao: "asc" },
    select: {
      nome: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
          plan: {
            select: {
              name: true,
              priceCents: true,
              niche: true,
            },
          },
        },
      },
    },
  });

  if (!tenant?.subscription?.plan) {
    redirect("/planos/delivery");
  }

  const subscription = tenant.subscription;

  return (
    <ActivePlanView
      businessName={tenant.nome}
      planName={subscription.plan.name}
      monthlyPriceLabel={`${formatBRL(subscription.plan.priceCents)}/mes`}
      renewDateLabel={formatDate(subscription.currentPeriodEnd)}
      statusLabel={getStatusLabel(subscription.status)}
      plansPath={getPlanosPathByNiche(subscription.plan.niche)}
    />
  );
}
