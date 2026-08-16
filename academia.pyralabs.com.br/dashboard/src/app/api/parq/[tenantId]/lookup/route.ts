import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Triagem do fluxo PAR-Q: o aluno começa por CPF + data de nascimento e o
// sistema decide o caminho — cadastro novo, só foto, já completo ou data errada.

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function mesmaData(salvo: Date | null, informado: string): boolean {
  if (!salvo) return false;
  const d = new Date(salvo);
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return iso === informado;
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

    let body: { cpf?: string; dataNascimento?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const cpfLimpo = (body.cpf ?? "").replace(/\D/g, "");
    const dataNascimento = body.dataNascimento ?? "";

    if (cpfLimpo.length !== 11) {
      return NextResponse.json({ error: "Informe os 11 dígitos do CPF." }, { status: 422 });
    }
    if (!dataNascimento) {
      return NextResponse.json({ error: "Informe a data de nascimento." }, { status: 422 });
    }

    const aluno = await prisma.aluno.findFirst({
      where: { tenantId, cpf: cpfLimpo },
      select: { id: true, nome: true, dataNascimento: true, fotoUrl: true },
    });

    // CPF não está na base → aluno novo, segue o formulário completo.
    if (!aluno) {
      return NextResponse.json({ status: "novo" });
    }

    // CPF existe mas a data não bate → bloqueia (não cria duplicado, não deixa
    // um estranho mexer no cadastro alheio). Não devolve o nome de propósito.
    if (!mesmaData(aluno.dataNascimento, dataNascimento)) {
      return NextResponse.json({ status: "data_errada" });
    }

    // CPF + data conferem → só falta a foto, ou já está completo.
    if (!aluno.fotoUrl) {
      return NextResponse.json({ status: "foto", primeiroNome: primeiroNome(aluno.nome) });
    }
    return NextResponse.json({ status: "completo", primeiroNome: primeiroNome(aluno.nome) });
  } catch (err) {
    console.error("[PARQ lookup] Erro:", err);
    return NextResponse.json(
      { error: "Erro interno.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
