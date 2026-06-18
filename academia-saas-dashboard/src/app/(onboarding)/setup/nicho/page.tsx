import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type ConfigNicho } from "@/lib/nicho";
import { saveSubNicho } from "@/actions/nicho.actions";

// Produto focado 100% em academia: não há mais nicho pra escolher.
// Esta página só garante que o tenant tenha sub_nicho="academia" configurado
// e segue direto pro wizard de setup.
export default async function SetupNichoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenant = await prisma.tenant.findFirst({
    where: { userId: user.id },
    orderBy: { dataCriacao: "desc" },
    select: { configNicho: true },
  });

  const config = (tenant?.configNicho as ConfigNicho) ?? {};
  const rawSubNicho = (config.sub_nicho ?? (config as Record<string, unknown>).subNicho) as
    | string
    | undefined;

  if (rawSubNicho !== "academia") {
    await saveSubNicho("academia");
  }

  redirect("/setup");
}
