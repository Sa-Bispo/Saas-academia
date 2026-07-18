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
type SecaoId = "identidade" | "funcionamento" | "regras" | "notificacoes";
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
  { id: "funcionamento", label: "Funcionamento", desc: "Horários e modalidades" },
  { id: "regras", label: "Regras", desc: "Limites do bot" },
  { id: "notificacoes", label: "Notificações", desc: "Alertas" },
];

const TOM_OPTIONS: Array<{ id: TomVoz; title: string; desc: string }> = [
  { id: "descontraido", title: "Descontraído", desc: "Leve, próximo e informal" },
  { id: "formal", title: "Formal", desc: "Profissional e objetivo" },
  { id: "motivador", title: "Motivador", desc: "Energético e focado em resultados" },
];

const MODALIDADES_SUGERIDAS = [
  "Musculação",
  "Spinning",
  "Yoga",
  "Pilates",
  "Crossfit",
  "Natação",
  "Muay Thai",
  "Funcional",
  "Zumba",
  "Jump",
];

const DEFAULT_REGRAS = [
  "Nunca ofereça desconto sem autorização do responsável",
  "Não confirme matrículas sem verificar disponibilidade",
  "Se o aluno reclamar, ofereça falar com o responsável",
];

const DEFAULT_CONFIG: BotConfigData = {
  nome_atendente: "",
  nome_negocio: "",
  tom_voz: "descontraido",
  horarios: [],
  modalidades: [],
  regras: DEFAULT_REGRAS,
  whatsapp_responsavel: "",
  notif_novos_alunos: true,
  notif_cobrancas_atraso: true,
  notif_bot_desconectado: true,
  bot_configurado: false,
};

function mergeInitialConfig(config?: BotConfigData | null): BotConfigData {
  if (!config) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...config,
    regras: config.regras.length > 0 ? config.regras : DEFAULT_REGRAS,
    modalidades: config.modalidades ?? [],
  };
}

function gerarPreviewSaudacao(atendente: string, negocio: string, tom: TomVoz) {
  const nome = atendente || "Bot";
  const academia = negocio || "nossa academia";
  if (tom === "descontraido") return `Oi! Sou o ${nome} da ${academia}. Em que posso te ajudar? 💪`;
  if (tom === "formal") return `Olá! Bem-vindo à ${academia}. Meu nome é ${nome}. Como posso ajudá-lo?`;
  if (tom === "motivador") return `Bora! Aqui é o ${nome} da ${academia}. Vamos juntos alcançar seus objetivos! 🔥`;
  return `Olá! Sou ${nome} da ${academia}. O que posso fazer por você?`;
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
    abertura: "06:00",
    fechamento: "22:00",
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
              ? "border-brand/30 bg-brand/10 text-brand"
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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
      {/* Progress bar */}
      <div className="flex overflow-x-auto border-b border-line bg-surface/80 px-6 py-4" style={{ gap: 0 }}>
        {STEPS.map((item, index) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 160 }}>
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition"
                style={{
                  background: index < stepAtual ? "var(--accent)" : "transparent",
                  border: index < stepAtual ? "none" : index === stepAtual ? "2px solid var(--accent)" : "1px solid var(--border-color)",
                  color: index < stepAtual ? "white" : index === stepAtual ? "var(--accent)" : "var(--text-tertiary)",
                }}
              >
                {index < stepAtual ? "✓" : index + 1}
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">{item.label}</div>
                <div className="text-[10px] text-muted">{item.desc}</div>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className="mx-3 h-px flex-1 transition"
                style={{ background: index < stepAtual ? "var(--accent)" : "var(--border-color)" }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="p-6">
        <SectionRenderer secao={step.id} dados={dados} updateDados={updateDados} previewMsg={previewMsg} />
      </div>

      <div className="flex items-center justify-between border-t border-line bg-surface/80 px-6 py-4">
        <button
          type="button"
          onClick={() => setStepAtual((v) => v - 1)}
          disabled={stepAtual === 0 || isPending}
          className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:border-white/20 hover:text-white disabled:opacity-40"
        >
          ← Voltar
        </button>

        <span className="text-xs text-muted">
          {stepAtual + 1} / {STEPS.length}
        </span>

        {stepAtual < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              onSaveStep();
              setStepAtual((v) => v + 1);
            }}
            disabled={isPending}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-60"
          >
            Continuar →
          </button>
        ) : (
          <button
            type="button"
            onClick={onConcluir}
            disabled={isPending}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-60"
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
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
        <div>
          <h1 className="text-2xl font-semibold text-white">Configuração do bot</h1>
          <p className="mt-1 text-sm text-muted">Edite as configurações do atendente virtual da academia</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefazer}
            className="rounded-xl border border-line px-3 py-2 text-xs text-muted transition hover:border-white/20 hover:text-white"
          >
            Refazer wizard
          </button>
          <button
            type="button"
            onClick={onSalvar}
            disabled={isPending}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-60"
          >
            Salvar alterações
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-line bg-surface/60 p-2 backdrop-blur">
          {STEPS.map((secao) => {
            const active = secao.id === secaoAtiva;
            return (
              <button
                key={secao.id}
                type="button"
                onClick={() => setSecaoAtiva(secao.id)}
                className="mb-1 w-full rounded-xl px-3 py-2 text-left transition"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                <div className="text-sm font-medium">{secao.label}</div>
                <div className="text-[11px] opacity-70">{secao.desc}</div>
              </button>
            );
          })}
        </aside>

        <div className="rounded-2xl border border-line bg-surface/60 p-6 backdrop-blur">
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
  if (secao === "identidade") return <IdentidadeSection dados={dados} updateDados={updateDados} previewMsg={previewMsg} />;
  if (secao === "funcionamento") return <FuncionamentoSection dados={dados} updateDados={updateDados} />;
  if (secao === "regras") return <RegrasSection dados={dados} updateDados={updateDados} />;
  return <NotificacoesSection dados={dados} updateDados={updateDados} />;
}

function CardTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
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
    <div className="space-y-5">
      <CardTitle title="Identidade" description="Como o bot se apresenta para os alunos." />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-widest text-muted">Nome do atendente</span>
          <input
            value={dados.nome_atendente}
            onChange={(e) => updateDados({ nome_atendente: e.target.value })}
            placeholder="Ex: Mari, Zé, Atlas"
            className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm text-white outline-none transition focus:border-brand/45"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-widest text-muted">Nome da academia</span>
          <input
            value={dados.nome_negocio}
            onChange={(e) => updateDados({ nome_negocio: e.target.value })}
            placeholder="Ex: FitAcademia, Power Gym"
            className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm text-white outline-none transition focus:border-brand/45"
          />
        </label>
      </div>

      <div>
        <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted">Tom de voz</span>
        <div className="grid gap-3 md:grid-cols-3">
          {TOM_OPTIONS.map((tone) => {
            const active = dados.tom_voz === tone.id;
            return (
              <button
                key={tone.id}
                type="button"
                onClick={() => updateDados({ tom_voz: tone.id })}
                className="rounded-xl border p-3 text-left transition"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-secondary)",
                  borderColor: active ? "var(--accent)" : "var(--card-border)",
                }}
              >
                <div className="text-sm font-semibold text-white">{tone.title}</div>
                <div className="mt-0.5 text-xs text-muted">{tone.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-background/40 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">Preview da saudação</p>
        <p className="text-sm text-white">{previewMsg}</p>
      </div>
    </div>
  );
}

function FuncionamentoSection({
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
    } else {
      updateDados({ horarios: [...dados.horarios, ensureHorario(id)] });
    }
  }

  function updateHorario(dia: string, patch: Partial<HorarioTurno>) {
    updateDados({
      horarios: dados.horarios.map((h) => h.dia_semana !== dia ? h : { ...h, ...patch }),
    });
  }

  function toggleModalidade(mod: string) {
    const mods = dados.modalidades ?? [];
    if (mods.includes(mod)) {
      updateDados({ modalidades: mods.filter((m) => m !== mod) });
    } else {
      updateDados({ modalidades: [...mods, mod] });
    }
  }

  const mods = dados.modalidades ?? [];

  return (
    <div className="space-y-6">
      <CardTitle title="Funcionamento" description="Dias, horários e modalidades da academia." />

      {/* Dias */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">Dias de funcionamento</p>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((dia) => {
            const active = dados.horarios.some((h) => h.dia_semana === dia.id);
            return (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                  borderColor: active ? "var(--accent)" : "var(--card-border)",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {dia.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horários */}
      {dados.horarios.length > 0 && (
        <div className="space-y-3">
          {dados.horarios.map((horario) => (
            <div key={horario.dia_semana} className="rounded-xl border border-line bg-background/40 p-4">
              <p className="mb-3 text-sm font-semibold text-white">{horario.dia_semana}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted">Abertura</span>
                  <input
                    type="time"
                    value={horario.abertura}
                    onChange={(e) => updateHorario(horario.dia_semana, { abertura: e.target.value })}
                    className="h-9 w-full rounded-lg border border-line bg-background/60 px-3 text-sm text-white outline-none focus:border-brand/45"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted">Fechamento</span>
                  <input
                    type="time"
                    value={horario.fechamento}
                    onChange={(e) => updateHorario(horario.dia_semana, { fechamento: e.target.value })}
                    className="h-9 w-full rounded-lg border border-line bg-background/60 px-3 text-sm text-white outline-none focus:border-brand/45"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateHorario(horario.dia_semana, {
                    segundo_turno: horario.segundo_turno ? null : { abertura: "14:00", fechamento: "17:00" },
                  })
                }
                className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:border-white/20 hover:text-white"
              >
                {horario.segundo_turno ? "Remover intervalo" : "Adicionar intervalo"}
              </button>

              {horario.segundo_turno && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted">Retorno</span>
                    <input
                      type="time"
                      value={horario.segundo_turno.abertura}
                      onChange={(e) =>
                        updateHorario(horario.dia_semana, {
                          segundo_turno: { ...horario.segundo_turno!, abertura: e.target.value },
                        })
                      }
                      className="h-9 w-full rounded-lg border border-line bg-background/60 px-3 text-sm text-white outline-none focus:border-brand/45"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted">Fechamento</span>
                    <input
                      type="time"
                      value={horario.segundo_turno.fechamento}
                      onChange={(e) =>
                        updateHorario(horario.dia_semana, {
                          segundo_turno: { ...horario.segundo_turno!, fechamento: e.target.value },
                        })
                      }
                      className="h-9 w-full rounded-lg border border-line bg-background/60 px-3 text-sm text-white outline-none focus:border-brand/45"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modalidades */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">Modalidades disponíveis</p>
        <div className="flex flex-wrap gap-2">
          {MODALIDADES_SUGERIDAS.map((mod) => {
            const active = mods.includes(mod);
            return (
              <button
                key={mod}
                type="button"
                onClick={() => toggleModalidade(mod)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                  borderColor: active ? "var(--accent)" : "var(--card-border)",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {mod}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">O bot informará essas modalidades quando alunos perguntarem.</p>
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
    <div className="space-y-5">
      <CardTitle title="Regras do bot" description="Defina os limites do comportamento do atendente virtual." />

      <div className="space-y-2">
        {dados.regras.map((regra, index) => (
          <div key={`${index}-${regra.slice(0, 8)}`} className="flex gap-2">
            <input
              value={regra}
              onChange={(e) => updateRule(index, e.target.value)}
              className="h-10 flex-1 rounded-xl border border-line bg-background/60 px-3 text-sm text-white outline-none transition focus:border-brand/45"
            />
            <button
              type="button"
              onClick={() => removeRule(index)}
              className="rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="rounded-xl border border-line px-3 py-2 text-sm text-muted transition hover:border-white/20 hover:text-white"
      >
        + Adicionar regra
      </button>

      <p className="text-xs text-muted">O bot segue essas regras em todas as conversas com os alunos.</p>
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
    <div className="space-y-5">
      <CardTitle title="Notificações" description="Defina quem recebe alertas operacionais via WhatsApp." />

      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-widest text-muted">WhatsApp do responsável</span>
        <input
          value={dados.whatsapp_responsavel}
          onChange={(e) => updateDados({ whatsapp_responsavel: formatPhone(e.target.value) })}
          placeholder="(11) 99999-9999"
          className="h-10 w-full rounded-xl border border-line bg-background/60 px-3 text-sm text-white outline-none transition focus:border-brand/45"
        />
        <p className="text-xs text-muted">Você receberá alertas importantes nesse número.</p>
      </label>

      <div className="space-y-2">
        <ToggleLine
          label="Notificar novas matrículas"
          active={dados.notif_novos_alunos}
          onToggle={() => updateDados({ notif_novos_alunos: !dados.notif_novos_alunos })}
        />
        <ToggleLine
          label="Notificar cobranças em atraso"
          active={dados.notif_cobrancas_atraso}
          onToggle={() => updateDados({ notif_cobrancas_atraso: !dados.notif_cobrancas_atraso })}
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

function ToggleLine({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xl border border-line bg-background/40 px-4 py-3 text-sm text-muted transition hover:border-white/15"
    >
      <span className="text-white">{label}</span>
      <span
        className="relative transition-all"
        style={{
          width: 34,
          height: 20,
          borderRadius: 20,
          background: active ? "var(--accent)" : "var(--border-strong, #333)",
          flexShrink: 0,
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
