import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evolutionService } from "@/services/evolution.service";
import { gerarReciboImagemBase64 } from "@/lib/recibo-image";

// Chamado pelo bot quando um funcionário confirma o código de pagamento.
// Body: { codigo: string, funcionarioId: string, tenantId: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { codigo: string; funcionarioId: string; tenantId: string };
    const { codigo, funcionarioId, tenantId } = body;

    if (!codigo || !funcionarioId || !tenantId) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    const cp = await prisma.codigoPagamento.findFirst({
      where: {
        codigo,
        tenantId,
        usadoEm: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        cobranca: {
          include: {
            aluno: { select: { id: true, nome: true, telefone: true } },
            matricula: { include: { plano: true } },
          },
        },
      },
    });

    if (!cp) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 404 });
    }

    const cobranca = cp.cobranca;
    if (cobranca.status === "PAGO") {
      return NextResponse.json({ error: "Esta cobrança já foi paga." }, { status: 409 });
    }

    const dataPagamento = new Date();

    // Determina o valor a usar (dinheiro do plano ou valor padrão)
    const valorCents = cobranca.matricula?.plano?.valorCentsDinheiro ?? cobranca.valorCents;

    // Marca código como usado
    await prisma.codigoPagamento.update({
      where: { id: cp.id },
      data: { usadoEm: dataPagamento, funcionarioId },
    });

    // Marca cobrança como PAGO
    await prisma.cobrancaAluno.update({
      where: { id: cobranca.id },
      data: {
        status: "PAGO",
        dataPagamento,
        formaPagamento: "DINHEIRO",
        confirmadoPorFuncionarioId: funcionarioId,
        valorCents,
      },
    });

    // Renova matrícula se houver
    if (cobranca.matriculaId && cobranca.matricula) {
      const plano = cobranca.matricula.plano;
      const novoVencimento = new Date(cobranca.matricula.dataVencimento);
      const meses =
        plano.periodicidade === "MENSAL" ? 1
        : plano.periodicidade === "TRIMESTRAL" ? 3
        : plano.periodicidade === "SEMESTRAL" ? 6
        : 12;
      novoVencimento.setMonth(novoVencimento.getMonth() + meses);
      await prisma.matriculaAluno.update({
        where: { id: cobranca.matriculaId },
        data: { dataVencimento: novoVencimento, status: "ATIVA" },
      });
    }

    // Ativa o aluno
    await prisma.aluno.update({
      where: { id: cobranca.alunoId },
      data: { status: "ATIVO" },
    });

    // Envia recibo ao aluno via WhatsApp
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { evolutionInstanceName: true, evolutionApiKey: true, companyName: true },
      });

      if (tenant?.evolutionInstanceName && cobranca.aluno.telefone) {
        const academiaName = tenant.companyName ?? "Academia";
        try {
          const imageBase64 = await gerarReciboImagemBase64({
            cobrancaId: cobranca.id,
            alunoNome: cobranca.aluno.nome,
            valorCents,
            descricao: cobranca.descricao,
            dataPagamento,
            academiaName,
          });
          await evolutionService.sendImageMessage(
            tenant.evolutionInstanceName,
            cobranca.aluno.telefone,
            imageBase64,
            `Recibo de Pagamento — ${academiaName}`,
            tenant.evolutionApiKey,
          );
        } catch {
          const valorFmt = (valorCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          await evolutionService.sendTextMessage(
            tenant.evolutionInstanceName,
            cobranca.aluno.telefone,
            [
              `Olá, ${cobranca.aluno.nome}! 👋`,
              ``,
              `✅ *Pagamento em dinheiro confirmado!*`,
              `Valor: *${valorFmt}*`,
              `Data: ${dataPagamento.toLocaleDateString("pt-BR")}`,
              ``,
              `Sua matrícula está ativa. Bora treinar! 💪`,
            ].join("\n"),
            tenant.evolutionApiKey,
          );
        }
      }
    } catch {
      // Não bloqueia a confirmação
    }

    return NextResponse.json({
      ok: true,
      alunoNome: cobranca.aluno.nome,
      valorCents,
    });
  } catch (err) {
    console.error("[BOT/confirmar-codigo]", err);
    return NextResponse.json(
      { error: "Erro interno.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
