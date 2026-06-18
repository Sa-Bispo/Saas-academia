import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SetupWizard } from "@/components/onboarding/setup-wizard";
import { getTenantSubNicho } from "@/lib/nicho";

// Produto focado 100% em academia: o wizard sempre roda em modo "delivery"
// (que é o modo usado pelo nicho academia) e o sub-nicho é sempre "academia".
export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenant = await prisma.tenant.findFirst({
    where: { userId: user.id },
    orderBy: { dataCriacao: "desc" },
    select: {
      id: true,
      companyName: true,
      botName: true,
      toneOfVoice: true,
      configNicho: true,
    },
  });

  const subNicho = tenant?.id ? await getTenantSubNicho(tenant.id) : null;

  if (subNicho !== "academia") {
    redirect("/setup/nicho");
  }

  return (
    <SetupWizard
      mode="delivery"
      dashboardRoute="/dashboard/academia"
      subNicho={subNicho}
      tenantId={tenant?.id}
      initialBusinessName={tenant?.companyName ?? undefined}
      initialBotName={tenant?.botName ?? undefined}
      initialTone={(tenant?.toneOfVoice as "DESCONTRAIDO" | "VENDEDOR" | "FORMAL" | null) ?? undefined}
    />
  );
}
