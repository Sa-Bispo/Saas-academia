"use client";

import { useEffect } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useTour } from "@/hooks/use-tour";

const ALL_STEPS: DriveStep[] = [
  {
    element: "[data-tour='stats-cards']",
    popover: {
      title: "📊 Visão geral do seu estoque",
      description:
        "Acompanhe em tempo real quantos produtos estão cadastrados, em estoque, com estoque baixo e esgotados. O bot usa esses dados para oferecer apenas o que está disponível.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='btn-importar-ia']",
    popover: {
      title: "🤖 Importar cardápio com IA",
      description:
        "Tem muitos produtos? Envie uma foto ou texto do seu cardápio e a IA cadastra tudo automaticamente em segundos. Economiza muito tempo.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='btn-categorias']",
    popover: {
      title: "📁 Comece pelas categorias",
      description:
        "Antes de adicionar produtos, crie suas categorias. Ex: Vinhos, Cervejas, Destilados, Sem Álcool. O bot organiza as respostas por categoria.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='lista-categorias']",
    popover: {
      title: "🗂️ Organize e reordene",
      description:
        "Seus produtos ficam agrupados por categoria. Coloque as mais pedidas no topo — isso agiliza o atendimento e facilita a gestão do estoque.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='btn-novo-produto']",
    popover: {
      title: "➕ Adicionar produto",
      description:
        "Clique aqui para cadastrar um novo produto. Você vai informar o nome, preço e categoria. Simples assim.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='lista-produtos']",
    popover: {
      title: "🍶 Seus produtos",
      description:
        "Cada produto aparece aqui com nome, categoria e quantidade em estoque. O ponto colorido indica a situação: verde = disponível, amarelo = estoque baixo, vermelho = esgotado.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "[data-tour='toggle-produto']",
    popover: {
      title: "⚡ Controle de quantidade em 1 clique",
      description:
        "Use os botões + e − para ajustar o estoque. Quando chegar a zero, o produto fica como Esgotado e o bot para de oferecê-lo automaticamente.",
      side: "left",
      align: "center",
    },
  },
  {
    element: "[data-tour='btn-editar-produto']",
    popover: {
      title: "✏️ Configurar produto",
      description:
        "Clique em Editar para configurar regras do bot, adicionais opcionais (ex: taça, gelo, limão) e variações de tamanho com preços diferentes.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "[data-tour='tab-combos']",
    popover: {
      title: "📦 Combos para aumentar o ticket",
      description:
        "Crie combos para aumentar o ticket médio. Ex: Vinho + Taça + Petisco por R$89. O bot sugere o combo quando o cliente pede o produto principal.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='tab-disponibilidade']",
    popover: {
      title: "📋 Histórico de movimentações",
      description:
        "Aqui você vê tudo que entrou e saiu do estoque: vendas automáticas, entradas manuais e baixas. Útil para conferir o fechamento do dia.",
      side: "bottom",
      align: "start",
    },
  },
];

function setProgressVar(current: number, total: number) {
  document.documentElement.style.setProperty(
    "--pyra-tour-pct",
    String(current / total),
  );
}

export function TourEstoque() {
  const { jaViu, marcarConcluido } = useTour("estoque");

  useEffect(() => {
    if (jaViu) return;

    const timer = setTimeout(() => {
      const steps = ALL_STEPS.filter((step) => {
        if (!step.element) return true;
        return document.querySelector(step.element as string) !== null;
      });

      if (steps.length === 0) {
        marcarConcluido();
        return;
      }

      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} de {{total}}",
        nextBtnText: "Próximo →",
        prevBtnText: "← Anterior",
        doneBtnText: "Concluir ✓",
        allowClose: true,
        stagePadding: 10,
        stageRadius: 10,
        popoverClass: "pyra-tour-popover",
        onHighlightStarted: (_el, _step, opts) => {
          setProgressVar((opts.state.activeIndex ?? 0) + 1, steps.length);
        },
        onDestroyStarted: () => {
          document.documentElement.style.removeProperty("--pyra-tour-pct");
          marcarConcluido();
          driverObj.destroy();
        },
        steps,
      });

      setProgressVar(1, steps.length);
      driverObj.drive();
    }, 800);

    return () => clearTimeout(timer);
  }, [jaViu]);

  return null;
}
