import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ParqFormClient } from "./parq-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tenantId: string }>;
};

export default async function ParqPage({ params }: Props) {
  const { tenantId } = await params;

  let perguntas = await prisma.parqPergunta.findMany({
    where: { tenantId, ativo: true },
    orderBy: { ordem: "asc" },
  });
  if (perguntas.length === 0) {
    perguntas = await prisma.parqPergunta.findMany({
      where: { tenantId: null, ativo: true },
      orderBy: { ordem: "asc" },
    });
  }

  const [tenant] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, nome: true, companyName: true },
    }),
  ]);

  if (!tenant) notFound();

  return (
    <ParqFormClient
      tenantId={tenant.id}
      academiaName={tenant.companyName || tenant.nome}
      perguntas={perguntas.map((p) => ({ id: p.id, texto: p.texto, tipo: p.tipo }))}
    />
  );
}
