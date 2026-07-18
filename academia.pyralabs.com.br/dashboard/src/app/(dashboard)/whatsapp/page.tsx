import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { assertModuloAtivo } from "@/services/modulos.service";
import { getTenantConfig } from "@/actions/config.actions";
import { getWhatsAppStatus } from "@/actions/whatsapp.actions";
import { WhatsAppClient } from "./whatsapp-client";

export default async function WhatsAppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { tenant: tenantBase } = await ensureTenantForUser({ id: user.id, email: user.email });
  await assertModuloAtivo(tenantBase.id, "comunicacao");

  try {
    const tenant = await getTenantConfig();
    const status = await getWhatsAppStatus(tenant.id);

    return <WhatsAppClient tenantId={tenant.id} status={status} />;
  } catch {
    return (
      <WhatsAppClient
        tenantId=""
        status={{
          connected: false,
          tenantName: "",
          phoneNumber: null,
          connectedAt: null,
          pedidosHoje: 0,
          mensagensHoje: 0,
        }}
      />
    );
  }
}
