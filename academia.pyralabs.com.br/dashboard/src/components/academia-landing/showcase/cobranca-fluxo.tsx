"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bot, Check, ImageIcon, MessageCircle, RotateCcw, Send, User } from "lucide-react";

// Demo fiel ao produto real (2026-11-14):
// - Automático (plano Cobrança): o lembrete sai sozinho, o aluno pede a chave Pix,
//   manda o comprovante na conversa e a academia confirma em 1 clique ("Pix recebido").
// - Você envia (plano Gestão, cobrança assistida): o botão abre o WhatsApp com a
//   mensagem pronta e quem está na recepção revisa e envia.
// A conversa é mostrada do lado da academia (mensagens da academia à direita).

type Modo = "auto" | "manual";
type Msg = { de: "academia" | "aluno"; texto: ReactNode; auto?: boolean };
type Status = { label: string; cor: string };

const CHAVE = "financeiro@suaacademia.com.br";

function dataDaqui(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function CobrancaFluxo() {
  const [modo, setModo] = useState<Modo>("auto");
  const [passo, setPasso] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [digitando, setDigitando] = useState(false);
  const [venc, setVenc] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // data calculada só no cliente (evita diferença entre servidor e navegador)
  useEffect(() => setVenc(dataDaqui(3)), []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [msgs, digitando]);

  const lembrete = useMemo(
    () => (
      <>
        Oi, Marcos! Tudo bem? 😊
        <br />
        Passando pra lembrar que a sua mensalidade de <b>R$ 89,90</b> vence em{" "}
        <b>{venc || "3 dias"}</b>.
        {modo === "auto" ? (
          <>
            <br />
            Pra pagar no Pix, responda <b>PIX</b> que eu te mando a chave.
          </>
        ) : (
          <>
            <br />
            Se preferir pagar no Pix, a chave é: {CHAVE}
          </>
        )}
      </>
    ),
    [venc, modo]
  );

  function depois(ms: number, fn: () => void) {
    timers.current.push(setTimeout(fn, ms));
  }

  function responder(m: Msg, atraso = 900, fim?: () => void) {
    setDigitando(true);
    depois(atraso, () => {
      setDigitando(false);
      setMsgs((x) => [...x, m]);
      fim?.();
    });
  }

  function recomecar(novoModo: Modo = modo) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setModo(novoModo);
    setPasso(0);
    setMsgs([]);
    setDigitando(false);
  }

  // ── ações de cada passo ──────────────────────────────────────────────────
  function acaoAuto() {
    if (passo === 0) {
      setMsgs([{ de: "academia", texto: lembrete, auto: true }]);
      setPasso(1);
    } else if (passo === 1) {
      setMsgs((x) => [...x, { de: "aluno", texto: "PIX" }]);
      setPasso(-1);
      responder(
        {
          de: "academia",
          auto: true,
          texto: (
            <>
              Aqui está a chave Pix: <b>{CHAVE}</b>
              <br />
              Depois é só me mandar o comprovante por aqui 😉
            </>
          ),
        },
        900,
        () => setPasso(2)
      );
    } else if (passo === 2) {
      setMsgs((x) => [
        ...x,
        {
          de: "aluno",
          texto: (
            <span className="flex items-center gap-2">
              <ImageIcon size={14} /> comprovante.jpg
            </span>
          ),
        },
      ]);
      setPasso(-1);
      responder(
        {
          de: "academia",
          auto: true,
          texto: <>Recebi seu comprovante! Assim que a academia conferir, te aviso aqui ✅</>,
        },
        900,
        () => setPasso(3)
      );
    } else if (passo === 3) {
      setMsgs((x) => [
        ...x,
        {
          de: "academia",
          auto: true,
          texto: (
            <>
              ✅ <b>Pagamento confirmado!</b> Recebemos seus R$ 89,90. Bora treinar 💪
            </>
          ),
        },
      ]);
      setPasso(4);
    } else recomecar();
  }

  function acaoManual() {
    if (passo === 0) setPasso(1);
    else if (passo === 1) {
      setMsgs([{ de: "academia", texto: lembrete }]);
      setPasso(-1);
      responder(
        { de: "aluno", texto: "Opa, esqueci! Já faço o Pix e te mando o comprovante 👍" },
        1400,
        () => setPasso(2)
      );
    } else if (passo === 2) {
      // sem WhatsApp conectado (plano Gestão), a baixa fica só no painel
      setPasso(3);
    } else recomecar();
  }

  // ── o que o painel mostra em cada passo ─────────────────────────────────
  const auto = modo === "auto";
  const pago = (auto && passo === 4) || (!auto && passo === 3);
  const status: Status = pago
    ? { label: "Pago", cor: "var(--wpp)" }
    : auto && passo === 3
    ? { label: "Comprovante recebido", cor: "#7cc4ff" }
    : msgs.length > 0
    ? { label: "Lembrete enviado", cor: "var(--accent-strong)" }
    : { label: `Vence em ${venc || "3 dias"}`, cor: "var(--text-tertiary)" };

  const botao: { label: string; icone: ReactNode; quem: "painel" | "aluno" | "fim" } | null =
    passo === -1
      ? null
      : auto
      ? [
          { label: "Enviar lembrete agora", icone: <Send size={13} />, quem: "painel" as const },
          { label: "Aluno responde PIX", icone: <User size={13} />, quem: "aluno" as const },
          { label: "Aluno manda o comprovante", icone: <User size={13} />, quem: "aluno" as const },
          { label: "Pix recebido · confirmar", icone: <Check size={13} />, quem: "painel" as const },
          { label: "Ver de novo", icone: <RotateCcw size={13} />, quem: "fim" as const },
        ][passo]
      : [
          { label: "Cobrar no meu WhatsApp", icone: <MessageCircle size={13} />, quem: "painel" as const },
          { label: "Enviar a mensagem", icone: <Send size={13} />, quem: "painel" as const },
          { label: "Pix recebido · dar baixa", icone: <Check size={13} />, quem: "painel" as const },
          { label: "Ver de novo", icone: <RotateCcw size={13} />, quem: "fim" as const },
        ][passo];

  const dica = auto
    ? [
        "No dia a dia isso sai sozinho, antes de vencer. Aqui você dispara na mão pra ver.",
        "O aluno pede a chave na própria conversa.",
        "O comprovante chega no WhatsApp e aparece no painel.",
        "Conferiu no banco? Um clique e o aluno recebe a confirmação.",
        "Ninguém precisou correr atrás de ninguém.",
      ][passo]
    : [
        "Pra academia que prefere cobrar do seu jeito: nada sai sozinho.",
        "Abre o seu WhatsApp com a mensagem pronta. Dá pra mexer antes de enviar.",
        "Quando o aluno pagar, um clique dá baixa no painel.",
        "Cobrança humana, sem digitar mensagem por mensagem.",
      ][passo];

  const rascunho = !auto && passo === 1;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
      {/* modo */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex rounded-xl bg-white/[0.04] p-1 text-[12px] font-medium">
          {(
            [
              ["auto", "Automático"],
              ["manual", "Você envia"],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => recomecar(id)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                modo === id
                  ? "bg-white/[0.09] text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <span className="hidden text-[11px] text-[var(--text-tertiary)] sm:block">
          {auto ? "plano Cobrança" : "a partir do plano Gestão"}
        </span>
      </div>

      {/* linha do painel */}
      <div className="border-b border-[var(--border)] bg-white/[0.015] px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Painel · Cobranças
        </p>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold">
            M
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Marcos Lima</p>
            <p className="text-[12px] text-[var(--text-tertiary)]">Mensal · R$ 89,90</p>
          </div>
          <span
            className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
            style={{ color: status.cor, borderColor: "var(--border-strong)" }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* conversa */}
      <div className="flex min-h-0 flex-1 flex-col bg-[#0e0d11]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[#161419] px-4 py-2">
          <span className="text-[12px] font-semibold">WhatsApp da academia</span>
          <span className="text-[11px] text-[var(--text-tertiary)]">· conversa com o Marcos</span>
        </div>
        <div ref={scrollRef} className="wa-wallpaper min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {msgs.length === 0 && !rascunho && (
            <p className="pt-6 text-center text-[12px] text-[var(--text-tertiary)]">
              Nenhuma mensagem ainda
            </p>
          )}
          {msgs.map((m, i) =>
            m.de === "academia" ? (
              <div key={i} className="msg-in ml-auto w-fit max-w-[86%]">
                <div className="rounded-2xl rounded-tr-md bg-[#12341f] px-3 py-2 text-[13px] leading-relaxed text-[#dbf3e4]">
                  {m.texto}
                </div>
                {m.auto && (
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[var(--text-tertiary)]">
                    <Bot size={10} /> enviada pelo sistema
                  </p>
                )}
              </div>
            ) : (
              <div
                key={i}
                className="msg-in w-fit max-w-[86%] rounded-2xl rounded-tl-md bg-[#221f26] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-primary)]"
              >
                {m.texto}
              </div>
            )
          )}
          {digitando && (
            <div
              className={`msg-in flex w-max items-center gap-1 rounded-2xl px-3.5 py-3 ${
                auto ? "ml-auto bg-[#12341f]" : "bg-[#221f26]"
              }`}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          )}
        </div>
        {rascunho && (
          <div className="msg-in border-t border-[var(--border)] bg-[#161419] px-3 py-2.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--wpp)]">
              Mensagem pronta · você revisa e envia
            </p>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
              {lembrete}
            </div>
          </div>
        )}
      </div>

      {/* ação */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="mb-2 min-h-[18px] text-[12px] text-[var(--text-tertiary)]">{dica}</p>
        {botao ? (
          <button
            onClick={auto ? acaoAuto : acaoManual}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              botao.quem === "aluno"
                ? "border border-[var(--border-strong)] bg-white/[0.04] text-[var(--text-primary)] hover:bg-white/[0.08]"
                : botao.quem === "fim"
                ? "border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                : "bg-[var(--wpp)] text-[#04140a] hover:bg-[var(--wpp-strong)]"
            }`}
          >
            {botao.icone}
            {botao.label}
          </button>
        ) : (
          <div className="flex h-[42px] items-center justify-center text-[13px] text-[var(--text-tertiary)]">
            respondendo…
          </div>
        )}
      </div>
    </div>
  );
}
