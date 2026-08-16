import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FotoUploadClient } from "./foto-upload-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tenantId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { nome: true, companyName: true },
  });
  if (!tenant) return {};
  const academiaName = tenant.companyName || tenant.nome;
  const title = `Atualizar foto — ${academiaName}`;
  return { title, description: `Envie sua foto de cadastro para a ${academiaName}.` };
}

export default async function FotoPage({ params }: Props) {
  const { tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, nome: true, companyName: true },
  });
  if (!tenant) notFound();

  return (
    <FotoUploadClient
      tenantId={tenant.id}
      academiaName={tenant.companyName || tenant.nome}
    />
  );
}
