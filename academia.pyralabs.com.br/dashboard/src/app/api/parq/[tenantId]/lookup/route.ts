import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Triagem do fluxo PAR-Q: o aluno começa só pelo CPF e o sistema decide o
// caminho — cadastro novo, só foto, ou já completo. Não confere data de
// nascimento: muita gente na base tem a data errada (cadastro antigo/planilha),
// e isso travava gente que deveria simplesmente continuar o cadastro.

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
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

    let body: { cpf?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const cpfLimpo = (body.cpf ?? "").replace(/\D/g, "");

    if (cpfLimpo.length !== 11) {
      return NextResponse.json({ error: "Informe os 11 dígitos do CPF." }, { status: 422 });
    }

    const aluno = await prisma.aluno.findFirst({
      where: { tenantId, cpf: cpfLimpo },
      select: { id: true, nome: true, fotoUrl: true },
    });

    // CPF não está na base → aluno novo, segue o formulário completo.
    if (!aluno) {
      return NextResponse.json({ status: "novo" });
    }

    // CPF já cadastrado → só falta a foto, ou já está completo (mas pode trocar).
    if (!aluno.fotoUrl) {
      return NextResponse.json({ status: "foto", primeiroNome: primeiroNome(aluno.nome) });
    }
    return NextResponse.json({
      status: "completo",
      primeiroNome: primeiroNome(aluno.nome),
      fotoUrl: aluno.fotoUrl,
    });
  } catch (err) {
    console.error("[PARQ lookup] Erro:", err);
    return NextResponse.json(
      { error: "Erro interno.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
