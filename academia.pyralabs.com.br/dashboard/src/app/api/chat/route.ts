import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  tenantId: z.string().uuid("tenantId deve ser um UUID válido."),
  message: z.string().min(1).max(4000).trim(),
});

// Na rede Docker atual o serviço Python se chama `bot`.
const PYTHON_BACKEND_URL = (
  process.env.PYTHON_BACKEND_URL ?? "http://bot:8000"
).replace(/\/$/, "");

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { tenantId, message } = parsed.data;

  try {
    const upstream = await fetch(`${PYTHON_BACKEND_URL}/api/chat-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        message,
        // Usar tenantId como session_id para separar histórico de cada shadow tenant.
        session_id: tenantId,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok) {
      const upstreamText = await upstream.text();
      console.error(`[/api/chat] upstream respondeu ${upstream.status}: ${upstreamText}`);
      return NextResponse.json(
        {
          error: "Erro no backend de IA.",
          upstreamStatus: upstream.status,
          upstreamBody: upstreamText,
        },
        { status: upstream.status === 500 ? 502 : upstream.status },
      );
    }

    const data = (await upstream.json()) as Record<string, unknown>;

    const response =
      typeof data.response === "string"
        ? data.response
        : typeof data.reply === "string"
          ? data.reply
          : typeof data.answer === "string"
            ? data.answer
            : "";

    const saleComplete = data.sale_complete === true;
    const summary =
      typeof data.summary === "string" && data.summary.trim().length > 0
        ? data.summary
        : null;
    const confetti = data.confetti === true;

    return NextResponse.json({
      // Compatível com clientes antigos
      reply: response,
      // Novo contrato para o funil de conversão
      response,
      sale_complete: saleComplete,
      summary,
      confetti,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Backend de IA demorou muito para responder." },
        { status: 504 },
      );
    }
    console.error("[/api/chat] fetch falhou:", err);
    return NextResponse.json(
      { error: "Não foi possível contactar o backend de IA." },
      { status: 503 },
    );
  }
}
