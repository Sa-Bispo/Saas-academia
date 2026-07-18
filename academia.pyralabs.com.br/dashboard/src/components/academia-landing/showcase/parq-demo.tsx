"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Check, Eraser, ShieldCheck } from "lucide-react";

const PERGUNTAS = [
  "Você sente dor no peito ao praticar atividade física?",
  "Já perdeu o equilíbrio por tontura ou já desmaiou?",
  "Tem algum problema ósseo ou articular (coluna, joelho, quadril)?",
];

export function ParqDemo() {
  const [nome, setNome] = useState("");
  const [respostas, setRespostas] = useState<(boolean | null)[]>(
    Array(PERGUNTAS.length).fill(null)
  );
  const [assinou, setAssinou] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };
  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.strokeStyle = "#f2f0ec";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!assinou) setAssinou(true);
  };
  const end = () => (drawing.current = false);
  const limpar = () => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setAssinou(false);
  };

  const completo = nome.trim().length > 1 && assinou;

  if (enviado) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(37,211,102,0.14)] text-[var(--wpp)]">
          <ShieldCheck size={26} />
        </div>
        <div>
          <p className="text-lg font-semibold">Ficha PAR-Q enviada ✅</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Assinada por {nome.trim()} · arquivada no painel, sem papel.
          </p>
        </div>
        <button
          onClick={() => {
            setEnviado(false);
            setNome("");
            setRespostas(Array(PERGUNTAS.length).fill(null));
            limpar();
          }}
          className="rounded-xl border border-[var(--border-strong)] bg-white/[0.03] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/[0.06]"
        >
          Preencher outra
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
      {/* topo */}
      <div className="border-b border-[var(--border)] px-5 py-4">
        <p className="text-sm font-semibold">Ficha PAR-Q</p>
        <p className="text-[12px] text-[var(--text-tertiary)]">
          O aluno preenche e assina pelo celular
        </p>
      </div>

      {/* corpo */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {/* nome */}
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]">
            Nome do aluno
          </span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome"
            className="w-full rounded-xl border border-[var(--border)] bg-[#161419] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)]"
          />
        </label>

        {/* perguntas */}
        <div className="space-y-2.5">
          {PERGUNTAS.map((q, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[#161419] px-3.5 py-3"
            >
              <p className="flex-1 text-[13px] leading-snug text-[var(--text-secondary)]">
                {q}
              </p>
              <div className="flex shrink-0 gap-1.5">
                {([["Sim", true], ["Não", false]] as const).map(([lbl, val]) => (
                  <button
                    key={lbl}
                    onClick={() =>
                      setRespostas((r) => r.map((v, j) => (j === i ? val : v)))
                    }
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      respostas[i] === val
                        ? val
                          ? "bg-[#e06a54] text-[#1b0d09]"
                          : "bg-[var(--wpp)] text-[#04140a]"
                        : "border border-[var(--border-strong)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* assinatura */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              Assine com o dedo ou o mouse
            </span>
            <button
              onClick={limpar}
              className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Eraser size={12} /> limpar
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={520}
            height={120}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-[104px] w-full touch-none rounded-xl border border-dashed border-[var(--border-strong)] bg-[#161419]"
          />
        </div>
      </div>

      {/* rodapé */}
      <div className="border-t border-[var(--border)] p-4">
        <button
          onClick={() => completo && setEnviado(true)}
          disabled={!completo}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            completo
              ? "bg-[var(--wpp)] text-[#04140a] hover:bg-[var(--wpp-strong)]"
              : "cursor-not-allowed bg-white/[0.05] text-[var(--text-tertiary)]"
          }`}
        >
          <Check size={15} /> Enviar ficha
        </button>
      </div>
    </div>
  );
}
