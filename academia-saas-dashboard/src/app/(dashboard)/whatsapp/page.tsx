import { getTenantConfig } from "@/actions/config.actions";
import { getWhatsAppStatus } from "@/actions/whatsapp.actions";
import { WhatsAppClient } from "./whatsapp-client";

export default async function WhatsAppPage() {
  const tenant = await getTenantConfig();
  const status = await getWhatsAppStatus(tenant.id);

  return <WhatsAppClient tenantId={tenant.id} status={status} />;
}
