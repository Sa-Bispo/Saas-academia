import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Chamado pelo bot quando o aluno pede pagamento em dinheiro.
// Body: { cobrancaId: string, tenantId: string }
// Gera (ou reutiliza) um código de pagamento ativo.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { cobrancaId: string; tenantId: string };
    const { cobrancaId, tenantId } = body;

    if (!cobrancaId || !tenantId) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    const cobranca = await prisma.cobrancaAluno.findFirst({
      where: { id: cobrancaId, tenantId, status: { in: ["PENDENTE", "VENCIDO"] } },
    });
    if (!cobranca) {
      return NextResponse.json({ error: "Cobrança não encontrada ou já paga." }, { status: 404 });
    }

    // Reutiliza código ativo se existir
    const existing = await prisma.codigoPagamento.findFirst({
      where: { cobrancaId, usadoEm: null, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
    });
    if (existing) {
      return NextResponse.json({ codigo: existing.codigo, cobrancaId, reused: true });
    }

    // Gera novo código
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    function gerarCodigo() {
      let c = "";
      for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
      return `#${c}`;
    }

    // Expira códigos anteriores
    await prisma.codigoPagamento.deleteMany({ where: { cobrancaId, usadoEm: null } });

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    let codigo = "";
    for (let i = 0; i < 10; i++) {
      const c = gerarCodigo();
      const existe = await prisma.codigoPagamento.findUnique({ where: { codigo: c } });
      if (!existe) { codigo = c; break; }
    }
    if (!codigo) return NextResponse.json({ error: "Não foi possível gerar código." }, { status: 500 });

    const cp = await prisma.codigoPagamento.create({
      data: { tenantId, cobrancaId, codigo, expiresAt },
    });

    return NextResponse.json({ codigo: cp.codigo, cobrancaId, reused: false });
  } catch (err) {
    console.error("[BOT/gerar-codigo]", err);
    return NextResponse.json(
      { error: "Erro interno.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
