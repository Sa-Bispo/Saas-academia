import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { listarFichasParq, listarPerguntasParq } from "@/actions/parq.actions";
import { prisma } from "@/lib/prisma";
import { ParqConfigClient } from "./parq-config-client";

export default async function ParqConfigPage() {
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

  const tenantRow = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { companyName: true, nome: true },
  });
  const academiaName = tenantRow?.companyName || tenantRow?.nome || "Academia";

  try {
    const [fichas, perguntas, planos] = await Promise.all([
      listarFichasParq(),
      listarPerguntasParq(),
      prisma.planoAcademia.findMany({
        where: { tenantId: tenant.id, ativo: true },
        orderBy: { valorCents: "asc" },
      }),
    ]);

    return (
      <ParqConfigClient
        fichas={fichas}
        perguntas={perguntas}
        planos={planos}
        tenantId={tenant.id}
        academiaName={academiaName}
      />
    );
  } catch {
    return (
      <ParqConfigClient fichas={[]} perguntas={[]} planos={[]} tenantId={tenant.id} academiaName={academiaName} />
    );
  }
}
