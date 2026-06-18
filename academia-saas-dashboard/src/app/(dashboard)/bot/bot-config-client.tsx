"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  saveBotConfig,
  setBotConfigurado,
  type BotConfigData,
  type HorarioTurno,
} from "@/actions/bot.actions";

type Props = {
  tenantId: string;
  config: BotConfigData | null;
  jaConfigurado: boolean;
};

type Modo = "steps" | "edicao";
type SecaoId = "identidade" | "operacao" | "regras" | "notificacoes";
type TomVoz = BotConfigData["tom_voz"];

const DIAS = [
  { id: "DOM", label: "Dom" },
  { id: "SEG", label: "Seg" },
  { id: "TER", label: "Ter" },
  { id: "QUA", label: "Qua" },
  { id: "QUI", label: "Qui" },
  { id: "SEX", label: "Sex" },
  { id: "SAB", label: "Sáb" },
] as const;

const STEPS: Array<{ id: SecaoId; label: string; desc: string }> = [
  { id: "identidade", label: "Identidade", desc: "Nome e tom" },
  { id: "operacao", label: "Operação", desc: "Horários e entrega" },
  { id: "regras", label: "Regras", desc: "Limites do bot" },
  { id: "notificacoes", label: "Notificações", desc: "Alertas" },
];

const TOM_OPTIONS: Array<{ id: TomVoz; title: string; desc: string }> = [
  { id: "descontraido", title: "Descontraído", desc: "Leve, próximo e informal" },
  { id: "formal", title: "Formal", desc: "Profissional e objetivo" },
  { id: "vendedor", title: "Vendedor", desc: "Foco em conversão e upsell" },
];

const DEFAULT_REGRAS = [
  "Nunca ofereça desconto sem autorização",
  "Não aceite pedidos fora do horário",
  "Se o cliente reclamar, ofereça falar com o responsável",
];

const DEFAULT_CONFIG: BotConfigData = {
  nome_atendente: "",
  nome_negocio: "",
  tom_voz: "descontraido",
  horarios: [],
  area_entrega: "",
  pedido_minimo: 0,
  faz_delivery: true,
  faz_retirada: true,
  regras: DEFAULT_REGRAS,
  whatsapp_responsavel: "",
  notif_novos_pedidos: true,
  notif_estoque_baixo: true,
  notif_bot_desconectado: true,
  bot_configurado: false,
};

function mergeInitialConfig(config?: BotConfigData | null): BotConfigData {
  if (!config) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...config,
    regras: config.regras.length > 0 ? config.regras : DEFAULT_REGRAS,
  };
}

function gerarPreviewSaudacao(atendente: string, negocio: string, tom: TomVoz) {
  const nome = atendente || "Atendente";
  const loja = negocio || "nossa loja";
  if (tom === "descontraido") return `Eee, salve! Aqui é a ${loja}, pode pedir!`;
  if (tom === "formal") return `Olá! Bem-vindo ao ${loja}. Como posso ajudá-lo?`;
  if (tom === "vendedor") return `Oi! Aqui é ${nome} da ${loja}! Temos ótimas ofertas hoje!`;
  return `Olá! Sou ${nome} da ${loja}. O que posso fazer por você?`;
}

function parseCurrencyToNumber(raw: string): number {
  const normalized = raw.replace(/[^\d.,]/g, "").replace(".", "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function formatCurrencyInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
}

function ensureHorario(dia: string): HorarioTurno {
  return {
    dia_semana: dia as HorarioTurno["dia_semana"],
    abertura: "09:00",
    fechamento: "18:00",
    segundo_turno: null,
  };
}

export function BotConfigClient({ tenantId, config, jaConfigurado }: Props) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>(jaConfigurado ? "edicao" : "steps");
  const [stepAtual, setStepAtual] = useState(0);
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoId>("identidade");
  const [dados, setDados] = useState<BotConfigData>(mergeInitialConfig(config));
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewMsg = useMemo(
    () => gerarPreviewSaudacao(dados.nome_atendente, dados.nome_negocio, dados.tom_voz),
    [dados.nome_atendente, dados.nome_negocio, dados.tom_voz],
  );

  function updateDados(partial: Partial<BotConfigData>) {
    setDados((prev) => ({ ...prev, ...partial }));
  }

  function saveAll(onDone?: () => void) {
    setToast(null);
    startTransition(async () => {
      try {
        await saveBotConfig(tenantId, dados);
        setToast({ type: "success", message: "Configurações salvas com sucesso." });
        router.refresh();
        onDone?.();
      } catch (error) {
        setToast({
          type: "error",
          message: error instanceof Error ? error.message : "Erro ao salvar configurações.",
        });
      }
    });
  }

  function concluirConfiguracao() {
    const payload: BotConfigData = { ...dados, bot_configurado: true };
    setToast(null);

    startTransition(async () => {
      try {
        await saveBotConfig(tenantId, payload);
        await setBotConfigurado(tenantId, true);
        setDados(payload);
        setModo("edicao");
        setSecaoAtiva("identidade");
        setStepAtual(0);
        setToast({ type: "success", message: "Bot configurado com sucesso!" });
        router.refresh();
      } catch (error) {
        setToast({
          type: "error",
          message: error instanceof Error ? error.message : "Falha ao concluir configuração.",
        });
      }
    });
  }

  return (
    <section className="space-y-4">
      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {modo === "steps" ? (
        <BotConfigSteps
          dados={dados}
          updateDados={updateDados}
          stepAtual={stepAtual}
          setStepAtual={setStepAtual}
          onConcluir={concluirConfiguracao}
          onSaveStep={() => saveAll()}
          previewMsg={previewMsg}
          isPending={isPending}
        />
      ) : (
        <BotConfigEdicao
          dados={dados}
          updateDados={updateDados}
          secaoAtiva={secaoAtiva}
          setSecaoAtiva={setSecaoAtiva}
          onSalvar={() => saveAll()}
          onRefazer={() => {
            setModo("steps");
            setStepAtual(0);
          }}
          previewMsg={previewMsg}
          isPending={isPending}
        />
      )}
    </section>
  );
}

function BotConfigSteps({
  dados,
  updateDados,
  stepAtual,
  setStepAtual,
  onConcluir,
  onSaveStep,
  previewMsg,
  isPending,
}: {
  dados: BotConfigData;
  updateDados: (partial: Partial<BotConfigData>) => void;
  stepAtual: number;
  setStepAtual: React.Dispatch<React.SetStateAction<number>>;
  onConcluir: () => void;
  onSaveStep: () => void;
  previewMsg: string;
  isPending: boolean;
}) {
  const step = STEPS[stepAtual];

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      <div
        style={{
          display: "flex",
          padding: "16px 24px",
          background: "var(--bg-secondary)",
          borderBottom: "0.5px solid var(--border-color)",
          gap: 0,
          overflowX: "auto",
        }}
      >
        {STEPS.map((item, index) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: index < stepAtual ? "#1D9E75" : "var(--card-bg)",
                  border: index < stepAtual ? "none" : index === stepAtual ? "2px solid #1D9E75" : "0.5px solid var(--border-color)",
                  color: index < stepAtual ? "white" : index === stepAtual ? "#1D9E75" : "var(--text-tertiary)",
                }}
              >
                {index < stepAtual ? "✓" : index + 1}
              </div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</div>
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>{item.desc}</div>
              </div>
            </div>
            {index < STEPS.length - 1 ? (
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: index < stepAtual ? "#1D9E75" : "var(--border-color)",
                  margin: "0 12px",
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="p-6">
        <SectionRenderer secao={step.id} dados={dados} updateDados={updateDados} previewMsg={previewMsg} />
      </div>

      <div
        style={{
          padding: "12px 24px",
          borderTop: "0.5px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--card-bg)",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setStepAtual((value) => value - 1)}
          disabled={stepAtual === 0 || isPending}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)", background: "var(--bg-secondary)" }}
        >
          ← Voltar
        </button>

        <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
          Passo {stepAtual + 1} de {STEPS.length}
        </span>

        {stepAtual < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              onSaveStep();
              setStepAtual((value) => value + 1);
            }}
            disabled={isPending}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            Continuar →
          </button>
        ) : (
          <button
            type="button"
            onClick={onConcluir}
            disabled={isPending}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            Concluir configuração ✓
          </button>
        )}
      </div>
    </div>
  );
}

function BotConfigEdicao({
  dados,
  updateDados,
  secaoAtiva,
  setSecaoAtiva,
  onSalvar,
  onRefazer,
  previewMsg,
  isPending,
}: {
  dados: BotConfigData;
  updateDados: (partial: Partial<BotConfigData>) => void;
  secaoAtiva: SecaoId;
  setSecaoAtiva: (value: SecaoId) => void;
  onSalvar: () => void;
  onRefazer: () => void;
  previewMsg: string;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4" style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Configuração do bot</h1>
          <p className="mt-1 text-sm text-muted">Edite as configurações do seu atendente virtual</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefazer}
            className="bg-transparent px-2 py-1 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Refazer configuração
          </button>
          <button
            type="button"
            onClick={onSalvar}
            disabled={isPending}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            Salvar alterações
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border p-2" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}>
          {STEPS.map((secao) => {
            const active = secao.id === secaoAtiva;
            return (
              <button
                key={secao.id}
                type="button"
                onClick={() => setSecaoAtiva(secao.id)}
                className="mb-1 w-full rounded-xl px-3 py-2 text-left"
                style={{
                  background: active ? "var(--sidebar-active-bg)" : "transparent",
                  color: active ? "var(--sidebar-active-text)" : "var(--text-secondary)",
                }}
              >
                <div className="text-sm font-medium">{secao.label}</div>
                <div className="text-[11px]" style={{ color: active ? "var(--sidebar-active-text)" : "var(--text-tertiary)" }}>
                  {secao.desc}
                </div>
              </button>
            );
          })}
        </aside>

        <div className="rounded-2xl border p-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}>
          <SectionRenderer secao={secaoAtiva} dados={dados} updateDados={updateDados} previewMsg={previewMsg} />
        </div>
      </div>
    </div>
  );
}

function SectionRenderer({
  secao,
  dados,
  updateDados,
  previewMsg,
}: {
  secao: SecaoId;
  dados: BotConfigData;
  updateDados: (partial: Partial<BotConfigData>) => void;
  previewMsg: string;
}) {
  if (secao === "identidade") {
    return <IdentidadeSection dados={dados} updateDados={updateDados} previewMsg={previewMsg} />;
  }

  if (secao === "operacao") {
    return <OperacaoSection dados={dados} updateDados={updateDados} />;
  }

  if (secao === "regras") {
    return <RegrasSection dados={dados} updateDados={updateDados} />;
  }

  return <NotificacoesSection dados={dados} updateDados={updateDados} />;
}

function CardTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}

function IdentidadeSection({
  dados,
  updateDados,
  previewMsg,
}: {
  dados: BotConfigData;
  updateDados: (partial: Partial<BotConfigData>) => void;
  previewMsg: string;
}) {
  return (
    <div className="space-y-4">
      <CardTitle title="Identidade" description="Defina como o bot se apresenta para o cliente." />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-muted">Nome do atendente</span>
          <input
            value={dados.nome_atendente}
            onChange={(e) => updateDados({ nome_atendente: e.target.value })}
            placeholder="Ex: Zé, Mari, João"
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-muted">Nome do estabelecimento</span>
          <input
            value={dados.nome_negocio}
            onChange={(e) => updateDados({ nome_negocio: e.target.value })}
            placeholder="Nome do negócio"
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {TOM_OPTIONS.map((tone) => {
          const active = dados.tom_voz === tone.id;
          return (
            <button
              key={tone.id}
              type="button"
              onClick={() => updateDados({ tom_voz: tone.id })}
              className="rounded-xl border p-3 text-left"
              style={{
                background: active ? "var(--sidebar-active-bg)" : "var(--bg-secondary)",
                borderColor: active ? "var(--accent)" : "var(--card-border)",
              }}
            >
              <div className="text-sm font-semibold text-foreground">{tone.title}</div>
              <div className="text-xs text-muted">{tone.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)" }}>
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">Preview WhatsApp</p>
        <div className="max-w-md rounded-2xl border px-3 py-2.5 text-sm" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}>
          {previewMsg}
        </div>
      </div>
    </div>
  );
}

function OperacaoSection({
  dados,
  updateDados,
}: {
  dados: BotConfigData;
  updateDados: (partial: Partial<BotConfigData>) => void;
}) {
  function toggleDia(id: string) {
    const exists = dados.horarios.some((h) => h.dia_semana === id);
    if (exists) {
      updateDados({ horarios: dados.horarios.filter((h) => h.dia_semana !== id) });
      return;
    }

    updateDados({ horarios: [...dados.horarios, ensureHorario(id)] });
  }

  function updateHorario(dia: string, patch: Partial<HorarioTurno>) {
    updateDados({
      horarios: dados.horarios.map((horario) => {
        if (horario.dia_semana !== dia) return horario;
        return { ...horario, ...patch };
      }),
    });
  }

  return (
    <div className="space-y-4">
      <CardTitle title="Operação" description="Dias e horários de atendimento, entrega e retirada." />

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">Dias da semana</p>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((dia) => {
            const active = dados.horarios.some((h) => h.dia_semana === dia.id);
            return (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                className="rounded-full border px-3 py-1.5 text-xs"
                style={{
                  background: active ? "var(--sidebar-active-bg)" : "var(--bg-secondary)",
                  borderColor: active ? "var(--accent)" : "var(--card-border)",
                  color: active ? "var(--sidebar-active-text)" : "var(--text-secondary)",
                }}
              >
                {dia.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {dados.horarios.map((horario) => (
          <div key={horario.dia_semana} className="rounded-xl border p-3" style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)" }}>
            <p className="mb-2 text-sm font-semibold text-foreground">{horario.dia_semana}</p>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-muted">Abertura</span>
                <input
                  type="time"
                  value={horario.abertura}
                  onChange={(e) => updateHorario(horario.dia_semana, { abertura: e.target.value })}
                  className="w-full rounded-lg border px-2.5 py-2 text-sm"
                  style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted">Fechamento</span>
                <input
                  type="time"
                  value={horario.fechamento}
                  onChange={(e) => updateHorario(horario.dia_semana, { fechamento: e.target.value })}
                  className="w-full rounded-lg border px-2.5 py-2 text-sm"
                  style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() =>
                updateHorario(horario.dia_semana, {
                  segundo_turno: horario.segundo_turno
                    ? null
                    : { abertura: "19:00", fechamento: "23:00" },
                })
              }
              className="mt-3 rounded-lg border px-2.5 py-1.5 text-xs"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
            >
              {horario.segundo_turno ? "Remover segundo turno" : "Adicionar segundo turno"}
            </button>

            {horario.segundo_turno ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted">2º turno abertura</span>
                  <input
                    type="time"
                    value={horario.segundo_turno.abertura}
                    onChange={(e) =>
                      updateHorario(horario.dia_semana, {
                        segundo_turno: { ...horario.segundo_turno!, abertura: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border px-2.5 py-2 text-sm"
                    style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted">2º turno fechamento</span>
                  <input
                    type="time"
                    value={horario.segundo_turno.fechamento}
                    onChange={(e) =>
                      updateHorario(horario.dia_semana, {
                        segundo_turno: { ...horario.segundo_turno!, fechamento: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border px-2.5 py-2 text-sm"
                    style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-muted">Área de entrega</span>
          <input
            value={dados.area_entrega}
            onChange={(e) => updateDados({ area_entrega: e.target.value })}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-muted">Pedido mínimo (R$)</span>
          <input
            value={formatCurrencyInput(dados.pedido_minimo)}
            onChange={(e) => updateDados({ pedido_minimo: parseCurrencyToNumber(e.target.value) })}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <TogglePill
          label="Faz delivery"
          active={dados.faz_delivery}
          onClick={() => updateDados({ faz_delivery: !dados.faz_delivery })}
        />
        <TogglePill
          label="Faz retirada"
          active={dados.faz_retirada}
          onClick={() => updateDados({ faz_retirada: !dados.faz_retirada })}
        />
      </div>
    </div>
  );
}

function RegrasSection({
  dados,
  updateDados,
}: {
  dados: BotConfigData;
  updateDados: (partial: Partial<BotConfigData>) => void;
}) {
  function updateRule(index: number, value: string) {
    const next = [...dados.regras];
    next[index] = value;
    updateDados({ regras: next });
  }

  function addRule() {
    updateDados({ regras: [...dados.regras, ""] });
  }

  function removeRule(index: number) {
    updateDados({ regras: dados.regras.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      <CardTitle title="Regras" description="Defina limites claros para o comportamento do bot." />

      <div className="space-y-2">
        {dados.regras.map((regra, index) => (
          <div key={`${index}-${regra.slice(0, 8)}`} className="flex gap-2">
            <input
              value={regra}
              onChange={(e) => updateRule(index, e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2.5 text-sm"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
            />
            <button
              type="button"
              onClick={() => removeRule(index)}
              className="rounded-xl border px-3 py-2.5 text-sm"
              style={{ background: "var(--danger-bg)", borderColor: "var(--danger-text)", color: "var(--danger-text)" }}
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="rounded-lg border px-3 py-2 text-sm"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
      >
        + Adicionar regra
      </button>

      <p className="text-xs text-muted">O bot segue essas regras em todas as conversas.</p>
    </div>
  );
}

function NotificacoesSection({
  dados,
  updateDados,
}: {
  dados: BotConfigData;
  updateDados: (partial: Partial<BotConfigData>) => void;
}) {
  return (
    <div className="space-y-4">
      <CardTitle title="Notificações" description="Defina quem recebe alertas operacionais no WhatsApp." />

      <label className="space-y-1">
        <span className="text-xs uppercase tracking-[0.14em] text-muted">WhatsApp do responsável</span>
        <input
          value={dados.whatsapp_responsavel}
          onChange={(e) => updateDados({ whatsapp_responsavel: formatPhone(e.target.value) })}
          placeholder="(11) 99999-9999"
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
        />
      </label>

      <p className="text-xs text-muted">Você receberá alertas de novos pedidos nesse número.</p>

      <div className="space-y-2">
        <ToggleLine
          label="Notificar novos pedidos"
          active={dados.notif_novos_pedidos}
          onToggle={() => updateDados({ notif_novos_pedidos: !dados.notif_novos_pedidos })}
        />
        <ToggleLine
          label="Notificar estoque baixo"
          active={dados.notif_estoque_baixo}
          onToggle={() => updateDados({ notif_estoque_baixo: !dados.notif_estoque_baixo })}
        />
        <ToggleLine
          label="Notificar bot desconectado"
          active={dados.notif_bot_desconectado}
          onToggle={() => updateDados({ notif_bot_desconectado: !dados.notif_bot_desconectado })}
        />
      </div>
    </div>
  );
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs"
      style={{
        background: active ? "var(--sidebar-active-bg)" : "var(--bg-secondary)",
        borderColor: active ? "var(--accent)" : "var(--card-border)",
        color: active ? "var(--sidebar-active-text)" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

function ToggleLine({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
    >
      <span>{label}</span>
      <span
        style={{
          width: 34,
          height: 20,
          borderRadius: 20,
          background: active ? "var(--accent)" : "var(--border-strong)",
          position: "relative",
          transition: "all 0.2s",
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: active ? 17 : 3,
            transition: "left 0.2s",
          }}
        />
      </span>
    </button>
  );
}
