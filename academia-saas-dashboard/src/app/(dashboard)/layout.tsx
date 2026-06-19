import { redirect } from "next/navigation";

import { getNaoLidas } from "@/actions/suporte.actions";
import { NoPlanState } from "@/components/no-plan-state";
import { SidebarNicho } from "@/components/sidebar-nicho";
import { PlanoProvider } from "@/components/ui/plano-provider";
import { mapPlano } from "@/lib/plano";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";

function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (user.email && user.email === getAdminEmail()) {
    redirect("/admin");
  }

  const tenantData = await ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });

  if (tenantData.localFallback) {
    return (
      <div className="dashboard-layout bg-background text-foreground">
        <SidebarNicho
          tenantName={tenantData.tenant.companyName ?? tenantData.tenant.nome}
          planName="Academia Pro"
          botAtivo={false}
          userEmail={user.email}
          userName={(user.user_metadata?.nome as string | undefined) ?? user.email ?? undefined}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">{children}</div>
        </main>
      </div>
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantData.tenant.id },
    select: {
      id: true,
      nome: true,
      companyName: true,
      whatsappStatus: true,
      plano: true,
      subscription: {
        select: {
          status: true,
          plan: {
            select: { code: true, name: true, niche: true },
          },
        },
      },
    },
  });

  // Sem assinatura ativa -> tela simples com saida da conta
  if (!tenant?.subscription || tenant.subscription.status !== "ACTIVE") {
    return <NoPlanState />;
  }

  const suporteNaoLidas = await getNaoLidas(tenant.id);

  const planoAtual = mapPlano(tenant.plano || tenant.subscription.plan.code);

  return (
    <PlanoProvider plano={planoAtual}>
      <div className="dashboard-layout bg-background text-foreground">
        <SidebarNicho
          tenantName={tenant.companyName || tenant.nome}
          planName={tenant.subscription.plan.name}
          botAtivo={tenant.whatsappStatus === "CONNECTED"}
          suporteNaoLidas={suporteNaoLidas}
          userEmail={user.email}
          userName={(user.user_metadata?.nome as string | undefined) ?? user.email ?? undefined}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">{children}</div>
        </main>
      </div>
    </PlanoProvider>
  );
}
