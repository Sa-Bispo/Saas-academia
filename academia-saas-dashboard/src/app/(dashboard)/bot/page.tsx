import { getBotConfig } from "@/actions/bot.actions";
import { getTenantConfig } from "@/actions/config.actions";
import { BotConfigClient } from "./bot-config-client";

export default async function BotPage() {
  const tenant = await getTenantConfig();
  const config = await getBotConfig(tenant.id);
  const jaConfigurado = Boolean(config?.bot_configurado);

  return (
    <BotConfigClient
      tenantId={tenant.id}
      config={config ?? null}
      jaConfigurado={jaConfigurado}
    />
  );
}
