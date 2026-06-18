/**
 * Utilitário para invalidar o cache de estoque do bot Python.
 * Chamado após qualquer operação que altere quantidades no estoque.
 */

const BOT_URL = (
  process.env.PYTHON_BACKEND_URL ?? "http://bot:8000"
).replace(/\/$/, "");

export async function invalidateBotStockCache(tenantId: string): Promise<void> {
  try {
    await fetch(`${BOT_URL}/api/internal/cache/stock/${tenantId}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Falha silenciosa — o cache expira naturalmente em 5 min
    console.warn(`[bot-cache] Falha ao invalidar cache de estoque para tenant ${tenantId}`);
  }
}

export async function invalidateBotConfigCache(tenantId: string): Promise<void> {
  try {
    await fetch(`${BOT_URL}/api/internal/cache/config/${tenantId}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Falha silenciosa — backend pode não expor este endpoint em todos os ambientes.
    console.warn(`[bot-cache] Falha ao invalidar cache de config para tenant ${tenantId}`);
  }
}
