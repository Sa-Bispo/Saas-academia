import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getTenantSubNicho } from "@/lib/nicho";

type Params = Promise<{ tenantId: string }>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { tenantId } = await params;

  if (!UUID_RE.test(tenantId)) {
    return NextResponse.json({ error: "tenantId inválido" }, { status: 400 });
  }

  const subNicho = await getTenantSubNicho(tenantId);

  if (subNicho === "lanchonete") {
    const [stockItems, combos] = await Promise.all([
      prisma.stockItem.findMany({
        where: { tenantId, ativo: true },
        select: {
          nome: true,
          preco: true,
          variacao: true,
          ativo: true,
          tem_variacoes: true,
          variacoes: {
            select: { sigla: true, nome: true, preco: true, ordem: true },
            orderBy: [{ ordem: "asc" }, { created_at: "asc" }],
          },
          adicionais: {
            where: { ativo: true },
            select: { nome: true, preco_extra: true },
            orderBy: { created_at: "asc" },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.combo.findMany({
        where: { tenantId, ativo: true },
        select: { nome: true, descricao: true, preco: true, ativo: true, itens: true },
        orderBy: { nome: "asc" },
      }),
    ]);

    const items = stockItems.map((item) => ({
        nome: item.nome,
        preco: Number(item.preco),
        categoria: item.variacao || "Outros",
        disponivel: item.ativo,
        tem_variacoes: item.tem_variacoes,
        variacoes: item.variacoes.map((v) => ({
          sigla: v.sigla,
          nome: v.nome,
          preco: Number(v.preco),
        })),
        adicionais: item.adicionais.map((a) => ({
          nome: a.nome,
          preco_extra: a.preco_extra,
        })),
      }));

    return NextResponse.json({
      items,
      itens: items,
      combos: combos.map((combo) => ({
        nome: combo.nome,
        descricao: combo.descricao || "",
        preco: combo.preco,
        disponivel: combo.ativo,
      })),
    });
  }

  if (subNicho === "pizzaria") {
    const [sabores, tamanhos, bordas, bebidas] = await Promise.all([
      prisma.stockItem.findMany({
        where: { tenantId, ativo: true },
        select: { nome: true, variacao: true, preco: true, ativo: true },
        orderBy: { nome: "asc" },
      }),
      prisma.pizzaTamanho.findMany({
        where: { tenantId },
        select: { sigla: true, nome: true, fatias: true, modificadorPreco: true, ordem: true },
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      }),
      prisma.pizzaBorda.findMany({
        where: { tenantId },
        select: { nome: true, precoExtra: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.$queryRaw<Array<{ nome: string; preco: number; ativo: boolean }>>`
        SELECT nome, preco, ativo
        FROM bebidas
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at ASC
      `,
    ]);

    return NextResponse.json({
      sabores: sabores.map((sabor) => ({
        nome: sabor.nome,
        categoria: sabor.variacao || "Outros",
        disponivel: sabor.ativo,
        precos: tamanhos.reduce<Record<string, number>>((acc, tamanho) => {
          acc[tamanho.sigla] = Number(sabor.preco) + tamanho.modificadorPreco;
          return acc;
        }, {}),
      })),
      tamanhos: tamanhos.map((tamanho) => ({
        sigla: tamanho.sigla,
        nome: tamanho.nome,
        fatias: tamanho.fatias,
      })),
      bordas: bordas.map((borda) => ({
        nome: borda.nome,
        preco_extra: borda.precoExtra,
      })),
      bebidas: bebidas.map((bebida) => ({
        nome: bebida.nome,
        preco: Number(bebida.preco),
        disponivel: Boolean(bebida.ativo),
      })),
    });
  }

  const stockItems = await prisma.stockItem.findMany({
    where: { tenantId },
    select: { nome: true, preco: true, quantidade: true },
    orderBy: { nome: "asc" },
  });

  const items = stockItems.map((item) => ({
    nome: item.nome,
    preco: Number(item.preco),
    quantidade: item.quantidade,
    disponivel: item.quantidade > 0,
  }));

  // Mapa nome→quantidade para checar disponibilidade dos combos
  const stockMap = new Map<string, number>(
    stockItems.map((i) => [i.nome.toLowerCase(), i.quantidade]),
  );

  const comboProdutos = await prisma.produto.findMany({
    where: { tenantId, ativo: true, classeNegocio: "combo" },
    select: { nome: true, precoBase: true, configNicho: true },
    orderBy: { nome: "asc" },
  });

  const combos = comboProdutos.map((combo) => {
    const cfg = (combo.configNicho as Record<string, unknown>) ?? {};
    const componentes = Array.isArray(cfg.componentes)
      ? (cfg.componentes as string[])
      : [];

    const disponivel =
      componentes.length === 0
        ? true
        : componentes.every(
            (nome) => (stockMap.get(nome.toLowerCase()) ?? 0) > 0,
          );

    return {
      nome: combo.nome,
      descricao:
        typeof cfg.descricao === "string"
          ? cfg.descricao
          : componentes.join(" + "),
      preco: Number(combo.precoBase),
      disponivel,
    };
  });

  return NextResponse.json({ items, combos });
}
