"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { OrderStatus } from "@/generated/prisma/client";

type TenantContext = {
  tenantId: string;
};

async function getAuthenticatedTenantContext(): Promise<TenantContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuario nao autenticado");
  }

  const tenantData = await ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });

  return { tenantId: tenantData.tenant.id };
}

const STATUS_PEDIDOS_VALIDOS: OrderStatus[] = [OrderStatus.CONCLUIDO];

export async function getFaturamentoPorDia(dias = 7) {
  const { tenantId } = await getAuthenticatedTenantContext();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);

  const pedidos = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: STATUS_PEDIDOS_VALIDOS },
      data_criacao: { gte: inicio },
    },
    select: { total: true, data_criacao: true },
  });

  const porDia: Record<string, number> = {};
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    porDia[key] = 0;
  }

  for (const pedido of pedidos) {
    const key = new Date(pedido.data_criacao).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    if (Object.prototype.hasOwnProperty.call(porDia, key)) {
      porDia[key] += Number(pedido.total || 0);
    }
  }

  return Object.entries(porDia).map(([dia, total]) => ({ dia, total }));
}

export async function getProdutosMaisVendidos(dias = 30) {
  const { tenantId } = await getAuthenticatedTenantContext();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        tenantId,
        status: { in: STATUS_PEDIDOS_VALIDOS },
        data_criacao: { gte: inicio },
      },
    },
    select: { nome_produto: true, quantidade: true, preco_unitario: true },
  });

  const ranking: Record<string, { quantidade: number; faturamento: number }> = {};
  for (const item of items) {
    const nome = (item.nome_produto || "Sem nome").trim() || "Sem nome";
    if (!ranking[nome]) {
      ranking[nome] = { quantidade: 0, faturamento: 0 };
    }
    const quantidade = Number(item.quantidade || 1);
    ranking[nome].quantidade += quantidade;
    ranking[nome].faturamento += Number(item.preco_unitario || 0) * quantidade;
  }

  return Object.entries(ranking)
    .map(([nome, data]) => ({ nome, ...data }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 8);
}

export async function getPedidosPorHora(dias = 30) {
  const { tenantId } = await getAuthenticatedTenantContext();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);

  const pedidos = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: STATUS_PEDIDOS_VALIDOS },
      data_criacao: { gte: inicio },
    },
    select: { data_criacao: true },
  });

  const porHora: Record<number, number> = {};
  for (let h = 0; h < 24; h++) porHora[h] = 0;

  for (const pedido of pedidos) {
    const hora = new Date(pedido.data_criacao).getHours();
    porHora[hora] += 1;
  }

  return Object.entries(porHora).map(([hora, totalPedidos]) => ({
    hora: `${hora}h`,
    pedidos: totalPedidos,
  }));
}

export async function getComparativoSemanal() {
  const { tenantId } = await getAuthenticatedTenantContext();

  const hoje = new Date();
  const inicioSemanaAtual = new Date(hoje);
  inicioSemanaAtual.setDate(hoje.getDate() - 6);

  const inicioSemanaAnterior = new Date(hoje);
  inicioSemanaAnterior.setDate(hoje.getDate() - 13);

  const [atual, anterior] = await Promise.all([
    prisma.order.aggregate({
      where: {
        tenantId,
        status: { in: STATUS_PEDIDOS_VALIDOS },
        data_criacao: { gte: inicioSemanaAtual },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: {
        tenantId,
        status: { in: STATUS_PEDIDOS_VALIDOS },
        data_criacao: { gte: inicioSemanaAnterior, lt: inicioSemanaAtual },
      },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const fatAtual = Number(atual._sum.total || 0);
  const fatAnterior = Number(anterior._sum.total || 0);

  const variacaoFat = fatAnterior > 0 ? ((fatAtual - fatAnterior) / fatAnterior) * 100 : 0;
  const variacaoPed = anterior._count > 0 ? ((atual._count - anterior._count) / anterior._count) * 100 : 0;

  return {
    semanaAtual: { faturamento: fatAtual, pedidos: atual._count },
    semanaAnterior: { faturamento: fatAnterior, pedidos: anterior._count },
    variacaoFaturamento: Number(variacaoFat.toFixed(1)),
    variacaoPedidos: Number(variacaoPed.toFixed(1)),
  };
}
