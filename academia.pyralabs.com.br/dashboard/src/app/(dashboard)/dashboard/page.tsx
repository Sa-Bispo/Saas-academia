import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { getTenantSubNicho } from "@/lib/nicho";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenantData = await ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });

  if (user.user_metadata?.onboardingPending === true) {
    redirect("/setup");
  }

  const subNicho = await getTenantSubNicho(tenantData.tenant.id);

  if (subNicho === "academia") redirect("/dashboard/academia");

  // Fallback: sem sub-nicho → setup wizard
  redirect("/setup");
}
