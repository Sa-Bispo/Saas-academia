import { NextRequest, NextResponse } from "next/server";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { createHmac } from "crypto";

import { prisma } from "@/lib/prisma";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? "",
});

// Valida assinatura HMAC-SHA256 enviada pelo MercadoPago.
// Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
function isValidSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // Em dev sem secret configurado, pula validação

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const dataId = new URL(req.url).searchParams.get("data.id") ?? "";

  // Formato MP: ts=<timestamp>,v1=<hash>
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=") as [string, string]),
  );
  const ts = parts["ts"] ?? "";
  const v1 = parts["v1"] ?? "";

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return expected === v1;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!isValidSignature(req, rawBody)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let body: { action?: string; data?: { id?: string } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  // MP envia varios tipos de notificação; só nos interessa payment.updated/created
  if (!body.action?.startsWith("payment.") || !body.data?.id) {
    return NextResponse.json({ received: true });
  }

  const paymentId = body.data.id;

  // Busca detalhes do pagamento na API do MP
  const paymentClient = new Payment(mp);
  let payment: { status?: string; external_reference?: string };
  try {
    payment = await paymentClient.get({ id: Number(paymentId) });
  } catch (err) {
    console.error("[webhook] Erro ao buscar pagamento:", err);
    return NextResponse.json({ error: "Erro ao verificar pagamento." }, { status: 502 });
  }

  if (payment.status !== "approved") {
    // Não é aprovado ainda — ignora (MP vai notificar de novo quando mudar)
    return NextResponse.json({ received: true });
  }

  const externalRef = payment.external_reference ?? "";
  // Formato: sub_<tenantId>_<planCode>_<timestamp>
  const match = externalRef.match(/^sub_([0-9a-f-]{36})_/);
  if (!match) {
    console.warn("[webhook] external_reference fora do padrão:", externalRef);
    return NextResponse.json({ received: true });
  }

  const tenantId = match[1];

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (!subscription) {
    console.warn("[webhook] Subscription não encontrada para tenant:", tenantId);
    return NextResponse.json({ received: true });
  }

  // Idempotência: se já está ACTIVE e o paymentId bate, ignora
  if (
    subscription.status === "ACTIVE" &&
    subscription.mpPaymentId === paymentId
  ) {
    return NextResponse.json({ received: true });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  await prisma.subscription.update({
    where: { tenantId },
    data: {
      status: "ACTIVE",
      mpPaymentId: paymentId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  console.log(`[webhook] Subscription ATIVA para tenant ${tenantId} (pagamento ${paymentId})`);
  return NextResponse.json({ received: true });
}
