"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle, Loader2, RotateCcw } from "lucide-react";
import { SignaturePad, SignaturePadHandle } from "@/components/parq/signature-pad";
import { PARQ_TERMO_V1 } from "@/lib/parq-termo";

type Pergunta = { id: number; texto: string };

type Props = {
  tenantId: string;
  academiaName: string;
  perguntas: Pergunta[];
};

function maskCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export function ParqFormClient({ tenantId, academiaName, perguntas }: Props) {
  const sigRef = useRef<SignaturePadHandle>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [respostas, setRespostas] = useState<Record<number, "S" | "N">>({});
  const [aceitaResponsabilidade, setAceitaResponsabilidade] = useState(false);
  const [lgpd, setLgpd] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [pending, startTransition] = useTransition();

  const todasRespondidas = perguntas.every((p) => respostas[p.id] !== undefined);
  const temAlertaMedico = Object.values(respostas).some((v) => v === "S");

  function handleResposta(id: number, valor: "S" | "N") {
    setRespostas((prev) => ({ ...prev, [id]: valor }));
  }

  function handleSubmit() {
    setErro(null);
    setTentouEnviar(true);

    if (!nome.trim() || !cpf.trim() || !telefone.trim()) {
      setErro("Preencha nome, CPF e telefone.");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      setErro("CPF inválido. Informe os 11 dígitos.");
      return;
    }
    if (!todasRespondidas) {
      setErro("Responda todas as perguntas do questionário.");
      return;
    }
    if (temAlertaMedico && !aceitaResponsabilidade) {
      setErro("Você deve confirmar a ciência e aceitar a responsabilidade antes de continuar.");
      return;
    }
    if (!lgpd) {
      setErro("É necessário aceitar o termo de consentimento LGPD.");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setErro("A assinatura é obrigatória. Assine no campo acima antes de enviar.");
      return;
    }

    const assinatura = sigRef.current.toDataURL();

    startTransition(async () => {
      try {
        const res = await fetch(`/api/parq/${tenantId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, cpf, telefone, dataNascimento: dataNascimento || undefined, respostas, assinatura, consentimentoLgpd: lgpd }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string; detail?: string };
          const msg = data.detail ? `${data.error ?? "Erro"}: ${data.detail}` : (data.error ?? "Erro ao enviar. Tente novamente.");
          setErro(msg);
          return;
        }
        setEnviado(true);
      } catch {
        setErro("Sem conexão. Verifique sua internet e tente novamente.");
      }
    });
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
          <h1 className="mb-2 text-xl font-semibold text-white">Ficha enviada!</h1>
          <p className="text-sm text-white/50">
            Seu questionário PAR-Q foi registrado com sucesso. A academia entrará em contato
            para os próximos passos.
          </p>
          {temAlertaMedico && (
            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left">
              <p className="flex items-start gap-2 text-xs text-amber-300">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Uma ou mais respostas indicam recomendação de avaliação médica antes de iniciar
                atividades físicas.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            {academiaName}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Ficha de Pré-cadastro</h1>
          <p className="mt-1 text-sm text-white/40">Questionário PAR-Q + Termo de Responsabilidade</p>
        </div>

        {/* Dados pessoais */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Dados pessoais
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Nome completo *</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-indigo-500/50 focus:outline-none"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">CPF *</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-indigo-500/50 focus:outline-none"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">WhatsApp *</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-indigo-500/50 focus:outline-none"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                inputMode="tel"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Data de nascimento</label>
            <input
              type="date"
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none [color-scheme:dark]"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        {/* Questionário PAR-Q */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Questionário PAR-Q
            </p>
            <p className="mt-1 text-xs text-white/30">
              Por favor, responda com sinceridade. Responda SIM ou NÃO para cada pergunta.
            </p>
          </div>

          {perguntas.map((p, i) => {
            const naoRespondida = tentouEnviar && respostas[p.id] === undefined;
            return (
              <div key={p.id} className="space-y-2">
                <p className={`text-sm ${naoRespondida ? "text-red-400" : "text-white/80"}`}>
                  <span className={`mr-1.5 font-semibold ${naoRespondida ? "text-red-400" : "text-white/40"}`}>{i + 1}.</span>
                  {p.texto}
                  {naoRespondida && <span className="ml-1.5 text-xs font-normal text-red-400">— obrigatório</span>}
                </p>
                <div className="flex gap-2">
                  {(["S", "N"] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleResposta(p.id, val)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                        respostas[p.id] === val
                          ? val === "S"
                            ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                            : "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                          : naoRespondida
                          ? "border-red-500/40 bg-red-500/5 text-white/40 hover:border-red-400/60 hover:text-white/70"
                          : "border-white/10 bg-white/[0.04] text-white/40 hover:border-white/20 hover:text-white/70"
                      }`}
                    >
                      {val === "S" ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {temAlertaMedico && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="flex items-start gap-2 text-xs text-amber-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Uma ou mais respostas indicam que é recomendável consultar um médico antes de
                iniciar ou intensificar atividades físicas.
              </p>
            </div>
          )}
        </div>

        {/* Aceite de responsabilidade — aparece quando qualquer resposta é "Sim" */}
        {temAlertaMedico && (
          <div className={`rounded-2xl border p-5 space-y-3 transition-colors ${
            tentouEnviar && !aceitaResponsabilidade
              ? "border-red-500/50 bg-red-500/[0.06]"
              : "border-amber-500/30 bg-amber-500/[0.06]"
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Declaração de ciência e responsabilidade
              </p>
            </div>
            <p className="text-xs leading-relaxed text-white/60">
              Você indicou possuir uma ou mais condições de saúde relevantes. Ao prosseguir,
              declara estar ciente dos riscos associados à prática de atividades físicas com
              essas condições e assume plena responsabilidade por quaisquer consequências,
              eximindo a academia e seus profissionais de responsabilidade civil relacionada
              às condições de saúde declaradas neste formulário.
            </p>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={aceitaResponsabilidade}
                onChange={(e) => setAceitaResponsabilidade(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
              />
              <span className={`text-xs ${tentouEnviar && !aceitaResponsabilidade ? "text-red-400" : "text-white/70"}`}>
                Estou ciente das condições de saúde que declarei e assumo a responsabilidade
                pela minha participação nas atividades físicas desta academia. *
              </span>
            </label>
          </div>
        )}

        {/* Assinatura */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Assinatura</p>
          <p className="text-xs text-white/30">Assine com o dedo ou mouse no espaço abaixo.</p>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
            <SignaturePad ref={sigRef} className="block h-[120px] w-full cursor-crosshair" />
          </div>

          <button
            type="button"
            onClick={() => sigRef.current?.clear()}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition"
          >
            <RotateCcw size={12} />
            Limpar assinatura
          </button>
        </div>

        {/* Termo de responsabilidade */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Termo de responsabilidade
          </p>
          <p className="text-xs leading-relaxed text-white/50">{PARQ_TERMO_V1}</p>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={lgpd}
              onChange={(e) => setLgpd(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-500"
            />
            <span className="text-xs text-white/60">
              Li e concordo com o termo acima e autorizo o tratamento dos meus dados
              (incluindo dados de saúde) para fins de cadastro nesta academia, conforme a
              LGPD (Lei 13.709/2018).
            </span>
          </label>
        </div>

        {/* Erro */}
        {erro && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{erro}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" />
              Enviando...
            </span>
          ) : (
            "Enviar ficha"
          )}
        </button>

        <p className="pb-8 text-center text-[11px] text-white/20">
          Seus dados são protegidos e usados apenas para fins de cadastro na academia.
        </p>
      </div>
    </div>
  );
}
