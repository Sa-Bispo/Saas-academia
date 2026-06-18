import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminStats, listPlansForAdmin } from "@/actions/admin.actions";
import { getTotalChamadosAbertos } from "@/actions/suporte.actions";
import { createClient } from "@/lib/supabase/server";

import AdminClient from "./admin-client";

function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== getAdminEmail()) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  const isImpersonating = cookieStore.has("admin_impersonation_tenant_id");

  const [data, plans, totalAbertos] = await Promise.all([
    getAdminStats(),
    listPlansForAdmin(),
    getTotalChamadosAbertos(),
  ]);

  return <AdminClient data={data} plans={plans} isImpersonating={isImpersonating} totalAbertos={totalAbertos} />;
}
