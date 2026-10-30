import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// O link público do PAR-Q usava o UUID do tenant, e o WhatsApp lê UUID como
// chave Pix aleatória. Por isso o link usa um código curto (parqCode).

const ALFABETO = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function gerarCodigo(tamanho = 8) {
  const bytes = randomBytes(tamanho);
  let out = "";
  for (let i = 0; i < tamanho; i++) out += ALFABETO[bytes[i] % ALFABETO.length];
  return out;
}

/** Aceita o código curto ou o UUID antigo (links já enviados). */
export async function resolverTenantIdParq(param: string): Promise<string | null> {
  if (UUID_RE.test(param)) return param;
  const t = await prisma.tenant.findUnique({ where: { parqCode: param }, select: { id: true } });
  return t?.id ?? null;
}

/** Retorna o código do tenant, criando se ainda não tiver. */
export async function garantirParqCode(tenantId: string): Promise<string> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { parqCode: true } });
  if (t?.parqCode) return t.parqCode;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const code = gerarCodigo();
      await prisma.tenant.update({ where: { id: tenantId }, data: { parqCode: code } });
      return code;
    } catch {
      // colisão no índice único: tenta outro
    }
  }
  return tenantId;
}
