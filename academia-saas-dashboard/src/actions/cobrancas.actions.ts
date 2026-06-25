"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { prisma } from "@/lib/prisma";
import { evolutionService } from "@/services/evolution.service";
import { gerarReciboImagemBase64 } from "@/lib/recibo-image";

async function getAuthenticatedTenantId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { tenant } = await ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });
  return tenant.id;
}

// ─── Listagem ─────────────────────────────────────────────────────────────────

export async function listarCobrancas(filtroStatus?: string) {
  const tenantId = await getAuthenticatedTenantId();

  return prisma.cobrancaAluno.findMany({
    where: {
      tenantId,
      ...(filtroStatus && filtroStatus !== "todas"
        ? { status: filtroStatus as "PENDENTE" | "PAGO" | "VENCIDO" | "CANCELADA" }
        : {}),
    },
    orderBy: [{ status: "asc" }, { dataVencimento: "asc" }],
    include: {
      aluno: { select: { id: true, nome: true, telefone: true } },
      matricula: { include: { plano: true } },
    },
  });
}

// ─── Criar cobrança manual ────────────────────────────────────────────────────

export async function criarCobranca(data: {
  alunoId: string;
  matriculaId?: string;
  valorCents: number;
  dataVencimento: string;
  descricao?: string;
  pixChave?: string;
}) {
  const tenantId = await getAuthenticatedTenantId();

  const cobranca = await prisma.cobrancaAluno.create({
    data: {
      tenantId,
      alunoId: data.alunoId,
      matriculaId: data.matriculaId || null,
      valorCents: data.valorCents,
      dataVencimento: new Date(data.dataVencimento),
      descricao: data.descricao?.trim() || null,
      pixChave: data.pixChave?.trim() || null,
    },
  });

  revalidatePath("/cobrancas");
  return cobranca;
}

// ─── Gerar cobranças automáticas para matrículas próximas do vencimento ───────

export async function gerarCobrancasVencimento(diasAntecedencia: number = 5) {
  const tenantId = await getAuthenticatedTenantId();

  const hoje = new Date();
  const limite = new Date(hoje.getTime() + diasAntecedencia * 24 * 60 * 60 * 1000);

  // Busca matrículas ativas que vencem nos próximos X dias e ainda não têm cobrança pendente
  const matriculas = await prisma.matriculaAluno.findMany({
    where: {
      tenantId,
      status: "ATIVA",
      dataVencimento: { gte: hoje, lte: limite },
      cobrancas: { none: { status: { in: ["PENDENTE", "PAGO"] } } },
    },
    include: {
      aluno: true,
      plano: true,
    },
  });

  const resultados = await Promise.allSettled(
    matriculas.map((m) =>
      prisma.cobrancaAluno.create({
        data: {
          tenantId,
          alunoId: m.alunoId,
          matriculaId: m.id,
          valorCents: m.plano.valorCents,
          dataVencimento: m.dataVencimento,
          descricao: `Renovação: ${m.plano.nome}`,
        },
      })
    )
  );

  const geradas = resultados.filter((r) => r.status === "fulfilled").length;

  revalidatePath("/cobrancas");
  revalidatePath("/dashboard/academia");

  return { geradas };
}

// ─── Confirmar pagamento (Pix manual) ─────────────────────────────────────────

export async function confirmarPagamento(cobrancaId: string) {
  const tenantId = await getAuthenticatedTenantId();

  const cobranca = await prisma.cobrancaAluno.findFirst({
    where: { id: cobrancaId, tenantId },
    include: {
      matricula: true,
      aluno: { select: { id: true, nome: true, telefone: true } },
    },
  });

  if (!cobranca) throw new Error("Cobrança não encontrada");

  await prisma.cobrancaAluno.update({
    where: { id: cobrancaId },
    data: {
      status: "PAGO",
      dataPagamento: new Date(),
    },
  });

  // Renova a matrícula se houver vínculo
  if (cobranca.matriculaId && cobranca.matricula) {
    const plano = await prisma.planoAcademia.findUnique({
      where: { id: cobranca.matricula.planoId },
    });

    if (plano) {
      const novoVencimento = new Date(cobranca.matricula.dataVencimento);
      const meses =
        plano.periodicidade === "MENSAL"
          ? 1
          : plano.periodicidade === "TRIMESTRAL"
          ? 3
          : plano.periodicidade === "SEMESTRAL"
          ? 6
          : 12;
      novoVencimento.setMonth(novoVencimento.getMonth() + meses);

      await prisma.matriculaAluno.update({
        where: { id: cobranca.matriculaId },
        data: {
          dataVencimento: novoVencimento,
          status: "ATIVA",
        },
      });
    }
  }

  // Garante que o aluno está ATIVO
  await prisma.aluno.update({
    where: { id: cobranca.alunoId },
    data: { status: "ATIVO" },
  });

  // Notifica o aluno via WhatsApp
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { evolutionInstanceName: true, evolutionApiKey: true, companyName: true },
    });
    if (tenant?.evolutionInstanceName && cobranca.aluno.telefone) {
      const valorFmt = (cobranca.valorCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const texto = [
        `Olá, ${cobranca.aluno.nome}! 👋`,
        ``,
        `✅ *Pagamento confirmado!*`,
        `Recebemos seu pagamento de *${valorFmt}* — tudo certo por aqui!`,
        ``,
        `Sua matrícula está ativa. Bora treinar! 💪`,
      ].join("\n");
      await evolutionService.sendTextMessage(
        tenant.evolutionInstanceName,
        cobranca.aluno.telefone,
        texto,
        tenant.evolutionApiKey,
      );
    }
  } catch {
    // Não bloqueia a confirmação se o WhatsApp falhar
  }

  revalidatePath("/cobrancas");
  revalidatePath("/alunos");
  revalidatePath("/dashboard/academia");
}

// ─── Registrar pagamento em dinheiro + enviar recibo via WhatsApp ─────────────

export async function registrarPagamentoDinheiro(cobrancaId: string) {
  const tenantId = await getAuthenticatedTenantId();

  const cobranca = await prisma.cobrancaAluno.findFirst({
    where: { id: cobrancaId, tenantId },
    include: {
      matricula: true,
      aluno: { select: { id: true, nome: true, telefone: true } },
    },
  });

  if (!cobranca) throw new Error("Cobrança não encontrada");

  const dataPagamento = new Date();

  await prisma.cobrancaAluno.update({
    where: { id: cobrancaId },
    data: { status: "PAGO", dataPagamento },
  });

  if (cobranca.matriculaId && cobranca.matricula) {
    const plano = await prisma.planoAcademia.findUnique({
      where: { id: cobranca.matricula.planoId },
    });
    if (plano) {
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
  }

  await prisma.aluno.update({
    where: { id: cobranca.alunoId },
    data: { status: "ATIVO" },
  });

  // Gera recibo como imagem e envia via WhatsApp
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { evolutionInstanceName: true, evolutionApiKey: true, companyName: true },
    });

    if (tenant?.evolutionInstanceName && cobranca.aluno.telefone) {
      const academiaName = tenant.companyName ?? "Academia";
      try {
        const imageBase64 = await gerarReciboImagemBase64({
          cobrancaId,
          alunoNome: cobranca.aluno.nome,
          valorCents: cobranca.valorCents,
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
        // Fallback: texto simples se a geração de imagem falhar
        const valorFmt = (cobranca.valorCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        const texto = [
          `Ola, ${cobranca.aluno.nome}!`,
          ``,
          `*Recibo de Pagamento em Dinheiro*`,
          `Valor: *${valorFmt}*`,
          `${cobranca.descricao ? `Referencia: ${cobranca.descricao}` : ""}`,
          `Data: ${dataPagamento.toLocaleDateString("pt-BR")}`,
          `No. ${cobrancaId.slice(0, 8).toUpperCase()}`,
          ``,
          `Sua matricula esta ativa. Bora treinar! 💪`,
        ]
          .filter(Boolean)
          .join("\n");

        await evolutionService.sendTextMessage(
          tenant.evolutionInstanceName,
          cobranca.aluno.telefone,
          texto,
          tenant.evolutionApiKey,
        );
      }
    }
  } catch {
    // Não bloqueia o registro se o WhatsApp falhar
  }

  revalidatePath("/cobrancas");
  revalidatePath("/alunos");
  revalidatePath("/dashboard/academia");
}

// ─── Marcar como vencida ──────────────────────────────────────────────────────

export async function marcarCobrancaVencida(cobrancaId: string) {
  const tenantId = await getAuthenticatedTenantId();

  const cobranca = await prisma.cobrancaAluno.updateMany({
    where: { id: cobrancaId, tenantId, status: "PENDENTE" },
    data: { status: "VENCIDO" },
  });

  if (cobranca.count > 0) {
    // Marca aluno como inadimplente
    const c = await prisma.cobrancaAluno.findUnique({ where: { id: cobrancaId } });
    if (c) {
      await prisma.aluno.updateMany({
        where: { id: c.alunoId, tenantId },
        data: { status: "INADIMPLENTE" },
      });
    }
  }

  revalidatePath("/cobrancas");
  revalidatePath("/alunos");
  revalidatePath("/dashboard/academia");
}

// ─── Cancelar cobrança ────────────────────────────────────────────────────────

export async function cancelarCobranca(cobrancaId: string) {
  const tenantId = await getAuthenticatedTenantId();

  await prisma.cobrancaAluno.updateMany({
    where: { id: cobrancaId, tenantId },
    data: { status: "CANCELADA" },
  });

  revalidatePath("/cobrancas");
}

// ─── Resumo para dashboard ────────────────────────────────────────────────────

export async function getResumoCobrancas() {
  const tenantId = await getAuthenticatedTenantId();

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const [pendentes, vencidas, pagosMes, aguardandoValidacao] = await Promise.all([
    prisma.cobrancaAluno.aggregate({
      where: { tenantId, status: "PENDENTE" },
      _count: true,
      _sum: { valorCents: true },
    }),
    prisma.cobrancaAluno.aggregate({
      where: { tenantId, status: "VENCIDO" },
      _count: true,
      _sum: { valorCents: true },
    }),
    prisma.cobrancaAluno.aggregate({
      where: {
        tenantId,
        status: "PAGO",
        dataPagamento: { gte: inicioMes, lte: fimMes },
      },
      _count: true,
      _sum: { valorCents: true },
    }),
    prisma.cobrancaAluno.aggregate({
      where: { tenantId, status: "AGUARDANDO_VALIDACAO" },
      _count: true,
      _sum: { valorCents: true },
    }),
  ]);

  return { pendentes, vencidas, pagosMes, aguardandoValidacao };
}

// ─── Comprovantes pendentes (pagamento manual via Pix) ────────────────────────
// Fluxo sem gateway de pagamento: o bot informa o débito, envia a chave Pix,
// pede o comprovante na conversa e move a cobrança para AGUARDANDO_VALIDACAO.
// A confirmação final é manual, feita aqui pelo dono.

export async function listarComprovantesPendentes() {
  const tenantId = await getAuthenticatedTenantId();

  return prisma.cobrancaAluno.findMany({
    where: { tenantId, status: "AGUARDANDO_VALIDACAO" },
    orderBy: { comprovanteEnviadoEm: "desc" },
    include: {
      aluno: { select: { id: true, nome: true, telefone: true } },
      matricula: { include: { plano: true } },
    },
  });
}

export async function validarComprovante(cobrancaId: string) {
  // Reaproveita a lógica existente: marca PAGO, renova matrícula e ativa o aluno.
  await confirmarPagamento(cobrancaId);
}

export async function rejeitarComprovante(cobrancaId: string, motivo?: string) {
  const tenantId = await getAuthenticatedTenantId();

  const cobranca = await prisma.cobrancaAluno.findFirst({
    where: { id: cobrancaId, tenantId },
    include: { aluno: { select: { nome: true, telefone: true } } },
  });
  if (!cobranca) throw new Error("Cobrança não encontrada");

  const hoje = new Date();
  const novoStatus = cobranca.dataVencimento < hoje ? "VENCIDO" : "PENDENTE";

  await prisma.cobrancaAluno.update({
    where: { id: cobrancaId },
    data: {
      status: novoStatus,
      comprovanteUrl: null,
      comprovanteEnviadoEm: null,
    },
  });

  // Avisa o aluno via WhatsApp que o comprovante não foi validado
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { evolutionInstanceName: true, evolutionApiKey: true },
    });
    if (tenant?.evolutionInstanceName) {
      const texto = [
        `Olá, ${cobranca.aluno.nome}! 👋`,
        ``,
        `Não conseguimos confirmar o comprovante enviado${motivo ? `: ${motivo}` : "."}`,
        `Pode reenviar a foto do Pix ou entrar em contato com a recepção? 🙏`,
      ].join("\n");
      await evolutionService.sendTextMessage(
        tenant.evolutionInstanceName,
        cobranca.aluno.telefone,
        texto,
        tenant.evolutionApiKey,
      );
    }
  } catch {
    // Não bloqueia a rejeição se o envio do aviso falhar
  }

  revalidatePath("/cobrancas");
}

// ─── Enviar cobrança via WhatsApp ─────────────────────────────────────────────

export async function enviarCobrancaWhatsapp(cobrancaId: string) {
  const tenantId = await getAuthenticatedTenantId();

  const cobranca = await prisma.cobrancaAluno.findFirst({
    where: { id: cobrancaId, tenantId },
    include: {
      aluno: { select: { nome: true, telefone: true } },
    },
  });

  if (!cobranca) throw new Error("Cobrança não encontrada");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      evolutionInstanceName: true,
      evolutionApiKey: true,
      companyName: true,
      configNicho: true,
    },
  });

  if (!tenant?.evolutionInstanceName) {
    throw new Error("WhatsApp não conectado. Conecte o WhatsApp nas configurações.");
  }

  const valorFormatado = (cobranca.valorCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const vencimento = new Date(cobranca.dataVencimento).toLocaleDateString("pt-BR");
  const nomeNegocio = tenant.companyName ?? "Academia";

  // Pega a chave Pix do configNicho ou da própria cobrança
  const configNicho = tenant.configNicho as Record<string, string> | null;
  const pixChave = cobranca.pixChave ?? configNicho?.pixChave ?? null;

  const linhas = [
    `Olá, ${cobranca.aluno.nome}! 👋`,
    ``,
    `🏋️ *${nomeNegocio}*`,
    ``,
    `Identificamos uma mensalidade em aberto:`,
    `💰 *Valor:* ${valorFormatado}`,
    `📅 *Vencimento:* ${vencimento}`,
    cobranca.descricao ? `📋 *Ref:* ${cobranca.descricao}` : null,
    ``,
    pixChave ? `🔑 *Chave Pix:* \`${pixChave}\`` : null,
    ``,
    `Em caso de dúvidas, entre em contato com a gente. 😊`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  await evolutionService.sendTextMessage(
    tenant.evolutionInstanceName,
    cobranca.aluno.telefone,
    linhas,
    tenant.evolutionApiKey,
  );

  await prisma.cobrancaAluno.update({
    where: { id: cobrancaId },
    data: { enviadaWhatsapp: true },
  });

  revalidatePath("/cobrancas");
}
