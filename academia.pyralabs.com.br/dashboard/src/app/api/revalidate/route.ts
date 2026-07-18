import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tag = String(body?.tag || "").trim();
    const tenantId = String(body?.tenant_id || "").trim();

    if (tag) {
      revalidateTag(tag, "max");
    }

    if (tenantId) {
      revalidatePath("/pedidos");
      revalidatePath("/dashboard");
    }

    return NextResponse.json({ ok: true, tag, tenant_id: tenantId });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }
}
