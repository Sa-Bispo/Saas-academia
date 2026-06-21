"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Banknote,
  Bot,
  Building2,
  CalendarDays,
  Clock,
  CreditCard,
  Dumbbell,
  Loader2,
  MapPin,
  MessageSquare,
  Save,
  ShieldAlert,
  ShoppingBag,
  Smartphone,
  Store,
  Timer,
} from "lucide-react";

import { updateTenantConfig, type TenantConfigDTO } from "@/actions/config.actions";

// ── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  botName: z.string().trim().max(80).optional().or(z.literal("")),
  companyName: z.string().trim().max(120).optional().or(z.literal("")),
  toneOfVoice: z.enum(["DESCONTRAIDO", "FORMAL", "VENDEDOR"]).optional().or(z.literal("")),
  operationContext: z.string().trim().max(3000).optional().or(z.literal("")),
  strictRules: z.string().trim().max(2000).optional().or(z.literal("")),
  whatsappAdmin: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,20}$/, "Número inválido.")
    .optional()
    .or(z.literal("")),
  // Academia
  pixChave: z.string().trim().max(200).optional().or(z.literal("")),
  diasAntecedenciaCobranca: z.coerce.number().int().min(1).max(30).optional(),
  limiteDiarioCobrancas: z.coerce.number().int().min(1).max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;
type ToastState = { type: "success" | "error"; message: string } | null;

// ── Opções ────────────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  {
    value: "DESCONTRAIDO",
    label: "😄 Descontraído",
    desc: "Informal e próximo, com emojis.",
  },
  {
    value: "FORMAL",
    label: "👔 Formal",
    desc: "Linguagem culta, sem abreviações.",
  },
  {
    value: "VENDEDOR",
    label: "🚀 Vendedor",
    desc: "Persuasivo, focado em fechar.",
  },
];

const TONE_LABELS: Record<string, string> = {
  DESCONTRAIDO: "amigável, descontraído e próximo do cliente, usando linguagem informal e emojis com moderação",
  FORMAL: "profissional e formal, usando linguagem culta e sem abreviações",
  VENDEDOR: "persuasivo e focado em vendas, sempre buscando oportunidades para fechar o pedido",
};

// ── Operação: campos estruturados ────────────────────────────────────────────

const PAYMENT_METHODS = [
  { id: "PIX", label: "PIX" },
  { id: "Dinheiro", label: "Dinheiro" },
  { id: "Cartão Débito", label: "Débito" },
  { id: "Cartão Crédito", label: "Crédito" },
];

const SERVICE_MODALITIES = [
  { id: "Presencial", label: "Presencial" },
  { id: "Online", label: "Online" },
  { id: "Domiciliar", label: "Domiciliar" },
  { id: "Híbrido", label: "Híbrido" },
];

const ACADEMIA_MODALITIES = [
  { id: "Musculação", label: "Musculação" },
  { id: "Crossfit", label: "Crossfit" },
  { id: "Funcional", label: "Funcional" },
  { id: "Yoga", label: "Yoga" },
  { id: "Pilates", label: "Pilates" },
  { id: "Luta/MMA", label: "Luta/MMA" },
  { id: "Spinning", label: "Spinning" },
  { id: "Natação", label: "Natação" },
];

type OperationDetails = {
  businessHours: string;
  deliveryArea: string;
  paymentMethods: string[];
  deliveryTime: string;
  minimumOrder: string;
  modalities: string[];
  averageDuration: string;
  cancellationPolicy: string;
};

function parseOperationContext(text: string, isSchedulingNiche: boolean, isAcademia: boolean = false): OperationDetails {
  const base: OperationDetails = {
    businessHours: "",
    deliveryArea: "",
    paymentMethods: [],
    deliveryTime: "",
    minimumOrder: "",
    modalities: [],
    averageDuration: "",
    cancellationPolicy: "",
  };
  if (!text) return base;
  const h = text.match(/Hor[aá]rio(?: de (?:atendimento|funcionamento))?[:\s]+([^\n]+)/i);
  const a = text.match(/(?:[AÁ]rea de entrega|Local de atendimento|Endere[çc]o)[:\s]+([^\n]+)/i);
  const t = text.match(/Tempo de entrega[:\s]+([^\n]+)/i);
  const m = text.match(/(?:Pedido m[ií]nimo|Ticket m[ií]nimo)[:\s]+([^\n]+)/i);
  const p = text.match(/Formas de pagamento[:\s]+([^\n]+)/i);
  const md = text.match(/Modalidades[:\s]+([^\n]+)/i);
  const avg = text.match(/Dura[cç][aã]o m[eé]dia[:\s]+([^\n]+)/i);
  const cancel = text.match(/Pol[ií]tica de cancelamento[:\s]+([^\n]+)/i);
  if (h) base.businessHours = h[1].trim();
  if (a) base.deliveryArea = a[1].trim();
  if (t) base.deliveryTime = t[1].trim();
  if (m) base.minimumOrder = m[1].trim();
  if (avg) base.averageDuration = avg[1].trim();
  if (cancel) base.cancellationPolicy = cancel[1].trim();
  if (md) {
    const raw = md[1].split(",").map((s) => s.trim()).filter(Boolean);
    base.modalities = raw;
  }
  if (p) {
    const s = p[1].toLowerCase();
    const methods: string[] = [];
    if (s.includes("pix")) methods.push("PIX");
    if (s.includes("dinheiro")) methods.push("Dinheiro");
    if (s.includes("d\u00e9bito") || s.includes("debito")) methods.push("Cart\u00e3o D\u00e9bito");
    if (s.includes("cr\u00e9dito") || s.includes("credito")) methods.push("Cart\u00e3o Cr\u00e9dito");
    base.paymentMethods = methods;
  }

  if (isSchedulingNiche && !isAcademia && base.modalities.length === 0) {
    base.modalities = ["Presencial"];
  }

  return base;
}

function compileOperationContext(d: OperationDetails, isSchedulingNiche: boolean, isAcademia: boolean = false): string {
  const parts: string[] = [];
  if (isAcademia) {
    if (d.businessHours.trim()) parts.push(`Horário de funcionamento: ${d.businessHours.trim()}`);
    if (d.deliveryArea.trim()) parts.push(`Endereço: ${d.deliveryArea.trim()}`);
    if (d.modalities.length > 0) parts.push(`Modalidades: ${d.modalities.join(", ")}`);
    if (d.paymentMethods.length > 0) parts.push(`Formas de pagamento: ${d.paymentMethods.join(", ")}`);
  } else if (isSchedulingNiche) {
    if (d.businessHours.trim()) parts.push(`Horário de atendimento: ${d.businessHours.trim()}`);
    if (d.deliveryArea.trim()) parts.push(`Local de atendimento: ${d.deliveryArea.trim()}`);
    if (d.modalities.length > 0) parts.push(`Modalidades: ${d.modalities.join(", ")}`);
    if (d.averageDuration.trim()) parts.push(`Duração média: ${d.averageDuration.trim()}`);
    if (d.cancellationPolicy.trim()) parts.push(`Política de cancelamento: ${d.cancellationPolicy.trim()}`);
    if (d.paymentMethods.length > 0) parts.push(`Formas de pagamento: ${d.paymentMethods.join(", ")}`);
  } else {
    if (d.businessHours.trim()) parts.push(`Horário: ${d.businessHours.trim()}`);
    if (d.deliveryArea.trim()) parts.push(`Área de entrega: ${d.deliveryArea.trim()}`);
    if (d.paymentMethods.length > 0) parts.push(`Formas de pagamento: ${d.paymentMethods.join(", ")}`);
    if (d.deliveryTime.trim()) parts.push(`Tempo de entrega: ${d.deliveryTime.trim()}`);
    if (d.minimumOrder.trim()) parts.push(`Pedido mínimo: ${d.minimumOrder.trim()}`);
  }
  return parts.join("\n");
}

// ── Componente auxiliar ───────────────────────────────────────────────────────

function SectionCard({
  icon,
  label,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white/4 p-6 backdrop-blur space-y-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent">{icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/80">{label}</p>
          <h2 className="mt-0.5 text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-foreground/90 mb-1.5">{children}</label>;
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-line bg-white/4 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
    />
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full resize-y rounded-xl border border-line bg-white/4 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
    />
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ConfiguracoesPageClient({ tenant }: { tenant: TenantConfigDTO }) {
  const isSchedulingNiche = tenant.niche === "CLINICA";
  const isAcademia = tenant.subNicho === "academia";
  const [toast, setToast] = useState<ToastState>(null);
  const [operationDetails, setOperationDetails] = useState<OperationDetails>(
    () => parseOperationContext(tenant.operationContext ?? "", isSchedulingNiche, isAcademia)
  );

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      botName: tenant.botName ?? "",
      companyName: tenant.companyName ?? "",
      toneOfVoice: (tenant.toneOfVoice as FormData["toneOfVoice"]) ?? "DESCONTRAIDO",
      strictRules: tenant.strictRules ?? "",
      whatsappAdmin: tenant.whatsappAdmin ?? "",
      pixChave: tenant.pixChave ?? "",
      diasAntecedenciaCobranca: tenant.diasAntecedenciaCobranca,
      limiteDiarioCobrancas: tenant.limiteDiarioCobrancas,
    },
  });

  const watched = useWatch({ control });

  const previewPrompt = useMemo(() => {
    const name = watched.botName?.trim() || "Assistente";
    const company = watched.companyName?.trim() || (isAcademia ? "nossa academia" : "nossa empresa");
    const tone = TONE_LABELS[watched.toneOfVoice || ""] || "amigável e prestativo";

    let objective: string;
    if (isAcademia) {
      objective = "atender alunos e interessados, responder dúvidas sobre modalidades, horários, planos e pagamentos";
    } else if (isSchedulingNiche) {
      objective = "captar o interesse do cliente e agendar horários, confirmações e remarcações";
    } else {
      objective = "conduzir o cliente até o fechamento do pedido, coletando os dados necessários para entrega";
    }

    let text = `Você é ${name}, atendente virtual da ${company}.\nTom de voz: ${tone}.\n\nOBJETIVO: ${objective}.`;

    const compiledContext = compileOperationContext(operationDetails, isSchedulingNiche, isAcademia);
    if (compiledContext.trim()) {
      text += `\n\n--- ${isAcademia ? "INFORMAÇÕES DA ACADEMIA" : "INFORMAÇÕES DA OPERAÇÃO"} ---\n${compiledContext}`;
    }

    if (watched.strictRules?.trim()) {
      text += `\n\n--- REGRAS ABSOLUTAS (nunca quebre) ---\n${watched.strictRules.trim()}`;
    }

    return text;
  }, [watched, operationDetails, isSchedulingNiche, isAcademia]);

  async function onSubmit(data: FormData) {
    setToast(null);
    try {
      const compiledContext = compileOperationContext(operationDetails, isSchedulingNiche, isAcademia);
      const result = await updateTenantConfig({
        ...data,
        operationContext: compiledContext,
        botObjective: isSchedulingNiche ? "AGENDAR" : "FECHAR_PEDIDO",
      });
      setToast({ type: "success", message: result.message });
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao salvar.",
      });
    }
  }


  return (
    <section className="space-y-6 max-w-3xl">
      {/* Cabeçalho */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
          Configuração do Bot
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Construtor de Agente</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {isSchedulingNiche
            ? "Configure a personalidade e os parâmetros do seu agente de agendamentos."
            : "Configure a personalidade e as informações do seu atendente virtual."}
          O prompt é gerado automaticamente a partir das seções abaixo.
        </p>
      </div>

      {toast && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          toast.type === "success"
            ? "border-brand/30 bg-brand/10 text-brand"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── 1. IDENTIDADE ── */}
        <SectionCard
          icon={<Bot size={18} />}
          label="Seção 1"
          title="Identidade do Assistente"
          subtitle="Como o bot se apresenta para os seus clientes."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel><Bot size={13} className="inline mr-1.5 opacity-60" />Nome do Assistente</FieldLabel>
              <Input {...register("botName")} placeholder="Ex: Zé, Júlia, PyraBot" />
              {errors.botName && <p className="mt-1 text-xs text-red-400">{errors.botName.message}</p>}
            </div>
            <div>
              <FieldLabel><Building2 size={13} className="inline mr-1.5 opacity-60" />Nome do Estabelecimento</FieldLabel>
              <Input
                {...register("companyName")}
                placeholder={
                  isAcademia
                    ? "Ex: Smart Fit Centro, Academia Power"
                    : isSchedulingNiche
                    ? "Ex: Studio Bella, Barbearia Prime"
                    : "Ex: Pizzaria do Zé"
                }
              />
              {errors.companyName && <p className="mt-1 text-xs text-red-400">{errors.companyName.message}</p>}
            </div>
          </div>

          <div>
            <FieldLabel><MessageSquare size={13} className="inline mr-1.5 opacity-60" />Tom de Voz</FieldLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TONE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="relative flex cursor-pointer flex-col gap-0.5 rounded-xl border border-line bg-white/4 px-4 py-3 transition hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-accent/10"
                >
                  <input type="radio" value={opt.value} {...register("toneOfVoice")} className="sr-only" />
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="text-xs text-muted">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── 2. OPERAÇÃO ── */}
        <SectionCard
          icon={<Store size={18} />}
          label="Seção 2"
          title={isAcademia ? "Detalhes da Academia" : "Detalhes da Operação"}
          subtitle={
            isAcademia
              ? "O bot usa essas informações para responder dúvidas dos alunos com precisão."
              : isSchedulingNiche
              ? "Parâmetros de agenda para o bot responder com disponibilidade e regras corretas."
              : "Preencha os campos abaixo — o bot usa essas informações para responder clientes com precisão."
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>
                <Clock size={13} className="inline mr-1.5 opacity-60" />
                Horário de funcionamento
              </FieldLabel>
              <Input
                value={operationDetails.businessHours}
                onChange={(e) => setOperationDetails((p) => ({ ...p, businessHours: e.target.value }))}
                placeholder={
                  isAcademia
                    ? "Ex: Seg-Sex 6h-22h, Sab 8h-18h, Dom 8h-13h"
                    : isSchedulingNiche
                    ? "Ex: Seg-Sex 09h-19h, Sab 09h-14h"
                    : "Ex: Seg-Sex 18h-23h, Sab-Dom 17h-00h"
                }
              />
            </div>
            <div>
              <FieldLabel>
                <MapPin size={13} className="inline mr-1.5 opacity-60" />
                {isAcademia ? "Endereço da academia" : isSchedulingNiche ? "Local de atendimento" : "Área de entrega"}
              </FieldLabel>
              <Input
                value={operationDetails.deliveryArea}
                onChange={(e) => setOperationDetails((p) => ({ ...p, deliveryArea: e.target.value }))}
                placeholder={
                  isAcademia
                    ? "Ex: Rua das Flores, 123 — Centro"
                    : isSchedulingNiche
                    ? "Ex: Rua X, 123 ou Online"
                    : "Ex: Centro, Boa Vista, Jardim America"
                }
              />
            </div>

            {!isAcademia && (
              <>
                <div>
                  <FieldLabel><Timer size={13} className="inline mr-1.5 opacity-60" />{isSchedulingNiche ? "Duração média por atendimento" : "Tempo de entrega"}</FieldLabel>
                  <Input
                    value={isSchedulingNiche ? operationDetails.averageDuration : operationDetails.deliveryTime}
                    onChange={(e) =>
                      setOperationDetails((p) =>
                        isSchedulingNiche
                          ? { ...p, averageDuration: e.target.value }
                          : { ...p, deliveryTime: e.target.value },
                      )
                    }
                    placeholder={isSchedulingNiche ? "Ex: 45 min" : "Ex: 40-60 minutos"}
                  />
                </div>
                <div>
                  <FieldLabel><ShoppingBag size={13} className="inline mr-1.5 opacity-60" />{isSchedulingNiche ? "Política de cancelamento" : "Pedido mínimo"}</FieldLabel>
                  <Input
                    value={isSchedulingNiche ? operationDetails.cancellationPolicy : operationDetails.minimumOrder}
                    onChange={(e) =>
                      setOperationDetails((p) =>
                        isSchedulingNiche
                          ? { ...p, cancellationPolicy: e.target.value }
                          : { ...p, minimumOrder: e.target.value },
                      )
                    }
                    placeholder={isSchedulingNiche ? "Ex: cancelar com 2h de antecedência" : "Ex: R$ 25,00"}
                  />
                </div>
              </>
            )}
          </div>

          {/* Modalidades — academia ou clínica */}
          {(isAcademia || isSchedulingNiche) && (
            <div>
              <FieldLabel>
                <Dumbbell size={13} className="inline mr-1.5 opacity-60" />
                {isAcademia ? "Modalidades oferecidas" : "Modalidades de atendimento"}
              </FieldLabel>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(isAcademia ? ACADEMIA_MODALITIES : SERVICE_MODALITIES).map((modality) => {
                  const checked = operationDetails.modalities.includes(modality.id);
                  return (
                    <button
                      key={modality.id}
                      type="button"
                      onClick={() =>
                        setOperationDetails((p) => ({
                          ...p,
                          modalities: checked
                            ? p.modalities.filter((m) => m !== modality.id)
                            : [...p.modalities, modality.id],
                        }))
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        checked
                          ? "border-accent/40 bg-accent/15 text-accent"
                          : "border-line bg-white/4 text-muted hover:border-accent/30 hover:text-foreground"
                      }`}
                    >
                      {checked && <span className="mr-1">✓</span>}
                      {modality.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <FieldLabel><Banknote size={13} className="inline mr-1.5 opacity-60" />Formas de pagamento aceitas</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {PAYMENT_METHODS.map((method) => {
                const checked = operationDetails.paymentMethods.includes(method.id);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() =>
                      setOperationDetails((p) => ({
                        ...p,
                        paymentMethods: checked
                          ? p.paymentMethods.filter((m) => m !== method.id)
                          : [...p.paymentMethods, method.id],
                      }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      checked
                        ? "border-accent/40 bg-accent/15 text-accent"
                        : "border-line bg-white/4 text-muted hover:border-accent/30 hover:text-foreground"
                    }`}
                  >
                    {checked && <span className="mr-1">✓</span>}
                    {method.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">Selecione todas que se aplicam.</p>
          </div>
        </SectionCard>

        {/* ── 3. REGRAS ── */}
        <SectionCard
          icon={<ShieldAlert size={18} />}
          label="Seção 3"
          title="Regras do Bot"
          subtitle="O que o assistente NUNCA deve fazer ou falar — limites e proibições."
        >
          <Textarea
            rows={4}
            {...register("strictRules")}
            placeholder={`Ex:\n- Nunca ofereça desconto acima de 10%\n- Não aceite pedidos fora do horário de funcionamento\n- Não comente sobre concorrentes\n- Se o cliente reclamar, peça desculpas e ofereça falar com o responsável`}
          />
        </SectionCard>

        {/* ── 4. NOTIFICAÇÕES ── */}
        <SectionCard
          icon={<Smartphone size={18} />}
          label="Seção 4"
          title="Notificações"
          subtitle={
            isSchedulingNiche
              ? "Número que receberá alertas de novos agendamentos via WhatsApp."
              : "Número que receberá alertas de novos pedidos via WhatsApp."
          }
        >
          <div>
            <FieldLabel>WhatsApp do responsável</FieldLabel>
            <Input
              {...register("whatsappAdmin")}
              placeholder="5511999999999  (com DDI, sem espaços)"
            />
            {errors.whatsappAdmin && (
              <p className="mt-1 text-xs text-red-400">{errors.whatsappAdmin.message}</p>
            )}
            <p className="mt-1.5 text-xs text-muted">
              Inclua o código do país. Ex: 55 (Brasil) + DDD + número.
            </p>
          </div>
        </SectionCard>

        {/* ── 5. ACADEMIA / COBRANÇAS ── */}
        {isAcademia && (
          <SectionCard
            icon={<Dumbbell size={18} />}
            label="Seção 5"
            title="Cobranças e PIX"
            subtitle="Configurações de cobrança automática para alunos da academia."
          >
            <div>
              <FieldLabel><CreditCard size={13} className="inline mr-1.5 opacity-60" />Chave PIX</FieldLabel>
              <Input
                {...register("pixChave")}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              />
              <p className="mt-1.5 text-xs text-muted">
                O bot envia essa chave automaticamente ao cobrar o aluno.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel><CalendarDays size={13} className="inline mr-1.5 opacity-60" />Dias de antecedência</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  {...register("diasAntecedenciaCobranca")}
                  placeholder="5"
                />
                <p className="mt-1.5 text-xs text-muted">
                  Quantos dias antes do vencimento o aluno é avisado.
                </p>
              </div>
              <div>
                <FieldLabel><Banknote size={13} className="inline mr-1.5 opacity-60" />Limite diário de cobranças</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  {...register("limiteDiarioCobrancas")}
                  placeholder="50"
                />
                <p className="mt-1.5 text-xs text-muted">
                  Máximo de mensagens de cobrança por dia (evita spam).
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Preview do prompt ── */}
        <details className="group rounded-2xl border border-dashed border-line bg-white/2">
          <summary className="cursor-pointer select-none px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted group-open:text-accent">
            Ver prompt gerado automaticamente
          </summary>
          <pre className="whitespace-pre-wrap px-5 pb-5 pt-2 text-xs leading-relaxed text-muted font-mono">
            {previewPrompt}
          </pre>
        </details>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-accent/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>
    </section>
  );
}
