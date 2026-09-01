import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFotoAluno } from "@/lib/foto-aluno";

// Telinha pública de auto-atendimento: o aluno se identifica pelo CPF e envia
// a própria foto. Reaproveita o bucket "fotos-alunos". Não confere data de
// nascimento — muita gente na base tem a data errada (ver lookup/route.ts).

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

async function acharAluno(tenantId: string, cpf: string) {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return null;
  return prisma.aluno.findFirst({ where: { tenantId, cpf: cpfLimpo } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) {
      return NextResponse.json({ error: "Academia não encontrada." }, { status: 404 });
    }

    let body: { action?: string; cpf?: string; foto?: string | null };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const { action, cpf, foto } = body;

    if (!cpf) {
      return NextResponse.json({ error: "Informe o CPF." }, { status: 422 });
    }

    const aluno = await acharAluno(tenantId, cpf);
    // Mensagem genérica de propósito: não revela se o CPF existe (evita enumeração).
    if (!aluno) {
      return NextResponse.json(
        { error: "Não encontramos um cadastro com esse CPF." },
        { status: 404 }
      );
    }

    // ── Passo 1: apenas verificar identidade ──
    if (action === "verificar") {
      return NextResponse.json({
        ok: true,
        primeiroNome: primeiroNome(aluno.nome),
        jaTemFoto: !!aluno.fotoUrl,
      });
    }

    // ── Passo 2: enviar a foto ──
    if (!foto || typeof foto !== "string" || !foto.startsWith("data:image/")) {
      return NextResponse.json({ error: "Foto inválida." }, { status: 422 });
    }

    try {
      await uploadFotoAluno(tenantId, aluno.id, foto);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[FOTO] Erro no upload:", detail);
      return NextResponse.json(
        { error: "Não foi possível salvar a foto. Tente novamente.", detail },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, primeiroNome: primeiroNome(aluno.nome) });
  } catch (err) {
    console.error("[FOTO] Erro inesperado:", err);
    return NextResponse.json(
      { error: "Erro interno.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
