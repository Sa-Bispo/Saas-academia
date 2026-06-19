import { listarAlunosParaCheckin, listarFrequenciaHoje } from "@/actions/frequencia.actions";
import { FrequenciaPageClient } from "./frequencia-client";

export default async function FrequenciaPage() {
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
