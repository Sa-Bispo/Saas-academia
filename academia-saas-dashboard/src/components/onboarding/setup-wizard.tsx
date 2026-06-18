"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Sparkles,
  Table2,
  Upload,
  ChevronRight,
  Store,
  UserRound,
  Building2,
  Clock3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SubNicho } from "@/lib/nicho";
import { loadExampleProducts, saveDeliveryIdentity } from "@/actions/setup.actions";

export type SetupMode = "delivery" | "agendamentos" | "empresa";

type Weekday = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

type ShiftConfig = {
  enabled: boolean;
  openTime: string;
  closeTime: string;
  days: Weekday[];
};

type ScheduleState = Record<string, ShiftConfig>;

type OptionItem = {
  id: string;
  emoji: string;
  label: string;
};

type ShiftItem = {
  id: string;
  emoji: string;
  label: string;
  defaultOpen: string;
  defaultClose: string;
  defaultDays?: Weekday[];
  defaultEnabled?: boolean;
};

type ChannelItem = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
};

type DeliveryTone = "DESCONTRAIDO" | "VENDEDOR" | "FORMAL";

type DeliveryProfile = {
  tabLabel: string;
  step1Title: string;
  companyLabel: string;
  companyPlaceholder: string;
  botPlaceholder: string;
  botPreviewFallback: string;
  recommendedTone: DeliveryTone;
  toneOptions: { value: DeliveryTone; label: string }[];
  step4Title: string;
  step4Subtitle: string;
  shifts: ShiftItem[];
  step4Label: string;
};

const TOTAL_STEPS = 4;

const WEEKDAYS: { id: Weekday; short: string; label: string }[] = [
  { id: "dom", short: "D", label: "Domingo" },
  { id: "seg", short: "S", label: "Segunda" },
  { id: "ter", short: "T", label: "Terca" },
  { id: "qua", short: "Q", label: "Quarta" },
  { id: "qui", short: "Q", label: "Quinta" },
  { id: "sex", short: "S", label: "Sexta" },
  { id: "sab", short: "S", label: "Sabado" },
];

const WEEKDAY_PRESETS: { id: string; label: string; days: Weekday[] }[] = [
  { id: "week", label: "Seg-Sex", days: ["seg", "ter", "qua", "qui", "sex"] },
  { id: "all", label: "Todos", days: WEEKDAYS.map((d) => d.id) },
  { id: "weekend", label: "Fim de semana", days: ["sab", "dom"] },
];

const DELIVERY_PROFILES: Record<SubNicho, DeliveryProfile> = {
  adega: {
    tabLabel: "Adega",
    step1Title: "Vamos apresentar sua adega",
    companyLabel: "Nome da sua adega",
    companyPlaceholder: "Adega do Ze",
    botPlaceholder: "Ze",
    botPreviewFallback: "Ze",
    recommendedTone: "DESCONTRAIDO",
    toneOptions: [
      { value: "DESCONTRAIDO", label: "Descontraido e jovem - recomendado para adega" },
      { value: "VENDEDOR", label: "Animado e vendedor" },
      { value: "FORMAL", label: "Formal e profissional" },
    ],
    step4Title: "Monte seu estoque agora",
    step4Subtitle: "Escolha como quer cadastrar seus produtos",
    shifts: [
      {
        id: "principal",
        emoji: "crescent_moon",
        label: "Noite",
        defaultOpen: "18:00",
        defaultClose: "02:00",
        defaultDays: ["seg", "ter", "qua", "qui", "sex", "sab"],
        defaultEnabled: true,
      },
      {
        id: "opcional",
        emoji: "sun_behind_small_cloud",
        label: "Tarde",
        defaultOpen: "13:00",
        defaultClose: "18:00",
        defaultDays: ["seg", "ter", "qua", "qui", "sex"],
      },
    ],
    step4Label: "Catalogo",
  },
  lanchonete: {
    tabLabel: "Lanchonete",
    step1Title: "Vamos apresentar sua lanchonete",
    companyLabel: "Nome da sua lanchonete",
    companyPlaceholder: "Lanchonete da Mari",
    botPlaceholder: "Mari",
    botPreviewFallback: "Mari",
    recommendedTone: "VENDEDOR",
    toneOptions: [
      { value: "VENDEDOR", label: "Animado e vendedor - recomendado para lanchonete" },
      { value: "DESCONTRAIDO", label: "Descontraido e jovem" },
      { value: "FORMAL", label: "Formal e profissional" },
    ],
    step4Title: "Monte seu cardapio agora",
    step4Subtitle: "Escolha como quer cadastrar seus lanches e combos.",
    shifts: [
      {
        id: "principal",
        emoji: "sunny",
        label: "Almoco",
        defaultOpen: "11:00",
        defaultClose: "15:00",
        defaultDays: ["seg", "ter", "qua", "qui", "sex"],
        defaultEnabled: true,
      },
      {
        id: "opcional",
        emoji: "crescent_moon",
        label: "Jantar",
        defaultOpen: "18:00",
        defaultClose: "23:00",
        defaultDays: ["seg", "ter", "qua", "qui", "sex"],
      },
    ],
    step4Label: "Catalogo",
  },
  pizzaria: {
    tabLabel: "Pizzaria",
    step1Title: "Vamos apresentar sua pizzaria",
    companyLabel: "Nome da pizzaria",
    companyPlaceholder: "Pizzaria do Joao",
    botPlaceholder: "Joao",
    botPreviewFallback: "Joao",
    recommendedTone: "DESCONTRAIDO",
    toneOptions: [
      { value: "DESCONTRAIDO", label: "Descontraido e jovem - recomendado para pizzaria" },
      { value: "VENDEDOR", label: "Animado e vendedor" },
      { value: "FORMAL", label: "Formal e profissional" },
    ],
    step4Title: "Monte seu cardapio de sabores",
    step4Subtitle: "Escolha como quer cadastrar suas pizzas, tamanhos e bordas.",
    shifts: [
      {
        id: "principal",
        emoji: "crescent_moon",
        label: "Jantar",
        defaultOpen: "18:00",
        defaultClose: "23:30",
        defaultDays: ["qua", "qui", "sex", "sab", "dom"],
        defaultEnabled: true,
      },
      {
        id: "opcional",
        emoji: "sunny",
        label: "Almoco",
        defaultOpen: "11:00",
        defaultClose: "15:00",
        defaultDays: ["seg", "ter", "qua", "qui", "sex"],
      },
    ],
    step4Label: "Sabores",
  },
  academia: {
    tabLabel: "Academia",
    step1Title: "Vamos apresentar sua academia",
    companyLabel: "Nome da sua academia",
    companyPlaceholder: "Academia Movimento",
    botPlaceholder: "Coach Ana",
    botPreviewFallback: "Coach Ana",
    recommendedTone: "FORMAL",
    toneOptions: [
      { value: "FORMAL", label: "Consultivo e profissional - recomendado para academia" },
      { value: "VENDEDOR", label: "Comercial e motivador" },
      { value: "DESCONTRAIDO", label: "Leve e proximo" },
    ],
    step4Title: "Monte sua base de serviços",
    step4Subtitle: "Escolha como quer cadastrar planos, aulas e avaliações.",
    shifts: [
      {
        id: "principal",
        emoji: "sunny",
        label: "Atendimento principal",
        defaultOpen: "06:00",
        defaultClose: "22:00",
        defaultDays: ["seg", "ter", "qua", "qui", "sex"],
        defaultEnabled: true,
      },
      {
        id: "opcional",
        emoji: "sun_behind_small_cloud",
        label: "Fim de semana",
        defaultOpen: "08:00",
        defaultClose: "14:00",
        defaultDays: ["sab"],
      },
    ],
    step4Label: "Servicos",
  },
};

const MODE_CONTENT: Record<
  SetupMode,
  {
    step1Title: string;
    step1Subtitle: string;
    options: OptionItem[];
    step2Title: string;
    channels: ChannelItem[];
    step3Title: string;
    step3Subtitle: string;
    shifts: ShiftItem[];
    step4Title: string;
    step4Subtitle: string;
    aiTitle: string;
    aiDesc: string;
    manualTitle: string;
    manualDesc: string;
    finishAiRoute: string;
    finishManualRoute: string;
    skipRoute: string;
  }
> = {
  delivery: {
    step1Title: "Apresente seu negocio e seu bot",
    step1Subtitle: "Essas informacoes aparecem nas mensagens do bot para seus clientes.",
    options: [],
    step2Title: "Como os seus produtos chegam ao cliente?",
    channels: [
      {
        id: "delivery",
        emoji: "motor_scooter",
        label: "Fazemos Delivery",
        desc: "Entregamos na casa do cliente",
      },
      {
        id: "retirada",
        emoji: "shopping_bags",
        label: "Retirada no balcao",
        desc: "Cliente vem buscar",
      },
    ],
    step3Title: "Horario de funcionamento",
    step3Subtitle:
      "Ative os turnos e defina os horarios de abertura e fechamento.",
    shifts: [
      { id: "almoco", emoji: "sunny", label: "Almoco", defaultOpen: "11:00", defaultClose: "15:00" },
      { id: "jantar", emoji: "crescent_moon", label: "Noite", defaultOpen: "18:00", defaultClose: "23:30" },
    ],
    step4Title: "Hora de montar o seu catalogo.",
    step4Subtitle: "Como voce prefere cadastrar seus itens na memoria da IA?",
    aiTitle: "Importacao inteligente de catalogo (IA)",
    aiDesc:
      "Envie foto ou PDF do seu cardapio e a IA estrutura itens, precos e categorias em segundos.",
    manualTitle: "Configuracao manual",
    manualDesc: "Quero cadastrar itens, categorias e precos manualmente.",
    finishAiRoute: "/dashboard/estoque?onboarding=ai",
    finishManualRoute: "/dashboard/estoque?onboarding=manual",
    skipRoute: "/dashboard",
  },
  agendamentos: {
    step1Title: "Quais servicos voce oferece?",
    step1Subtitle:
      "Vale para saloes, barbearias, nail design, odontologia e qualquer negocio por horario.",
    options: [
      { id: "corte_barba", emoji: "scissors", label: "Corte, barba e visagismo" },
      { id: "manicure", emoji: "nail_care", label: "Manicure e Nail Design" },
      { id: "estetica", emoji: "sparkles", label: "Estetica e bem-estar" },
      { id: "odontologia", emoji: "tooth", label: "Odontologia" },
      { id: "pacotes", emoji: "package", label: "Pacotes e assinaturas" },
      { id: "avaliacao", emoji: "clipboard", label: "Avaliacao e primeira visita" },
      { id: "outros", emoji: "briefcase", label: "Outros" },
    ],
    step2Title: "Como os atendimentos acontecem no dia a dia?",
    channels: [
      {
        id: "presencial",
        emoji: "office",
        label: "Atendimento presencial",
        desc: "Cliente vai ate o local",
      },
      {
        id: "online",
        emoji: "video_camera",
        label: "Atendimento online",
        desc: "Videochamada, consultoria ou suporte remoto",
      },
      {
        id: "domiciliar",
        emoji: "car",
        label: "Atendimento externo",
        desc: "Equipe se desloca ate o cliente",
      },
    ],
    step3Title: "Disponibilidade da agenda",
    step3Subtitle:
      "Defina turnos e horarios para a IA oferecer encaixes reais conforme sua operacao.",
    shifts: [
      { id: "manha", emoji: "sunny", label: "Manha", defaultOpen: "08:00", defaultClose: "12:00" },
      { id: "tarde", emoji: "sun_behind_small_cloud", label: "Tarde", defaultOpen: "13:00", defaultClose: "18:00" },
      { id: "noite", emoji: "crescent_moon", label: "Noite", defaultOpen: "18:00", defaultClose: "21:00" },
    ],
    step4Title: "Agora vamos configurar o Bot e Persona.",
    step4Subtitle:
      "Defina como quer iniciar a configuracao do bot para atendimento e agendamentos.",
    aiTitle: "Importar base de servicos (IA)",
    aiDesc:
      "Envie foto, PDF ou tabela e leve os dados organizados para o Bot e Persona em segundos.",
    manualTitle: "Ir direto para Bot e Persona",
    manualDesc:
      "Prefiro configurar manualmente nome, tom de voz, regras e contexto do bot.",
    finishAiRoute: "/configuracoes?onboarding=ai",
    finishManualRoute: "/configuracoes?onboarding=manual",
    skipRoute: "/dashboard",
  },
  empresa: {
    step1Title: "Quais frentes de atendimento a IA vai cobrir?",
    step1Subtitle: "Escolha os temas principais para comecarmos com a estrutura certa.",
    options: [
      { id: "faq", emoji: "clipboard", label: "FAQ e duvidas frequentes" },
      { id: "suporte", emoji: "briefcase", label: "Suporte ao cliente" },
      { id: "comercial", emoji: "package", label: "Comercial e pre-venda" },
      { id: "financeiro", emoji: "repeat", label: "Financeiro e cobranca" },
      { id: "operacoes", emoji: "office", label: "Operacoes internas" },
      { id: "rh", emoji: "house", label: "RH e atendimento interno" },
    ],
    step2Title: "Quais canais precisam entrar nesse fluxo?",
    channels: [
      {
        id: "whatsapp",
        emoji: "message_circle",
        label: "WhatsApp",
        desc: "Atendimento principal pelo canal oficial da empresa",
      },
      {
        id: "site",
        emoji: "office",
        label: "Site e landing pages",
        desc: "Captacao e triagem de solicitacoes do formulario",
      },
      {
        id: "instagram",
        emoji: "briefcase",
        label: "Instagram e redes sociais",
        desc: "Mensagens rapidas, duvidas e encaminhamentos",
      },
    ],
    step3Title: "Janela de atendimento da operacao",
    step3Subtitle:
      "Defina os horarios em que a IA deve priorizar respostas, repasses e expectativas de retorno.",
    shifts: [
      { id: "manha", emoji: "sunny", label: "Manha", defaultOpen: "08:00", defaultClose: "12:00" },
      { id: "tarde", emoji: "sun_behind_small_cloud", label: "Tarde", defaultOpen: "13:00", defaultClose: "18:00" },
      { id: "plantao", emoji: "crescent_moon", label: "Plantao", defaultOpen: "18:00", defaultClose: "22:00" },
    ],
    step4Title: "Agora vamos montar a base operacional da IA.",
    step4Subtitle:
      "Escolha se prefere importar documentos e FAQs com IA ou comecar direto pela configuracao manual.",
    aiTitle: "Importar documentos e base de conhecimento (IA)",
    aiDesc:
      "Envie PDFs, politicas e FAQs para estruturar respostas, fluxos e contexto da operacao em poucos minutos.",
    manualTitle: "Ir direto para Bot e Persona",
    manualDesc:
      "Prefiro configurar manualmente regras, tom de voz, contexto e mensagens-chave do atendimento.",
    finishAiRoute: "/configuracoes?onboarding=ai",
    finishManualRoute: "/configuracoes?onboarding=manual",
    skipRoute: "/dashboard",
  },
};

function toEmoji(name: string) {
  const map: Record<string, string> = {
    pizza: "🍕",
    burger: "🍔",
    tropical_drink: "🥣",
    croissant: "🥟",
    sushi: "🍱",
    cup_with_straw: "🥤",
    motor_scooter: "🛵",
    shopping_bags: "🛍️",
    sunny: "☀️",
    crescent_moon: "🌙",
    sun_behind_small_cloud: "🌤️",
    scissors: "✂️",
    nail_care: "💅",
    sparkles: "✨",
    tooth: "🦷",
    briefcase: "💼",
    clipboard: "📋",
    message_circle: "💬",
    stethoscope: "🩺",
    repeat: "🔁",
    syringe: "💉",
    package: "📦",
    house: "🏠",
    office: "🏢",
    video_camera: "📹",
    car: "🚗",
  };
  return map[name] ?? "✨";
}

function buildDefaultSchedule(
  shifts: ShiftItem[],
  mode: SetupMode,
  subNicho?: SubNicho,
): ScheduleState {
  const base: ScheduleState = {};

  for (const shift of shifts) {
    base[shift.id] = {
      enabled: !!shift.defaultEnabled,
      openTime: shift.defaultOpen,
      closeTime: shift.defaultClose,
      days: shift.defaultDays ?? ["seg", "ter", "qua", "qui", "sex"],
    };
  }

  return base;
}

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-white/5">
      <div
        className="h-full bg-gradient-to-r from-brand to-accent transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StepBadge({ step }: { step: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      Passo {step} de {TOTAL_STEPS}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? "bg-brand" : "bg-white/10"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-white/5 px-3 py-2.5 text-sm font-mono text-foreground outline-none transition-colors focus:border-brand/60 focus:bg-white/[0.07] [color-scheme:dark]"
      />
    </div>
  );
}

export function SetupWizard({
  mode,
  dashboardRoute,
  subNicho,
  tenantId,
  initialBusinessName,
  initialBotName,
  initialTone,
}: {
  mode: SetupMode;
  dashboardRoute?: string;
  subNicho?: SubNicho;
  tenantId?: string;
  initialBusinessName?: string;
  initialBotName?: string;
  initialTone?: DeliveryTone;
}) {
  const router = useRouter();
  const content = MODE_CONTENT[mode];
  const deliverySubNicho: SubNicho = subNicho ?? "adega";
  const deliveryProfile = mode === "delivery" ? DELIVERY_PROFILES[deliverySubNicho] : null;
  const deliveryShifts = useMemo(
    () => (mode === "delivery" ? DELIVERY_PROFILES[deliverySubNicho].shifts : content.shifts),
    [content.shifts, deliverySubNicho, mode],
  );

  const [step, setStep] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [schedule, setSchedule] = useState<ScheduleState>(() =>
    buildDefaultSchedule(deliveryShifts, mode, subNicho),
  );

  const [deliveryBusinessName, setDeliveryBusinessName] = useState(initialBusinessName ?? "");
  const [deliveryBotName, setDeliveryBotName] = useState(initialBotName ?? "");
  const [deliveryTone, setDeliveryTone] = useState<DeliveryTone>(initialTone ?? "DESCONTRAIDO");
  const [selectedSetupMethod, setSelectedSetupMethod] = useState<"ai" | "manual" | "sample" | "later">("ai");
  const [savingStep1, setSavingStep1] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSchedule(buildDefaultSchedule(deliveryShifts, mode, subNicho));
  }, [deliveryShifts, mode, subNicho]);

  useEffect(() => {
    if (mode !== "delivery" || !deliveryProfile) return;

    if (!deliveryBusinessName) {
      setDeliveryBusinessName(deliveryProfile.companyPlaceholder);
    }
    if (!deliveryBotName) {
      setDeliveryBotName(deliveryProfile.botPreviewFallback);
    }
    if (!initialTone) {
      setDeliveryTone(deliveryProfile.recommendedTone);
    }
  }, [deliveryBotName, deliveryBusinessName, deliveryProfile, initialTone, mode]);

  function updateShift(id: string, patch: Partial<ShiftConfig>) {
    setSchedule((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function toggleOption(id: string) {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleChannel(id: string) {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function canContinue() {
    if (step === 1 && mode === "delivery") {
      return (
        deliveryBusinessName.trim().length >= 2 &&
        deliveryBotName.trim().length >= 2 &&
        !!deliveryTone
      );
    }
    if (step === 1) return selectedOptions.size > 0;
    if (step === 2) return selectedChannels.size > 0;
    if (step === 3) {
      return Object.values(schedule).some((s) => s.enabled && s.days.length > 0);
    }
    return true;
  }

  async function handleContinue() {
    if (step === 1 && mode === "delivery") {
      setSavingStep1(true);
      try {
        await saveDeliveryIdentity({
          businessName: deliveryBusinessName,
          botName: deliveryBotName,
          toneOfVoice: deliveryTone,
        });
      } catch (error) {
        console.error("[setup] Falha ao salvar identidade", error);
      } finally {
        setSavingStep1(false);
      }
    }

    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }

  async function clearOnboardingFlag() {
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { onboardingPending: false } });
    } catch (error) {
      console.error("[setup] Falha ao atualizar metadata de onboarding", error);
    }
  }

  async function handleFinish(method: "ai" | "manual" | "sample" | "later") {
    await clearOnboardingFlag();

    if (mode === "delivery") {
      // Produto focado 100% em academia: não há mais página de estoque/produtos.
      // Qualquer método de finalização leva direto pro dashboard.
      if (method === "sample" && tenantId) {
        await loadExampleProducts(tenantId, deliverySubNicho);
      }
      router.push(dashboardRoute ?? `/dashboard/${deliverySubNicho}`);
      return;
    }

    if (dashboardRoute) {
      router.push(dashboardRoute);
      return;
    }

    if (method === "ai") {
      router.push(content.finishAiRoute);
      return;
    }

    if (method === "manual") {
      router.push(content.finishManualRoute);
      return;
    }

    router.push(content.skipRoute);
  }

  const progressLabels =
    mode === "delivery"
      ? ["Identidade", "Entrega", "Horarios", deliveryProfile?.step4Label ?? "Catalogo"]
      : ["Perfil", "Fluxo", "Horarios", "Final"];

  const deliveryCatalogOptions: {
    id: "ai" | "manual" | "sample" | "later";
    title: string;
    desc: string;
    badge?: string;
    icon: "sparkles" | "table" | "store" | "clock";
  }[] =
    mode === "delivery"
      ? [
          {
            id: "ai",
            title: "Importar com IA",
            desc:
              deliverySubNicho === "adega"
                ? "Tire foto do seu cardapio fisico ou envie um PDF. A IA cadastra tudo automaticamente."
                : deliverySubNicho === "lanchonete"
                  ? "Foto do cardapio fisico ou PDF - a IA cadastra lanches, combos e precos automaticamente."
                  : deliverySubNicho === "pizzaria"
                    ? "Foto do seu cardapio - a IA cadastra sabores, tamanhos e precos automaticamente."
                    : "Envie sua tabela de planos, servicos e avaliacoes. A IA estrutura tudo para voce.",
            badge: "Recomendado",
            icon: "sparkles",
          },
          {
            id: "manual",
            title: "Cadastrar manualmente",
            desc:
              deliverySubNicho === "adega"
                ? "Adicione seus produtos, categorias (Cervejas, Destilados, Narguile) e precos um a um."
                : deliverySubNicho === "lanchonete"
                  ? "Adicione lanches, combos e bebidas com precos. Rapido e simples."
                  : deliverySubNicho === "pizzaria"
                    ? "Adicione cada sabor com precos por tamanho (P/M/G/GG) e opcoes de borda."
                    : "Cadastre planos, aulas e servicos de forma manual e organizada.",
            icon: "table",
          },
          {
            id: "sample",
            title: "Usar exemplo pre-configurado",
            desc:
              deliverySubNicho === "adega"
                ? "Comecar com Heineken, Smirnoff, Red Bull e outros produtos tipicos de adega. Edite depois."
                : deliverySubNicho === "lanchonete"
                  ? "X-Burguer, X-Bacon, Combo Especial e outros itens tipicos ja configurados. Edite depois."
                  : deliverySubNicho === "pizzaria"
                    ? "Calabresa, Frango c/ Catupiry, 4 Queijos e Portuguesa com tamanhos P/M/G/GG prontos."
                    : "Planos mensal/trimestral, avaliacao fisica e aula experimental ja configurados.",
            badge: "Mais rapido",
            icon: "store",
          },
          {
            id: "later",
            title: "Fazer depois",
            desc: "Pular por agora e configurar no dashboard quando quiser.",
            icon: "clock",
          },
        ]
      : [];

  function handleAIUpload() {
    setUploading(true);
    setTimeout(() => {
      void handleFinish("ai");
    }, 600);
  }

  function toggleDay(shiftId: string, day: Weekday) {
    const current = schedule[shiftId].days;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    updateShift(shiftId, { days: next });
  }

  function applyPreset(shiftId: string, days: Weekday[]) {
    updateShift(shiftId, { days: [...days] });
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <ProgressBar step={step} />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/8 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-accent/8 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="grid w-full grid-cols-4 gap-2 pr-6">
            {progressLabels.map((label, idx) => {
              const n = idx + 1;
              const active = n <= step;
              return (
                <div key={label} className="flex flex-col items-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      active ? "bg-brand" : "bg-white/20"
                    }`}
                  />
                  <span className="mt-2 text-[10px] uppercase tracking-[0.08em] text-muted">{label}</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void handleFinish("later")}
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Pular configuracao inicial
          </button>
        </div>

        {mode === "delivery" && (
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white/[0.02] p-1.5 lg:grid-cols-4">
            {(["adega", "lanchonete", "pizzaria", "academia"] as SubNicho[]).map((item) => {
              const active = item === deliverySubNicho;
              const icon = item === "adega" ? "🍺" : item === "lanchonete" ? "🥪" : item === "pizzaria" ? "🍕" : "🏋️";
              const label = DELIVERY_PROFILES[item].tabLabel;
              return (
                <div
                  key={item}
                  className={`rounded-xl border px-3 py-2 text-center text-sm font-semibold transition-colors ${
                    active
                      ? "border-brand/60 bg-brand/10 text-foreground"
                      : "border-line bg-white/[0.02] text-muted"
                  }`}
                >
                  {icon} {label}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-3xl border border-line bg-white/[0.035] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">
          {step === 1 && mode === "delivery" && deliveryProfile && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={1} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Vamos apresentar seu negocio
              </h2>
              <p className="mt-2 text-muted">Essas informacoes aparecem nas mensagens do bot para seus clientes.</p>

              <div className="mt-7 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">{deliveryProfile.companyLabel}</span>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={deliveryBusinessName}
                      onChange={(e) => setDeliveryBusinessName(e.target.value)}
                      placeholder={deliveryProfile.companyPlaceholder}
                      className="w-full rounded-xl border border-line bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-brand/50"
                    />
                  </div>
                  <p className="text-xs text-muted">Aparece no inicio de cada conversa</p>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Nome do atendente virtual</span>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={deliveryBotName}
                      onChange={(e) => setDeliveryBotName(e.target.value)}
                      placeholder={deliveryProfile.botPlaceholder}
                      className="w-full rounded-xl border border-line bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-brand/50"
                    />
                  </div>
                  <p className="text-xs text-muted">Como o bot se apresenta para o cliente</p>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Tom de voz</span>
                  <select
                    value={deliveryTone}
                    onChange={(e) => setDeliveryTone(e.target.value as DeliveryTone)}
                    className="w-full rounded-xl border border-line bg-white/[0.04] px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand/50"
                  >
                    {deliveryProfile.toneOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900 text-foreground">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted">Defina como o bot deve se comunicar com os clientes.</p>
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-semibold text-slate-900">
                    {(deliveryBotName.trim() || deliveryProfile.botPreviewFallback).charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {deliveryBotName.trim() || deliveryProfile.botPreviewFallback} - {deliveryBusinessName.trim() || deliveryProfile.companyPlaceholder}
                    </p>
                    <p className="text-xs text-muted">E assim que o bot vai se apresentar</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && mode !== "delivery" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={1} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {content.step1Title}
              </h2>
              <p className="mt-2 text-muted">{content.step1Subtitle}</p>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {content.options.map((item) => {
                  const active = selectedOptions.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleOption(item.id)}
                      className={`group flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200 ${
                        active
                          ? "border-brand bg-brand/10 shadow-lg shadow-brand/10"
                          : "border-line bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="text-4xl leading-none">{toEmoji(item.emoji)}</span>
                      <span
                        className={`text-sm font-medium leading-tight ${
                          active ? "text-brand" : "text-foreground/80"
                        }`}
                      >
                        {item.label}
                      </span>
                      {active && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                          <Check className="h-3 w-3 text-background" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={2} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {content.step2Title}
              </h2>

              <div className="mt-8 flex flex-col gap-4">
                {content.channels.map((channel) => {
                  const active = selectedChannels.has(channel.id);
                  return (
                    <div
                      key={channel.id}
                      className={`flex items-center justify-between rounded-2xl border p-5 transition-all duration-200 ${
                        active
                          ? "border-brand/40 bg-brand/[0.07]"
                          : "border-line bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{toEmoji(channel.emoji)}</span>
                        <div>
                          <p className="font-semibold text-foreground">{channel.label}</p>
                          <p className="text-sm text-muted">{channel.desc}</p>
                        </div>
                      </div>
                      <Toggle
                        checked={active}
                        onChange={() => toggleChannel(channel.id)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Dica de Catálogo WhatsApp Business */}
              <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-medium text-muted leading-relaxed">
                  💡 <span className="font-semibold">Dica:</span> você também pode exibir seu cardápio no WhatsApp Business
                  para seus clientes verem antes de pedir.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={3} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {content.step3Title}
              </h2>
              <p className="mt-2 text-muted">{content.step3Subtitle}</p>

              <div className="mt-8 flex flex-col gap-4">
                {deliveryShifts.map((shift) => {
                  const cfg = schedule[shift.id];
                  return (
                    <div
                      key={shift.id}
                      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                        cfg.enabled
                          ? "border-brand/40 bg-brand/[0.07]"
                          : "border-line bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl leading-none">{toEmoji(shift.emoji)}</span>
                          <div>
                            <p className={`font-semibold ${cfg.enabled ? "text-brand" : "text-foreground"}`}>
                              {shift.label}
                            </p>
                            <p className="text-sm text-muted">
                              {cfg.enabled
                                ? `${cfg.days.length} dia(s) • ${cfg.openTime} -> ${cfg.closeTime}`
                                : "Desativado"}
                            </p>
                          </div>
                        </div>
                        <Toggle
                          checked={cfg.enabled}
                          onChange={(v) => updateShift(shift.id, { enabled: v })}
                        />
                      </div>

                      <div
                        className={`grid transition-all duration-300 ${
                          cfg.enabled ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-white/5 px-5 pb-5 pt-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
                              Dias da semana
                            </p>

                            <div className="flex flex-wrap gap-2">
                              {WEEKDAYS.map((day) => {
                                const selected = cfg.days.includes(day.id);
                                return (
                                  <button
                                    key={`${shift.id}-${day.id}`}
                                    type="button"
                                    onClick={() => toggleDay(shift.id, day.id)}
                                    aria-label={day.label}
                                    title={day.label}
                                    className={`h-9 w-9 rounded-full border text-sm font-semibold transition-all ${
                                      selected
                                        ? "border-brand/50 bg-brand/20 text-brand"
                                        : "border-line bg-white/[0.03] text-muted hover:border-white/20 hover:text-foreground"
                                    }`}
                                  >
                                    {day.short}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {WEEKDAY_PRESETS.map((preset) => (
                                <button
                                  key={`${shift.id}-${preset.id}`}
                                  type="button"
                                  onClick={() => applyPreset(shift.id, preset.days)}
                                  className="rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted transition-all hover:border-white/20 hover:bg-white/[0.07] hover:text-foreground"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>

                            <div className="mt-4 flex gap-3">
                              <TimeInput
                                label="Abertura"
                                value={cfg.openTime}
                                onChange={(v) => updateShift(shift.id, { openTime: v })}
                              />
                              <div className="flex items-end pb-2.5 text-muted">
                                <span className="text-sm">{"->"}</span>
                              </div>
                              <TimeInput
                                label="Fechamento"
                                value={cfg.closeTime}
                                onChange={(v) => updateShift(shift.id, { closeTime: v })}
                              />
                            </div>

                            {cfg.days.length === 0 && (
                              <p className="mt-3 text-xs text-amber-300/90">
                                Selecione pelo menos um dia para este turno.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && mode === "delivery" && deliveryProfile && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={4} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {deliveryProfile.step4Title}
              </h2>
              <p className="mt-2 text-muted">{deliveryProfile.step4Subtitle}</p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {deliveryCatalogOptions.map((option) => {
                  const selected = selectedSetupMethod === option.id;
                  const icon =
                    option.icon === "sparkles" ? (
                      <Sparkles className="h-4 w-4 text-brand" />
                    ) : option.icon === "table" ? (
                      <Table2 className="h-4 w-4 text-muted" />
                    ) : option.icon === "store" ? (
                      <Store className="h-4 w-4 text-muted" />
                    ) : (
                      <Clock3 className="h-4 w-4 text-muted" />
                    );

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedSetupMethod(option.id)}
                      className={`flex flex-col rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-2 border-brand bg-brand/[0.12]"
                          : "border-line bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5">
                        {icon}
                      </span>
                      <p className="text-lg font-semibold text-foreground">{option.title}</p>
                      <p className="mt-1 text-sm text-muted">{option.desc}</p>
                      {option.badge && <span className="mt-3 text-xs font-semibold text-brand">{option.badge}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleFinish(selectedSetupMethod)}
                  className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-background transition hover:bg-brand-strong"
                >
                  Ir para o dashboard
                </button>
              </div>
            </div>
          )}

          {step === 4 && mode !== "delivery" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={4} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {content.step4Title}
              </h2>
              <p className="mt-2 text-muted">{content.step4Subtitle}</p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleAIUpload}
              />

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="relative flex flex-col overflow-hidden rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/[0.12] via-brand/[0.06] to-transparent p-6 ring-1 ring-brand/20 shadow-xl shadow-brand/10">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/20 blur-3xl" />

                  <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/30 bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
                    <Sparkles className="h-3 w-3" />
                    Recomendado
                  </span>

                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/20">
                    <Sparkles className="h-6 w-6 text-brand" />
                  </div>

                  <h3 className="text-lg font-bold text-foreground">{content.aiTitle}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {content.aiDesc}
                  </p>

                  <div className="mt-4 rounded-xl border border-brand/20 bg-brand/[0.08] px-4 py-3">
                    <p className="text-sm font-bold text-brand">Incluso no seu plano</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Sem taxa adicional nesta etapa de configuracao.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-background transition-all hover:bg-brand-strong disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Enviar arquivo e abrir Bot e Persona
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col rounded-2xl border border-line bg-white/[0.03] p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                    <Table2 className="h-6 w-6 text-muted" />
                  </div>

                  <h3 className="text-lg font-bold text-foreground">{content.manualTitle}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {content.manualDesc}
                  </p>

                  <div className="mt-4 rounded-xl border border-line/50 bg-transparent px-4 py-3 opacity-0 select-none">
                    <p className="text-sm">-</p>
                    <p className="mt-0.5 text-xs">-</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleFinish("manual")}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-3 text-sm font-medium text-muted transition-all hover:border-white/20 hover:bg-white/10 hover:text-foreground"
                  >
                    <Table2 className="h-4 w-4" />
                    Abrir Bot e Persona
                  </button>
                </div>
              </div>
            </div>
          )}

          {step < TOTAL_STEPS && (
            <div className="mt-8 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="text-sm text-muted transition-colors hover:text-foreground"
                >
                  {"<- Voltar"}
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                disabled={!canContinue()}
                onClick={() => void handleContinue()}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingStep1 ? "Salvando..." : "Continuar"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
