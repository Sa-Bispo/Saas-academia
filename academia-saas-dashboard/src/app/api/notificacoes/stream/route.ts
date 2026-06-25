import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let tenantId: string;
  try {
    const { tenant } = await ensureTenantForUser({
      id: user.id,
      email: user.email,
      nome: undefined,
    });
    tenantId = tenant.id;
  } catch {
    return new Response("Tenant not found", { status: 403 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let closed = false;

  req.signal.addEventListener("abort", () => {
    closed = true;
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (text: string): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(text));
          return true;
        } catch {
          closed = true;
          return false;
        }
      };

      const fetchCounts = async () => {
        const [comprovantes, parqNovas] = await Promise.all([
          prisma.cobrancaAluno.count({
            where: { tenantId, status: "AGUARDANDO_VALIDACAO" },
          }),
          prisma.fichaParq.count({
            where: { tenantId, assinadoEm: { gt: since24h } },
          }),
        ]);
        return { comprovantes, parqNovas };
      };

      // Envio inicial
      try {
        const counts = await fetchCounts();
        enqueue(`data: ${JSON.stringify(counts)}\n\n`);
      } catch {
        enqueue(`data: ${JSON.stringify({ comprovantes: 0, parqNovas: 0 })}\n\n`);
      }

      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }
        try {
          const counts = await fetchCounts();
          enqueue(`data: ${JSON.stringify(counts)}\n\n`);
        } catch { /* skip poll on error */ }
      }, 15_000);

      // Keep-alive para evitar timeout do proxy/nginx
      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        enqueue(": heartbeat\n\n");
      }, 25_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
