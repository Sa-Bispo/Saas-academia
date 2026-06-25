import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { PARQ_TERMO_V1 } from "@/lib/parq-termo";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    return await handlePost(req, params);
  } catch (err) {
    console.error("[PARQ] Erro inesperado:", err);
    return NextResponse.json(
      { error: "Erro interno.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

async function handlePost(
  req: NextRequest,
  params: Promise<{ tenantId: string }>
) {
  const { tenantId } = await params;

  // Validar tenant
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Academia não encontrada." }, { status: 404 });
  }

  let body: {
    nome: string;
    cpf: string;
    telefone: string;
    respostas: Record<string, "S" | "N">;
    assinatura: string | null;
    consentimentoLgpd: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const { nome, cpf, telefone, respostas, assinatura, consentimentoLgpd } = body;

  if (!nome?.trim() || !cpf?.trim() || !telefone?.trim()) {
    return NextResponse.json({ error: "Nome, CPF e telefone são obrigatórios." }, { status: 422 });
  }
  if (!consentimentoLgpd) {
    return NextResponse.json({ error: "É necessário aceitar o termo LGPD." }, { status: 422 });
  }
  if (!assinatura || typeof assinatura !== "string" || !assinatura.startsWith("data:image/")) {
    return NextResponse.json({ error: "Assinatura obrigatória.", detail: "O documento não pode ser salvo sem assinatura." }, { status: 422 });
  }
  if (!respostas || typeof respostas !== "object") {
    return NextResponse.json({ error: "Respostas inválidas." }, { status: 422 });
  }

  const cpfLimpo = cpf.replace(/\D/g, "");
  const telefoneLimpo = telefone.replace(/\D/g, "");

  const precisaLiberacao = Object.values(respostas).some((v) => v === "S");
  const termoHash = createHash("sha256").update(PARQ_TERMO_V1).digest("hex");
  const ip = getIp(req);
  const userAgent = req.headers.get("user-agent") ?? null;

  // Dedup por CPF no tenant
  let aluno = await prisma.aluno.findFirst({
    where: { tenantId, cpf: cpfLimpo },
  });

  if (!aluno) {
    aluno = await prisma.aluno.create({
      data: {
        tenantId,
        nome: nome.trim(),
        telefone: telefoneLimpo,
        cpf: cpfLimpo,
        status: "SEM_MATRICULA",
        precisaLiberacaoMedica: precisaLiberacao,
      },
    });
  } else if (precisaLiberacao && !aluno.precisaLiberacaoMedica) {
    await prisma.aluno.update({
      where: { id: aluno.id },
      data: { precisaLiberacaoMedica: true },
    });
  }

  // Upload da assinatura
  let assinaturaUrl: string | null = null;
  if (assinatura) {
    try {
      const base64 = assinatura.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const supabase = getSupabaseAdmin();
      const path = `${tenantId}/${aluno.id}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("parq-assinaturas")
        .upload(path, buffer, { contentType: "image/png", upsert: false });
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("parq-assinaturas")
          .getPublicUrl(path);
        assinaturaUrl = urlData.publicUrl;
      }
    } catch {
      // Falha no upload não bloqueia o cadastro; continua sem URL
    }
  }

  await prisma.fichaParq.create({
    data: {
      tenantId,
      alunoId: aluno.id,
      respostas,
      precisaLiberacaoMedica: precisaLiberacao,
      assinaturaUrl,
      assinaturaBase64: assinatura,
      termoHash,
      assinanteNome: nome.trim(),
      assinanteCpf: cpfLimpo,
      ip,
      userAgent,
      consentimentoLgpd: true,
    },
  });

  return NextResponse.json({ ok: true, alunoId: aluno.id });
}
