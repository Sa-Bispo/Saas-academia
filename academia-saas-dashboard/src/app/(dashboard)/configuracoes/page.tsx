import { getTenantConfig } from "@/actions/config.actions";
import { ConfiguracoesPageClient } from "@/components/configuracoes/configuracoes-page-client";

export default async function ConfiguracoesPage() {
  const tenant = await getTenantConfig();

  return <ConfiguracoesPageClient tenant={tenant} />;
}