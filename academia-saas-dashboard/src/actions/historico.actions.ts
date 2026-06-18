"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";

async function getAuthenticatedTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  return ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });
}

function getPeriodRange(
  periodo: "hoje" | "semana" | "mes",
  dataInicio?: Date,
  dataFim?: Date,
): { start: Date; end: Date } {
  const now = new Date();

  if (periodo === "hoje") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (periodo === "semana") {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1; // Retrocede até segunda-feira
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (periodo === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }

  return { start: dataInicio ?? new Date(0), end: dataFim ?? now };
}

export type PedidoHistoricoDTO = {
  id: string;
  status: string;
  total: string;
  forma_pagamento: string;
  data_criacao: string;
  customer: {
    id: string;
    nome: string;
    telefone: string;
    endereco: string;
  };
  items: Array<{
    id: string;
    nome_produto: string;
    quantidade: number;
    preco_unitario: string;
  }>;
};

export type MetricasHistorico = {
  totalPedidos: number;
  faturamento: number;
  ticketMedio: number;
  produtoTop: string;
};

export async function getPedidosHistorico(
  periodo: "hoje" | "semana" | "mes" | "custom",
  dataInicio?: Date,
  dataFim?: Date,
): Promise<PedidoHistoricoDTO[]> {
  const tenantData = await getAuthenticatedTenant();

  const basePeriodo = periodo === "custom" ? "hoje" : periodo;
  const { start, end } =
    periodo === "custom"
      ? { start: dataInicio ?? new Date(0), end: dataFim ?? new Date() }
      : getPeriodRange(basePeriodo);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenantData.tenant.id,
      tenant: { userId: tenantData.user.id },
      status: { in: ["CONCLUIDO", "CANCELADO"] },
      data_criacao: { gte: start, lte: end },
    },
    orderBy: { data_criacao: "desc" },
    select: {
      id: true,
      status: true,
      total: true,
      forma_pagamento: true,
      data_criacao: true,
      customer: {
        select: { id: true, nome: true, telefone: true, endereco: true },
      },
      items: {
        select: { id: true, nome_produto: true, quantidade: true, preco_unitario: true },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return orders.map((order: any) => ({
    id: order.id,
    status: order.status,
    total: order.total.toString(),
    forma_pagamento: order.forma_pagamento,
    data_criacao: order.data_criacao.toISOString(),
    customer: order.customer,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: order.items.map((item: any) => ({
      id: item.id,
      nome_produto: item.nome_produto,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario.toString(),
    })),
  }));
}

export async function getMetricasHistorico(
  periodo: "hoje" | "semana" | "mes",
): Promise<MetricasHistorico> {
  const tenantData = await getAuthenticatedTenant();
  const { start, end } = getPeriodRange(periodo);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenantData.tenant.id,
      tenant: { userId: tenantData.user.id },
      status: "CONCLUIDO",
      data_criacao: { gte: start, lte: end },
    },
    select: {
      total: true,
      items: { select: { nome_produto: true, quantidade: true } },
    },
  });

  const totalPedidos = orders.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faturamento = orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const ticketMedio = totalPedidos > 0 ? faturamento / totalPedidos : 0;

  const productCounts = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      productCounts.set(
        item.nome_produto,
        (productCounts.get(item.nome_produto) ?? 0) + item.quantidade,
      );
    }
  }

  let produtoTop = "—";
  let maxCount = 0;
  for (const [nome, count] of productCounts) {
    if (count > maxCount) {
      maxCount = count;
      produtoTop = nome;
    }
  }

  return { totalPedidos, faturamento, ticketMedio, produtoTop };
}
