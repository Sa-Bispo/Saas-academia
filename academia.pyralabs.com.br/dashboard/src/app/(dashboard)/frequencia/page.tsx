import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { assertModuloAtivo } from "@/services/modulos.service";
import { listarAlunosParaCheckin, listarFrequenciaHoje } from "@/actions/frequencia.actions";
import { FrequenciaPageClient } from "./frequencia-client";

export default async function FrequenciaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { tenant } = await ensureTenantForUser({ id: user.id, email: user.email });
  await assertModuloAtivo(tenant.id, "frequencia");

  try {
    const [alunos, presencasHoje] = await Promise.all([
      listarAlunosParaCheckin(),
      listarFrequenciaHoje(),
    ]);

    return <FrequenciaPageClient alunos={alunos} presencasHoje={presencasHoje} />;
  } catch {
    return <FrequenciaPageClient alunos={[]} presencasHoje={[]} />;
  }
}
