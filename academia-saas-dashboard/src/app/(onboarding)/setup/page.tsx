import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SetupWizard } from "@/components/onboarding/setup-wizard";

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
    },
  });

  return (
    <SetupWizard
      dashboardRoute="/dashboard/academia"
      tenantId={tenant?.id}
      initialBusinessName={tenant?.companyName ?? undefined}
      initialBotName={tenant?.botName ?? undefined}
      initialTone={(tenant?.toneOfVoice as "DESCONTRAIDO" | "VENDEDOR" | "FORMAL" | null) ?? undefined}
    />
  );
}
