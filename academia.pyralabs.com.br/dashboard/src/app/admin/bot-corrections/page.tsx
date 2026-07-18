import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import BotCorrectionsClient from "./bot-corrections-client";

const BOT_URL = (process.env.PYTHON_BACKEND_URL ?? "http://bot:8000").replace(/\/$/, "");

export default async function BotCorrectionsPage() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) redirect("/admin/login");

  // Busca inicial server-side para evitar flash de loading
  let events: ConfusionEvent[] = [];
  let patterns: LearnedPattern[] = [];

  try {
    const [evRes, ptRes] = await Promise.all([
      fetch(`${BOT_URL}/api/admin/confusion-events?status=pendente&limit=50`, {
        cache: "no-store",
      }),
      fetch(`${BOT_URL}/api/admin/learned-patterns?nicho=academia`, {
        cache: "no-store",
      }),
    ]);
    if (evRes.ok) events = (await evRes.json()).events ?? [];
    if (ptRes.ok) patterns = (await ptRes.json()).patterns ?? [];
  } catch {
    // bot pode estar offline; UI trata o estado vazio
  }

  return (
    <BotCorrectionsClient
      initialEvents={events}
      initialPatterns={patterns}
      botUrl={BOT_URL}
    />
  );
}

// ─── Tipos compartilhados ─────────────────────────────────────────────────────

export type ConfusionEvent = {
  id: string;
  tenantId: string | null;
  tenantNome: string;
  nicho: string;
  phone: string;
  messages: { role: "user" | "bot"; text: string; ts: string }[];
  textoProblema: string;
  status: "pendente" | "resolvido" | "ignorado";
  createdAt: string;
  resolvedAt: string | null;
};

export type LearnedPattern = {
  id: string;
  nicho: string;
  frase: string;
  intentAlvo: string;
  ativo: boolean;
  createdAt: string;
};
