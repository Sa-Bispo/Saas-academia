"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { AlertTriangle, Camera, CheckCircle, Dumbbell, QrCode, RotateCcw } from "lucide-react";
import { PhoneMock } from "../phone-mock";
import { StatusBar } from "../bot-chat-mock";

// Espelho do formulário real (src/app/parq/[tenantId]/parq-form.tsx): mesmas seções,
// as 7 perguntas oficiais do PAR-Q (prisma/seed-parq.ts), selfie, assinatura em fundo
// branco e termo LGPD. Ao enviar, a ficha aparece no "painel" ao lado, como no sistema.

// Amostra de 3 das 7 perguntas oficiais (texto resumido pra caber na demo).
const PERGUNTAS = [
  "Sente dores no peito ao praticar atividade física?",
  "Tem desequilíbrio por tontura ou perda de consciência?",
  "Toma remédio pra pressão ou problema de coração?",
];

type Ficha = { nome: string; data: string; alerta: boolean; foto?: string; nova?: boolean };

const campo =
  "w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[13px] text-white placeholder-white/20 focus:border-emerald-500/50 focus:outline-none";
const bloco = "space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4";
const rotulo = "text-[10px] font-semibold uppercase tracking-widest text-white/40";

function hoje(dias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("pt-BR");
}

// 000.000.000-00
function mascaraCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

// (00) 00000-0000  (ou (00) 0000-0000 com 10 dígitos)
function mascaraWhats(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const corte = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function ParqDemo() {
  const [tela, setTela] = useState<"qr" | "form" | "enviado">("qr");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [whats, setWhats] = useState("");
  const [respostas, setRespostas] = useState<Record<number, "S" | "N">>({});
  const [foto, setFoto] = useState(false);
  const [assinou, setAssinou] = useState(false);
  const [lgpd, setLgpd] = useState(false);
  const [tentou, setTentou] = useState(false);
  const [fichas, setFichas] = useState<Ficha[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);

  // fichas de exemplo com data do cliente (evita diferença servidor x navegador)
  useEffect(() => {
    setFichas([
      { nome: "Carlos Freitas", data: hoje(-1), alerta: false },
      { nome: "Fernanda Carmo", data: hoje(-3), alerta: true },
    ]);
  }, []);

  const alerta = Object.values(respostas).includes("S");
  const faltando = [
    nome.trim().length < 2 && "seu nome",
    !foto && "a selfie",
    !assinou && "a assinatura",
    !lgpd && "o aceite do termo",
  ].filter(Boolean) as string[];

  // ── assinatura ──
  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const inicio = (e: PointerEvent<HTMLCanvasElement>) => {
    desenhando.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };
  const mover = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!assinou) setAssinou(true);
  };
  const fim = () => (desenhando.current = false);
  const limpar = () => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setAssinou(false);
  };

  function enviar() {
    setTentou(true);
    if (faltando.length) return;
    setFichas((f) => [
      { nome: nome.trim(), data: hoje(), alerta, foto: "/parq-demo-selfie.png", nova: true },
      ...f.map((x) => ({ ...x, nova: false })),
    ]);
    setTela("enviado");
  }

  function recomecar() {
    setTela("qr");
    setNome("");
    setCpf("");
    setWhats("");
    setRespostas({});
    setFoto(false);
    setAssinou(false);
    setLgpd(false);
    setTentou(false);
  }

  return (
    <div className="flex h-full items-stretch justify-center gap-5">
      {/* ── celular (mesma moldura do hero) ── */}
      <div className="flex h-full w-[272px] shrink-0 items-center">
        <PhoneMock width={272} glow={false} alt="Ficha PAR-Q no celular do aluno">
        <div className="flex h-full flex-col bg-[#0a0a0a]">
          <StatusBar className="bg-[#0a0a0a]" />

          {tela === "qr" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
              <div className="relative rounded-2xl bg-white p-3 text-[#0a0a0a]">
                <QrCode size={104} strokeWidth={1.25} />
                <span className="absolute -inset-3 rounded-3xl border-2 border-dashed border-emerald-400/60" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">QR code da recepção</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/50">
                  O aluno novo aponta a câmera e a ficha abre no celular dele.
                </p>
              </div>
              <button
                onClick={() => setTela("form")}
                className="w-full rounded-2xl bg-emerald-600 py-3 text-[13px] font-semibold text-white transition hover:bg-emerald-500"
              >
                Abrir a ficha
              </button>
            </div>
          )}

          {tela === "form" && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3.5 pb-6 pt-3">
              {/* cabeçalho */}
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-white/70">
                  <Dumbbell size={22} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Sua Academia</p>
                <p className="mt-1 text-[17px] font-bold text-white">Ficha de Pré-cadastro</p>
                <p className="mt-0.5 text-[11px] text-white/40">Questionário PAR-Q + Termo de Responsabilidade</p>
              </div>

              {/* dados pessoais */}
              <div className={bloco}>
                <p className={rotulo}>Dados pessoais</p>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-white/60">Nome completo *</label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    className={`${campo} ${tentou && nome.trim().length < 2 ? "border-red-500/50" : ""}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-white/60">CPF *</label>
                  <input
                    value={cpf}
                    onChange={(e) => setCpf(mascaraCpf(e.target.value))}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    className={campo}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-white/60">WhatsApp *</label>
                  <input
                    value={whats}
                    onChange={(e) => setWhats(mascaraWhats(e.target.value))}
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    className={campo}
                  />
                </div>
              </div>

              {/* questionário */}
              <div className={bloco}>
                <div>
                  <p className={rotulo}>Questionário PAR-Q</p>
                </div>
                {PERGUNTAS.map((q, i) => (
                  <div key={i} className="space-y-1.5">
                    <p className="text-[12px] leading-snug text-white/80">
                      <span className="mr-1 font-semibold text-white/40">{i + 1}.</span>
                      {q}
                    </p>
                    <div className="flex gap-2">
                      {(["S", "N"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setRespostas((r) => ({ ...r, [i]: v }))}
                          className={`flex-1 rounded-xl border py-1.5 text-[12px] font-semibold transition ${
                            respostas[i] === v
                              ? v === "S"
                                ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                                : "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                              : "border-white/10 bg-white/[0.04] text-white/40 hover:border-white/20 hover:text-white/70"
                          }`}
                        >
                          {v === "S" ? "Sim" : "Não"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-white/30">+ 4 perguntas na ficha completa</p>
                {alerta && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                    <p className="flex items-start gap-2 text-[11px] text-amber-300">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                      Uma ou mais respostas indicam que é recomendável consultar um médico antes de
                      iniciar atividades físicas.
                    </p>
                  </div>
                )}
              </div>

              {/* foto */}
              <div
                className={`space-y-2.5 rounded-2xl border p-4 ${
                  foto
                    ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                    : tentou
                    ? "border-red-500/50 bg-red-500/[0.04]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <p className={`${rotulo} ${foto ? "!text-emerald-400" : ""}`}>Foto de identificação *</p>
                {foto ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/parq-demo-selfie.png" alt="Selfie de exemplo" className="h-16 w-16 rounded-xl object-cover" />
                    <button onClick={() => setFoto(false)} className="text-[11px] text-white/40 hover:text-white/70">
                      Trocar foto
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setFoto(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-[12px] font-medium text-white/60 hover:border-white/30 hover:text-white"
                  >
                    <Camera size={14} /> Tirar selfie
                  </button>
                )}
              </div>

              {/* assinatura */}
              <div className={bloco}>
                <p className={rotulo}>Assinatura</p>
                <div
                  className={`overflow-hidden rounded-xl border bg-white ${
                    tentou && !assinou ? "border-red-500/60" : "border-white/10"
                  }`}
                >
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={200}
                    onPointerDown={inicio}
                    onPointerMove={mover}
                    onPointerUp={fim}
                    onPointerLeave={fim}
                    className="block h-[96px] w-full cursor-crosshair touch-none"
                  />
                </div>
                <button onClick={limpar} className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60">
                  <RotateCcw size={11} /> Limpar assinatura
                </button>
              </div>

              {/* termo */}
              <div className={bloco}>
                <p className={rotulo}>Termo de responsabilidade</p>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={lgpd}
                    onChange={(e) => setLgpd(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                  />
                  <span className={`text-[11px] ${tentou && !lgpd ? "text-red-400" : "text-white/60"}`}>
                    Li e concordo com o termo e autorizo o tratamento dos meus dados para fins de
                    cadastro nesta academia, conforme a LGPD.
                  </span>
                </label>
              </div>

              {tentou && faltando.length > 0 && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
                  Falta: {faltando.join(", ")}.
                </p>
              )}

              <button
                onClick={enviar}
                className="w-full rounded-2xl bg-emerald-600 py-3 text-[13px] font-semibold text-white transition hover:bg-emerald-500"
              >
                Enviar ficha
              </button>
            </div>
          )}

          {tela === "enviado" && (
            <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
              <CheckCircle size={44} className="mb-3 text-emerald-400" />
              <p className="text-[17px] font-semibold text-white">Ficha enviada!</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/50">
                Seu questionário PAR-Q foi registrado com sucesso. A academia entrará em contato
                para os próximos passos.
              </p>
              <button
                onClick={recomecar}
                className="mt-6 rounded-xl border border-white/15 px-4 py-2 text-[12px] font-medium text-white/70 hover:text-white"
              >
                Preencher outra
              </button>
            </div>
          )}
        </div>
        </PhoneMock>
      </div>

      {/* ── painel (só em telas largas) ── */}
      <div className="hidden min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] sm:flex">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Seu painel · PAR-Q
          </p>
          <p className="mt-0.5 text-sm font-semibold">Fichas recebidas</p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {fichas.map((f) => (
            <div
              key={f.nome + f.data}
              className={`msg-in flex items-center gap-3 rounded-xl border p-2.5 ${
                f.nova ? "border-emerald-500/40 bg-emerald-500/[0.06]" : "border-[var(--border)] bg-white/[0.02]"
              }`}
            >
              {f.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.foto} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-semibold">
                  {f.nome[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{f.nome}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {f.data} · {f.nova ? "com foto e assinatura" : "Lead"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  f.alerta ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                Lib. médica: {f.alerta ? "Sim" : "Não"}
              </span>
            </div>
          ))}
          {fichas.length > 0 && !fichas[0].nova && (
            <p className="px-1 pt-2 text-[11px] text-[var(--text-tertiary)]">
              Envie a ficha no celular e veja ela chegar aqui.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
