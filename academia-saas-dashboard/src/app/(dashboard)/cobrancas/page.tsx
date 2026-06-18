import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { CobrancasPageClient } from "./cobrancas-client";
import { prisma } from "@/lib/prisma";

export default async function CobrancasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { tenant } = await ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });

  const tenantId = tenant.id;

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const [cobrancas, resumo, config] = await Promise.all([
    prisma.cobrancaAluno.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { dataVencimento: "asc" }],
      include: {
        aluno: { select: { id: true, nome: true, telefone: true } },
        matricula: { include: { plano: true } },
      },
    }),
    prisma.cobrancaAluno.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
      _sum: { valorCents: true },
    }),
    // Configuração de dias de antecedência do configNicho
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { configNicho: true },
    }),
  ]);

  const configNicho = (config?.configNicho as Record<string, unknown>) ?? {};
  const diasAntecedencia = (configNicho?.dias_antecedencia_cobranca as number) ?? 5;

  const receitaMes = await prisma.cobrancaAluno.aggregate({
    where: {
      tenantId,
      status: "PAGO",
      dataPagamento: { gte: inicioMes, lte: fimMes },
    },
    _sum: { valorCents: true },
  });

  return (
    <CobrancasPageClient
      tenantId={tenantId}
      cobrancas={cobrancas}
      resumo={resumo}
      receitaMesCents={receitaMes._sum.valorCents ?? 0}
      diasAntecedencia={diasAntecedencia}
    />
  );
}
