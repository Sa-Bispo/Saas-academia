import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { AlunosPageClient } from "./alunos-client";
import { prisma } from "@/lib/prisma";

export default async function AlunosPage() {
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

  try {
    const [alunos, planos] = await Promise.all([
      prisma.aluno.findMany({
        where: { tenantId, status: { not: "SEM_MATRICULA" } },
        orderBy: { nome: "asc" },
        include: {
          matriculas: {
            where: { status: "ATIVA" },
            orderBy: { dataVencimento: "desc" },
            take: 1,
            include: { plano: true },
          },
          cobrancas: {
            where: { status: { in: ["PENDENTE", "VENCIDO"] } },
            orderBy: { dataVencimento: "asc" },
            take: 1,
          },
        },
      }),
      prisma.planoAcademia.findMany({
        where: { tenantId, ativo: true },
        orderBy: { valorCents: "asc" },
      }),
    ]);

    return <AlunosPageClient alunos={alunos} planos={planos} tenantId={tenantId} />;
  } catch {
    return <AlunosPageClient alunos={[]} planos={[]} tenantId={tenantId} />;
  }
}
