"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  niche: z.string().min(1).max(60),
});

export async function joinWaitlist(
  email: string,
  niche: string,
): Promise<{ success: boolean; error?: string }> {
  const parsed = schema.safeParse({ email, niche });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await prisma.waitlistEntry.create({
    data: { email: parsed.data.email, niche: parsed.data.niche },
  });

  return { success: true };
}
