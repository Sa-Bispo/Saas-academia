"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Beer, MessageCircle, Pizza, Sandwich, Send, Sparkles } from "lucide-react";

import { createShadowTenant } from "@/actions/tenant.actions";
import type { CreateShadowTenantInput } from "@/actions/tenant.actions";
import { Navbar } from "@/components/layout/navbar";

type Niche = "adega" | "lanchonete" | "pizzaria";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};

const toneOptions: { value: CreateShadowTenantInput["toneOfVoice"]; label: string }[] = [
  { value: "DESCONTRAIDO", label: "Descontraido e jovem" },
  { value: "FORMAL", label: "Formal e profissional" },
  { value: "VENDEDOR", label: "Animado e vendedor" },
];

const nicheConfig: Record<
  Niche,
  {
    label: string;
    shortDescription: string;
    companyPlaceholder: string;
    attendantPlaceholder: string;
    categories: string[];
    introMessage: (attendant: string, company: string) => string;
    quickSuggestions: string[];
    businessContext: string;
  }
> = {
  adega: {
    label: "Adega de bairro",
    shortDescription: "Bebidas, combos e narguile",
    companyPlaceholder: "Adega do Ze",
    attendantPlaceholder: "Ze",
    categories: ["Cervejas", "Destilados", "Energeticos", "Narguile", "Petiscos"],
    introMessage: (attendant, company) =>
      `Eee, tudo bem?! 😄 Sou o ${attendant} da ${company}! To aqui pra te ajudar a montar seu pedido. Bora? 🍺 Hoje temos cervejas, destilados, energeticos e tudo pra narguile. O que voce ta afim?`,
    quickSuggestions: ["Ver cardapio", "Tem combo hoje?", "Quero uma Heineken", "Qual o horario?"],
    businessContext:
      "Cervejas (Heineken 600ml R$12, Brahma 600ml R$11, Corona R$11), Destilados (Smirnoff 998ml R$49,90, Jack Daniel's 1L R$139,90), Energeticos (Red Bull 250ml R$9,90), Narguile (Essencia Duas Macas R$18, Carvao 1kg R$12), Petiscos (Amendoim R$6). Combo Fim de Semana: Smirnoff + 2x Red Bull + Gelo por R$72.",
  },
  lanchonete: {
    label: "Lanchonete",
    shortDescription: "Lanches, combos e sucos",
    companyPlaceholder: "Lanchonete da Mari",
    attendantPlaceholder: "Mari",
    categories: ["Lanches", "Combos", "Bebidas", "Sobremesas"],
    introMessage: (attendant, company) =>
      `Ola! Bem-vindo a ${company} 🥪 Sou ${attendant}, sua atendente virtual! Temos lanches fresquinhos, combos e sucos. O que vai ser hoje?`,
    quickSuggestions: ["Ver cardapio", "Quero um combo", "Qual o mais pedido?", "Faz entrega?"],
    businessContext:
      "Lanches (X-Burguer R$18, X-Bacon R$22, X-Tudo R$26), Combos (X-Burguer+fritas+suco R$28, X-Bacon+fritas+refri R$32), Bebidas (Suco natural R$8, Refri R$5).",
  },
  pizzaria: {
    label: "Pizzaria",
    shortDescription: "Pizzas, tamanhos e bordas",
    companyPlaceholder: "Pizzaria do Joao",
    attendantPlaceholder: "Joao",
    categories: ["Tradicionais", "Especiais", "Doces", "Bebidas"],
    introMessage: (attendant, company) =>
      `Oi! Aqui e ${attendant} da ${company} 🍕 Pra montar sua pizza e simples: me fala o sabor, o tamanho e se quer borda recheada. Vamos la?`,
    quickSuggestions: ["Ver cardapio", "Quero uma calabresa", "Tamanhos e precos", "Tem borda recheada?"],
    businessContext:
      "Tradicionais (Calabresa base R$35, Frango Catupiry R$38, Portuguesa R$38), Especiais (4 Queijos R$42, Frango Bacon R$44), Tamanhos: Pequena (+R$0), Media (+R$10), Grande (+R$20), GG (+R$35), Bordas: sem borda, catupiry (+R$8), cheddar (+R$8).",
  },
};

function isNiche(value: string | null): value is Niche {
  return value === "adega" || value === "lanchonete" || value === "pizzaria";
}

function TestDrivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedNiche, setSelectedNiche] = useState<Niche>("adega");
  const [companyName, setCompanyName] = useState("");
  const [botName, setBotName] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState<CreateShadowTenantInput["toneOfVoice"]>("DESCONTRAIDO");

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [userMessagesCount, setUserMessagesCount] = useState(0);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finishModalTimerRef = useRef<number | null>(null);

  const config = nicheConfig[selectedNiche];
  const resolvedCompany = companyName.trim() || config.companyPlaceholder;
  const resolvedAttendant = botName.trim() || config.attendantPlaceholder;
  const planosSlugByNiche: Record<Niche, string> = {
    adega: "delivery",
    lanchonete: "delivery",
    pizzaria: "delivery",
  };

  const showConvertBanner = userMessagesCount >= 3;
  const toneLabel = toneOptions.find((item) => item.value === toneOfVoice)?.label ?? "Descontraido e jovem";

  useEffect(() => {
    const nicheParam = searchParams.get("niche");
    if (isNiche(nicheParam)) {
      setSelectedNiche(nicheParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setMessages([]);
    setIsChatActive(false);
    setIsBotTyping(false);
    setUserMessagesCount(0);
    if (finishModalTimerRef.current) {
      window.clearTimeout(finishModalTimerRef.current);
      finishModalTimerRef.current = null;
    }
    setIsTestFinished(false);
    setShowFinishModal(false);
    setTenantId(null);
    setFormError(null);
  }, [selectedNiche]);

  useEffect(() => {
    return () => {
      if (finishModalTimerRef.current) {
        window.clearTimeout(finishModalTimerRef.current);
        finishModalTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  function handleNicheSelect(niche: Niche) {
    setSelectedNiche(niche);
    router.replace(`/test-drive?niche=${niche}`);
  }

  function appendMessage(role: "user" | "bot", text: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        text,
      },
    ]);
  }

  function shouldFinishTest(text: string) {
    const normalized = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      normalized.includes("resumo do pedido") ||
      normalized.includes("pedido confirmado") ||
      normalized.includes("pedido finalizado")
    );
  }

  function scheduleFinishModal() {
    if (finishModalTimerRef.current) {
      window.clearTimeout(finishModalTimerRef.current);
    }

    setIsTestFinished(true);
    finishModalTimerRef.current = window.setTimeout(() => {
      setShowFinishModal(true);
      finishModalTimerRef.current = null;
    }, 10000);
  }

  async function requestChatReply(message: string, tenant: string): Promise<string | null> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId: tenant, message }),
        });

        if (response.ok) {
          const data = (await response.json()) as { response?: string; reply?: string };
          const text = (data.response || data.reply || "").trim();
          return text || "Agora me diz mais detalhes pra eu continuar seu pedido.";
        }

        if (response.status < 500) {
          break;
        }
      } catch {
        // Tenta novamente em falhas transitórias de rede.
      }

      await new Promise((resolve) => window.setTimeout(resolve, 500 * attempt));
    }

    return null;
  }

  async function startConversation() {
    if (isStarting) return;

    setIsStarting(true);
    setFormError(null);

    const result = await createShadowTenant({
      companyName: resolvedCompany,
      botName: resolvedAttendant,
      toneOfVoice,
      botObjective: "FECHAR_PEDIDO",
      businessContext: config.businessContext,
      niche: selectedNiche,
    });

    if (!result.success) {
      setIsStarting(false);
      setFormError(result.error);
      return;
    }

    setTenantId(result.tenantId);
    setIsChatActive(true);
    setMessages([]);
    setUserMessagesCount(0);
    if (finishModalTimerRef.current) {
      window.clearTimeout(finishModalTimerRef.current);
      finishModalTimerRef.current = null;
    }
    setIsTestFinished(false);
    setShowFinishModal(false);
    setIsBotTyping(true);

    window.setTimeout(() => {
      appendMessage("bot", config.introMessage(resolvedAttendant, resolvedCompany));
      setIsBotTyping(false);
      setIsStarting(false);
    }, 1100);
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || !tenantId || isSending || isTestFinished) return;

    setMessageInput("");
    appendMessage("user", text);
    setUserMessagesCount((prev) => prev + 1);
    setIsSending(true);
    setIsBotTyping(true);

    try {
      const [botReply] = await Promise.all([
        requestChatReply(text, tenantId),
        new Promise((resolve) => window.setTimeout(resolve, 1200)),
      ]);

      if (!botReply) {
        appendMessage("bot", "Tive uma oscilacao momentanea aqui. Pode repetir sua mensagem rapidinho?");
      } else {
        appendMessage("bot", botReply);

        if (!isTestFinished && shouldFinishTest(botReply)) {
          scheduleFinishModal();
        }
      }
    } catch {
      appendMessage("bot", "Nao consegui responder agora, mas to online. Me chama de novo com o que voce quer pedir.");
    } finally {
      setIsBotTyping(false);
      setIsSending(false);
    }
  }

  const nicheCards = useMemo(
    () => [
      {
        key: "adega" as const,
        title: nicheConfig.adega.label,
        description: nicheConfig.adega.shortDescription,
        icon: Beer,
        selectedBorder: "border-emerald-400",
        selectedBg: "bg-emerald-500/10",
        selectedShadow: "shadow-[0_0_0_1px_rgba(52,211,153,0.4)]",
        iconColor: "text-emerald-400",
      },
      {
        key: "lanchonete" as const,
        title: nicheConfig.lanchonete.label,
        description: nicheConfig.lanchonete.shortDescription,
        icon: Sandwich,
        selectedBorder: "border-orange-400",
        selectedBg: "bg-orange-500/10",
        selectedShadow: "shadow-[0_0_0_1px_rgba(251,146,60,0.4)]",
        iconColor: "text-orange-400",
      },
      {
        key: "pizzaria" as const,
        title: nicheConfig.pizzaria.label,
        description: nicheConfig.pizzaria.shortDescription,
        icon: Pizza,
        selectedBorder: "border-red-400",
        selectedBg: "bg-red-500/10",
        selectedShadow: "shadow-[0_0_0_1px_rgba(248,113,113,0.4)]",
        iconColor: "text-red-400",
      },
    ],
    [],
  );

  return (
    <main className="relative min-h-screen overflow-x-clip bg-slate-950">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-4 pb-6 pt-28 sm:px-8 lg:px-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-sm text-brand backdrop-blur">
          <Sparkles size={14} />
          Test-drive gratuito · sem login · sem cartao
        </span>

        <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
          Escolha seu negocio e converse com a IA agora
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">
          Configure em segundos. O bot responde de verdade, com IA real.
        </p>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {nicheCards.map((card) => {
            const Icon = card.icon;
            const selected = selectedNiche === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => handleNicheSelect(card.key)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? `${card.selectedBorder} ${card.selectedBg} ${card.selectedShadow}`
                    : "border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]"
                }`}
              >
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${selected ? card.iconColor : "text-white"}`}>
                  <Icon size={18} />
                </div>
                <p className="text-base font-semibold text-white">{card.title}</p>
                <p className="mt-1 text-sm text-muted">{card.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:px-10">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(19,34,53,0.88),rgba(9,17,26,0.92))] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-muted">Configuracao rapida</p>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Nome da empresa</span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={config.companyPlaceholder}
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-brand/60 transition placeholder:text-muted focus:border-brand focus:ring-2"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Nome do atendente</span>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder={config.attendantPlaceholder}
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-brand/60 transition placeholder:text-muted focus:border-brand focus:ring-2"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Tom de voz</span>
              <select
                value={toneOfVoice}
                onChange={(e) =>
                  setToneOfVoice(e.target.value as CreateShadowTenantInput["toneOfVoice"])
                }
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-brand/60 transition focus:border-brand focus:ring-2"
              >
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-surface text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="pt-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">Escopo do bot</p>
              <div className="flex flex-wrap gap-2">
                {config.categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/55"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>

            {formError ? (
              <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {formError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void startConversation()}
              disabled={isStarting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-70"
            >
              {isStarting ? "Iniciando..." : "Iniciar conversa com a IA"}
              <ArrowRight size={16} />
            </button>

            <Link
              href="/login?force=1"
              className="inline-flex items-center gap-2 text-sm text-accent transition hover:text-white"
            >
              Ja tem conta? Entrar no dashboard
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b141a] shadow-[0_30px_60px_-35px_rgba(2,6,23,0.9)]">
            <header className="flex items-center justify-between border-b border-white/10 bg-[#075E54] px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-semibold">
                  {resolvedAttendant.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{resolvedAttendant}</p>
                  <p className="truncate text-xs text-white/75">{resolvedCompany}</p>
                </div>
              </div>
              <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">
                online
              </span>
            </header>

            <div className="relative flex h-[500px] flex-col bg-[#efeae2] px-3 py-4">
              {showConvertBanner ? (
                <div className="mb-3 shrink-0 rounded-xl border border-sky-300/35 bg-sky-100/80 px-3 py-2 text-xs text-sky-950">
                  Gostou? Seu bot pode estar no ar em 10 minutos.
                  <Link
                    href={`/cadastro?niche=${selectedNiche}`}
                    className="ml-1.5 font-semibold underline decoration-sky-500 underline-offset-2"
                  >
                    Criar minha conta gratis
                  </Link>
                </div>
              ) : null}

              {!isChatActive ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <MessageCircle size={40} className="text-[#075E54]" />
                  <p className="mt-4 max-w-sm text-sm font-semibold text-slate-900">
                    Configure seu negocio ao lado e clique em Iniciar conversa
                  </p>
                  <p className="mt-2 max-w-sm text-xs text-slate-600">
                    O bot vai responder de verdade, com IA real
                  </p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[84%] rounded-2xl px-3 py-2 text-sm leading-5 shadow-sm ${
                            message.role === "user"
                              ? "rounded-br-md bg-[#d9fdd3] text-slate-900"
                              : "rounded-bl-md bg-white text-slate-900"
                          }`}
                          dangerouslySetInnerHTML={{
                            __html: message.text
                              .replace(/&/g, "&amp;")
                              .replace(/</g, "&lt;")
                              .replace(/>/g, "&gt;")
                              .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
                              .replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                    ))}

                    {isBotTyping ? (
                      <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                          digitando...
                        </div>
                      </div>
                    ) : null}

                    <div ref={messagesEndRef} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 border-t border-black/10 pt-2">
                    {config.quickSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void sendMessage(suggestion)}
                        disabled={isSending || !tenantId || isTestFinished}
                        className="rounded-full border border-[#075E54]/20 bg-[#e7f3ef] px-3 py-1 text-xs text-[#075E54] transition hover:bg-[#d8ebe5] disabled:opacity-55"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-black/10 bg-[#f0f2f5] px-3 py-2">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage(messageInput);
                }}
              >
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={isTestFinished ? "Teste encerrado. Veja os planos para continuar." : "Escreva uma mensagem"}
                  disabled={!isChatActive || isSending || !tenantId || isTestFinished}
                  className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-emerald-400 transition focus:ring-2 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!isChatActive || isSending || !tenantId || isTestFinished}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#009a79] disabled:opacity-60"
                  aria-label="Enviar mensagem"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-muted">
            Mais de 2.000 negocios ja testaram · Sem cartao de credito · Cancele quando quiser
          </p>
        </div>
      </section>

      {showFinishModal ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-emerald-300/30 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Teste encerrado</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Seu pedido foi concluido no test-drive</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Curtiu o resultado? Ative agora para usar o bot com seu WhatsApp real e atendimento automatico.
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Link
                href={tenantId
                  ? `/planos/${planosSlugByNiche[selectedNiche]}?tenantId=${tenantId}&autoCheckout=1`
                  : "/cadastro"}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ir para pagamento
              </Link>
              <Link
                href={`/cadastro?niche=${selectedNiche}`}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Criar minha conta
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setShowFinishModal(false)}
              className="mt-3 w-full text-center text-xs text-slate-400 transition hover:text-slate-200"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function TestDrivePage() {
  return (
    <Suspense fallback={<main className="relative min-h-screen overflow-x-clip bg-slate-950" />}>
      <TestDrivePageContent />
    </Suspense>
  );
}
