import { redirect } from "next/navigation";

import { getChamadosTenant } from "@/actions/suporte.actions";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";

import { SuporteClient } from "./suporte-client";

export default async function SuportePage() {
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

  const tenantId = tenantData.tenant.id;
  const chamados = await getChamadosTenant(tenantId);

  return <SuporteClient chamados={chamados} tenantId={tenantId} />;
}
