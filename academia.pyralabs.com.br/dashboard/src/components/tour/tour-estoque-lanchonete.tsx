"use client";

import { useEffect } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useTour } from "@/hooks/use-tour";

const ALL_STEPS: DriveStep[] = [
  {
    element: "[data-tour='stats-cards']",
    popover: {
      title: "📊 Seu cardápio em números",
      description:
        "Aqui você vê quantos itens tem cadastrados, quais estão disponíveis agora e quantos combos estão ativos. O bot usa esses dados em tempo real.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='btn-importar-ia']",
    popover: {
      title: "🤖 Importar cardápio com IA",
      description:
        "Tem muitos produtos? Cole o texto do cardápio e a IA cadastra tudo automaticamente. Funciona até com foto do cardápio.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='btn-categorias']",
    popover: {
      title: "📁 Comece pelas categorias",
      description:
        "Antes de adicionar produtos, crie suas categorias. Ex: Lanches, Bebidas, Porções, Sobremesas. O bot organiza as respostas por categoria.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='lista-categorias']",
    popover: {
      title: "🗂️ Organize a ordem",
      description:
        "Arraste as categorias pra definir a ordem no cardápio. Coloque as mais pedidas no topo — isso agiliza o atendimento nas horas de pico.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='btn-novo-produto']",
    popover: {
      title: "➕ Cadastrar lanche ou item",
      description:
        "Clique aqui para adicionar um produto. Informe o nome, preço e categoria. Simples assim — o bot já começa a vender.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='lista-produtos']",
    popover: {
      title: "🍔 Seus produtos",
      description:
        "Cada produto aparece aqui com nome, preço e status. O bot só oferece produtos disponíveis — os desativados são ignorados automaticamente.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "[data-tour='btn-editar-produto']",
    popover: {
      title: "✏️ Variações e adicionais",
      description:
        "Clique em Editar para configurar tamanhos P/M/G com preços diferentes e adicionais como Bacon, Cheddar e Catupiry. O bot pergunta automaticamente ao cliente.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "[data-tour='tab-combos']",
    popover: {
      title: "📦 Combos do dia",
      description:
        "Crie combos pra aumentar o ticket médio. Ex: X-Bacon + Batata P + Refri por R$32. O bot sugere o combo quando o cliente pede o lanche principal.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='tab-disponibilidade']",
    popover: {
      title: "🟢 Disponibilidade em tempo real",
      description:
        "Clique aqui pra ver todos os produtos com toggle. Ideal pra abertura e fechamento — desative o que acabou e o bot para de oferecer na hora.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='toggle-produto']",
    popover: {
      title: "⚡ Ativar e desativar em 1 clique",
      description:
        "Acabou a porção de batata? Desativa aqui e o bot já não oferece mais. Sem precisar deletar o produto — é só reativar quando tiver de volta.",
      side: "left",
      align: "center",
    },
  },
];

function setProgressVar(current: number, total: number) {
  document.documentElement.style.setProperty(
    "--pyra-tour-pct",
    String(current / total),
  );
}

export function TourEstoqueLanchonete() {
  const { jaViu, marcarConcluido } = useTour("estoque-lanchonete");

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
