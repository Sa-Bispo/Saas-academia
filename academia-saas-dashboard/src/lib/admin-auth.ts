import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "pyra_admin";
const TTL = 8 * 60 * 60; // 8 horas em segundos

function secret() {
  return process.env.ADMIN_SECRET ?? process.env.ADMIN_PASSWORD ?? "dev-secret-change-me";
}

export function createAdminToken(): string {
  const exp = String(Date.now() + TTL * 1000);
  const sig = crypto.createHmac("sha256", secret()).update(exp).digest("hex");
  return Buffer.from(`${exp}.${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string): boolean {
  try {
    const raw = Buffer.from(token, "base64url").toString();
    const dot = raw.lastIndexOf(".");
    const exp = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    const expected = crypto.createHmac("sha256", secret()).update(exp).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    if (!crypto.timingSafeEqual(a, b)) return false;
    return Date.now() < Number(exp);
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return token ? verifyAdminToken(token) : false;
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_COOKIE_MAX_AGE = TTL;
