import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

// Telinha pública de auto-atendimento: o aluno se identifica por CPF + data de
// nascimento e envia a própria foto. Reaproveita o bucket "fotos-alunos".

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

// Compara só a parte de data (ignora hora/timezone) entre o dataNascimento salvo
// e o "YYYY-MM-DD" enviado pelo aluno.
function mesmaData(salvo: Date | null, informado: string): boolean {
  if (!salvo) return false;
  const d = new Date(salvo);
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return iso === informado;
}

async function acharAluno(tenantId: string, cpf: string, dataNascimento: string) {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return null;
  const aluno = await prisma.aluno.findFirst({ where: { tenantId, cpf: cpfLimpo } });
  if (!aluno) return null;
  if (!mesmaData(aluno.dataNascimento, dataNascimento)) return null;
  return aluno;
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

    let body: { action?: string; cpf?: string; dataNascimento?: string; foto?: string | null };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const { action, cpf, dataNascimento, foto } = body;

    if (!cpf || !dataNascimento) {
      return NextResponse.json({ error: "Informe CPF e data de nascimento." }, { status: 422 });
    }

    const aluno = await acharAluno(tenantId, cpf, dataNascimento);
    // Mensagem genérica de propósito: não revela se o CPF existe (evita enumeração).
    if (!aluno) {
      return NextResponse.json(
        { error: "Não encontramos um cadastro com esse CPF e data de nascimento." },
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

    const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const supabase = createAdminClient();
    const path = `${tenantId}/${aluno.id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("fotos-alunos")
      .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      console.error("[FOTO] Erro no upload:", uploadError.message);
      return NextResponse.json(
        { error: "Não foi possível salvar a foto. Tente novamente.", detail: uploadError.message },
        { status: 502 }
      );
    }

    const { data: urlData } = supabase.storage.from("fotos-alunos").getPublicUrl(path);
    // Cache-buster: a URL pública é a mesma a cada troca; o timestamp força refresh.
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    await prisma.aluno.update({ where: { id: aluno.id }, data: { fotoUrl: publicUrl } });

    return NextResponse.json({ ok: true, primeiroNome: primeiroNome(aluno.nome) });
  } catch (err) {
    console.error("[FOTO] Erro inesperado:", err);
    return NextResponse.json(
      { error: "Erro interno.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
