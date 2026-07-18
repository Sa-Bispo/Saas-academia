import { redirect } from "next/navigation";

import { getTodosChamados } from "@/actions/suporte.actions";
import { createClient } from "@/lib/supabase/server";

import { AdminSuporteClient } from "./admin-suporte-client";

function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}

export default async function AdminSuportePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== getAdminEmail()) {
    redirect("/dashboard");
  }

  const chamados = await getTodosChamados();

  return <AdminSuporteClient chamados={chamados} />;
}
