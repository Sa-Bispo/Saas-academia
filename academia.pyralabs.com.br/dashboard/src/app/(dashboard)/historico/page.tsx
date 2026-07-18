import {
  getComparativoSemanal,
  getFaturamentoPorDia,
  getPedidosPorHora,
  getProdutosMaisVendidos,
} from "@/actions/analytics.actions";
import { getMetricasHistorico, getPedidosHistorico } from "@/actions/historico.actions";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { HistoricoClient } from "./historico-client";

type Periodo = "hoje" | "semana" | "mes";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: periodoParam } = await searchParams;
  const periodo: Periodo =
    periodoParam === "semana" || periodoParam === "mes" ? periodoParam : "hoje";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tenantId = "";
  if (user) {
    const tenantData = await ensureTenantForUser({
      id: user.id,
      email: user.email,
      nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
    });
    tenantId = tenantData.tenant.id;
  }

  const [pedidos, metricas, faturamento, produtos, horarios, comparativo] = await Promise.all([
    getPedidosHistorico(periodo),
    getMetricasHistorico(periodo),
    tenantId ? getFaturamentoPorDia(7) : Promise.resolve([]),
    tenantId ? getProdutosMaisVendidos(30) : Promise.resolve([]),
    tenantId ? getPedidosPorHora(30) : Promise.resolve([]),
    tenantId
      ? getComparativoSemanal()
      : Promise.resolve({
          semanaAtual: { faturamento: 0, pedidos: 0 },
          semanaAnterior: { faturamento: 0, pedidos: 0 },
          variacaoFaturamento: 0,
          variacaoPedidos: 0,
        }),
  ]);

  return (
    <HistoricoClient
      periodo={periodo}
      pedidos={pedidos}
      metricas={metricas}
      analytics={{ faturamento, produtos, horarios, comparativo }}
    />
  );
}
