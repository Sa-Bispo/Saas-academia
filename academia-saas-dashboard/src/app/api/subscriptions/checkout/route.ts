import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  planCode: z.string().min(1),
  tenantId: z.string().uuid(),
  payerEmail: z.string().email().optional().default("dev@sandbox.local"),
});

const isSandbox = process.env.NEXT_PUBLIC_PAYMENT_MODE !== "production";

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { planCode, tenantId } = parsed.data;

  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscription: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não encontrado." }, { status: 404 });
  }

  if (tenant.subscription?.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Este tenant já possui uma assinatura ativa." },
      { status: 409 },
    );
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  // ── SANDBOX: ativa direto, sem MercadoPago ────────────────────────────────
  if (isSandbox) {
    await prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        mpPaymentId: `sandbox_${Date.now()}`,
      },
      create: {
        tenantId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        mpPaymentId: `sandbox_${Date.now()}`,
      },
    });

    return NextResponse.json({ sandbox: true, redirectTo: "/setup" });
  }

  // ── PRODUCTION: MercadoPago PIX ───────────────────────────────────────────
  const { default: MercadoPagoConfig, Payment } = await import("mercadopago");
  const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN ?? "" });
  const paymentClient = new Payment(mp);
  const externalReference = `sub_${tenantId}_${plan.code}_${Date.now()}`;

  let mpPayment: {
    id?: number | null;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string | null;
        qr_code_base64?: string | null;
        ticket_url?: string | null;
      };
    };
  };

  try {
    mpPayment = await paymentClient.create({
      body: {
        transaction_amount: plan.priceCents / 100,
        description: `Assinatura ${plan.name} — ZapIQ`,
        payment_method_id: "pix",
        payer: { email: parsed.data.payerEmail },
        external_reference: externalReference,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });
  } catch (err) {
    console.error("[checkout] MercadoPago error:", err);
    return NextResponse.json({ error: "Erro ao gerar pagamento PIX." }, { status: 502 });
  }

  const mpPaymentId = String(mpPayment.id ?? "");
  const txData = mpPayment.point_of_interaction?.transaction_data;

  await prisma.subscription.upsert({
    where: { tenantId },
    update: {
      planId: plan.id,
      status: "PENDING",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      mpPaymentId,
    },
    create: {
      tenantId,
      planId: plan.id,
      status: "PENDING",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      mpPaymentId,
    },
  });

  return NextResponse.json({
    sandbox: false,
    paymentId: mpPaymentId,
    externalReference,
    qrCode: txData?.qr_code ?? null,
    qrCodeBase64: txData?.qr_code_base64 ?? null,
    ticketUrl: txData?.ticket_url ?? null,
    plan: { code: plan.code, name: plan.name, priceCents: plan.priceCents },
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}
