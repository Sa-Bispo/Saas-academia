import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminStats, listPlansForAdmin } from "@/actions/admin.actions";
import { getTotalChamadosAbertos } from "@/actions/suporte.actions";
import { getAdminSession } from "@/lib/admin-auth";

import AdminClient from "./admin-client";

const BOT_URL = (process.env.PYTHON_BACKEND_URL ?? "http://bot:8000").replace(/\/$/, "");

export default async function AdminPage() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const cookieStore = await cookies();
  const isImpersonating = cookieStore.has("admin_impersonation_tenant_id");

  const [data, plans, totalAbertos, countRes] = await Promise.all([
    getAdminStats(),
    listPlansForAdmin(),
    getTotalChamadosAbertos(),
    fetch(`${BOT_URL}/api/admin/confusion-events/count`, { cache: "no-store" }).catch(() => null),
  ]);

  const pendingBotCount: number = countRes?.ok ? ((await countRes.json()) as { count: number }).count : 0;

  return (
    <AdminClient
      data={data}
      plans={plans}
      isImpersonating={isImpersonating}
      totalAbertos={totalAbertos}
      pendingBotCount={pendingBotCount}
      botWsUrl={`${(process.env.NEXT_PUBLIC_BOT_URL ?? "http://localhost:8000").replace(/\/$/, "")}/api/admin/ws/notifications`}
    />
  );
}
