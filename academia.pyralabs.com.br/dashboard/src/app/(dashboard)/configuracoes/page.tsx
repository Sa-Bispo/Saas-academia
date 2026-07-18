import { getTenantConfig } from "@/actions/config.actions";
import { ConfiguracoesPageClient } from "@/components/configuracoes/configuracoes-page-client";

export default async function ConfiguracoesPage() {
  try {
    const tenant = await getTenantConfig();
    return <ConfiguracoesPageClient tenant={tenant} />;
  } catch (err) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Configurações</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {err instanceof Error ? err.message : "Erro ao carregar configurações. Tente novamente."}
        </div>
      </section>
    );
  }
}