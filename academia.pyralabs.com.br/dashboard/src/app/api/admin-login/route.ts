import { type NextRequest, NextResponse } from "next/server";
import { createAdminToken, ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  let email = "";
  let password = "";

  try {
    const body = await req.json();
    email = body.email ?? "";
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: "Admin não configurado. Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env." },
      { status: 500 },
    );
  }

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const token = createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
