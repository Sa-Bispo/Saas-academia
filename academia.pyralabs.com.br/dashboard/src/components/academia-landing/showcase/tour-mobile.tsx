"use client";

// Tour guiado no celular: em vez da tela inteira encolhida (ilegível), uma "câmera"
// ampliada que desliza até o ponto ativo (①②③) e destaca o elemento com um contorno.
// Os pontos que vivem na tela sobreposta (celular do PAR-Q, ficha do aluno) mostram
// essa tela em destaque. "Ver tela inteira" mostra o todo e volta pro tour.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { PhoneMock } from "../phone-mock";
import type { Sobreposto } from "./print-sistema";

const ALTURA_JANELA = 340; // px da janela da câmera
const LARGURA_VISIVEL = 430; // px (no tamanho real da tela) que cabem na janela
const ANIM = "transform 750ms cubic-bezier(0.22, 1, 0.36, 1)";

type Alvo = { x: number; y: number; w: number; h: number };

export function TourMobile({
  tela,
  largura,
  alturaMax,
  url,
  sobreposto,
  marcas,
  ativo,
  onAtivo,
}: {
  tela: ReactNode;
  largura: number;
  alturaMax?: number;
  url: string;
  sobreposto?: Sobreposto;
  marcas: number[];
  ativo: number | null;
  onAtivo: (n: number) => void;
}) {
  const janela = useRef<HTMLDivElement>(null);
  const camada = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(340);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [alturaTela, setAlturaTela] = useState(800);
  const [inteira, setInteira] = useState(false);

  const foco = ativo ?? marcas[0] ?? 1;
  const focoNoSobreposto = sobreposto?.marca === foco;

  const z = inteira ? vw / largura : vw / LARGURA_VISIVEL;

  // mede o alvo no tamanho real (divide pela escala atual da camada)
  const medir = useCallback(() => {
    const j = janela.current;
    const c = camada.current;
    if (!j || !c) return;
    setVw(j.clientWidth);
    const h = c.offsetHeight;
    setAlturaTela(alturaMax ? Math.min(h, alturaMax) : h);
    const el = c.querySelector<HTMLElement>(`[data-marca="${foco}"]`);
    if (!el) return setAlvo(null);
    const rc = c.getBoundingClientRect();
    const s = rc.width / largura || 1;
    const r = el.getBoundingClientRect();
    setAlvo({ x: (r.left - rc.left) / s, y: (r.top - rc.top) / s, w: r.width / s, h: r.height / s });
  }, [foco, largura, alturaMax]);

  useLayoutEffect(() => {
    medir();
    const ro = new ResizeObserver(medir);
    if (janela.current) ro.observe(janela.current);
    if (camada.current) ro.observe(camada.current);
    const mo = new MutationObserver(medir);
    if (camada.current) mo.observe(camada.current, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-marca"] });
    const t = setTimeout(medir, 1200);
    return () => {
      ro.disconnect();
      mo.disconnect();
      clearTimeout(t);
    };
  }, [medir]);

  // posição da câmera: centraliza o alvo, sem sair da tela
  let tx = 0;
  let ty = 0;
  const alturaJanela = inteira ? Math.round(alturaTela * z) : ALTURA_JANELA;
  if (!inteira && alvo) {
    const minX = vw - largura * z;
    const minY = ALTURA_JANELA - alturaTela * z;
    // alvo um pouco à direita do centro: sobra contexto à esquerda (nome, valor...)
    tx = Math.min(0, Math.max(minX, vw * 0.6 - (alvo.x + Math.min(alvo.w, LARGURA_VISIVEL) / 2) * z));
    ty = Math.min(0, Math.max(minY, ALTURA_JANELA * 0.38 - (alvo.y + alvo.h / 2) * z));
  }

  // contorno do alvo (em coordenadas da janela)
  // contorno do alvo, limitado às bordas da janela (alvos largos não somem pela lateral)
  let contorno: { left: number; top: number; width: number; height: number } | null = null;
  if (!inteira && alvo && !focoNoSobreposto) {
    const l = Math.max(4, tx + alvo.x * z - 6);
    const t = Math.max(4, ty + alvo.y * z - 6);
    const r = Math.min(vw - 4, tx + (alvo.x + alvo.w) * z + 6);
    const b = Math.min(ALTURA_JANELA - 4, ty + (alvo.y + alvo.h) * z + 6);
    contorno = { left: l, top: t, width: Math.max(0, r - l), height: Math.max(0, b - t) };
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[560px]">
      <div className="overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[#0b0b0d] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        {/* barra do navegador */}
        <div className="flex h-8 items-center gap-2 border-b border-[var(--border)] bg-[#141418] px-3">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="ml-2 truncate rounded-md bg-white/[0.05] px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10.5px] text-[var(--text-tertiary)]">
            {url}
          </span>
        </div>

        {/* janela da câmera */}
        <div
          ref={janela}
          className="relative overflow-hidden"
          style={{ height: alturaJanela, transition: "height 500ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <div
            ref={camada}
            aria-hidden
            inert
            className="dark pointer-events-none absolute left-0 top-0 origin-top-left select-none bg-background font-sans text-foreground"
            style={{ width: largura, transform: `translate(${tx}px, ${ty}px) scale(${z})`, transition: ANIM }}
          >
            {tela}
          </div>

          {/* contorno no elemento do ponto ativo */}
          {contorno && (
            <span
              className="pointer-events-none absolute rounded-xl border-2 border-[var(--wpp)] shadow-[0_0_0_4px_rgba(37,211,102,0.22),0_0_0_9999px_rgba(0,0,0,0.5)]"
              style={{ ...contorno, transition: "all 750ms cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          )}

          {/* ponto na tela sobreposta: mostra ela em destaque por cima */}
          {sobreposto && (
            <div
              className={`absolute inset-0 flex items-start justify-center bg-black/55 px-6 pt-4 backdrop-blur-[2px] transition-opacity duration-500 ${
                focoNoSobreposto && !inteira ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {sobreposto.tipo === "celular" ? (
                <div className="w-[56%] max-w-[230px]">
                  <PhoneMock width={230} glow={false} alt="Ficha PAR-Q no celular do aluno">
                    <CamadaFixa largura={sobreposto.largura}>{sobreposto.tela}</CamadaFixa>
                  </PhoneMock>
                </div>
              ) : (
                <div className="w-full overflow-hidden rounded-2xl border border-[var(--border-strong)]">
                  <CamadaFixa largura={sobreposto.largura}>{sobreposto.tela}</CamadaFixa>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* controles do tour */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          {marcas.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setInteira(false);
                onAtivo(n);
              }}
              aria-label={`Ver o ponto ${n}`}
              className={`flex size-8 items-center justify-center rounded-full font-[family-name:var(--font-space-mono)] text-xs font-bold transition-colors ${
                foco === n && !inteira ? "bg-[var(--wpp)] text-[#04140a]" : "border border-[var(--border-strong)] text-[var(--text-secondary)]"
              }`}
            >
              {n}
            </button>
          ))}
          <span className="ml-1 text-[12px] text-[var(--text-tertiary)]">toque pra navegar</span>
        </div>
        <button
          type="button"
          onClick={() => setInteira((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)]"
        >
          {inteira ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          {inteira ? "voltar" : "tela inteira"}
        </button>
      </div>
    </div>
  );
}

// tela sobreposta (celular/ficha) na largura do contêiner, escala automática
function CamadaFixa({ largura, children }: { largura: number; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);
  useEffect(() => {
    const medir = () => setS((caixa.current?.clientWidth ?? largura) / largura);
    medir();
    const ro = new ResizeObserver(medir);
    if (caixa.current) ro.observe(caixa.current);
    return () => ro.disconnect();
  }, [largura]);
  return (
    <div ref={caixa} className="relative h-full w-full overflow-hidden" style={{ minHeight: 300 }}>
      <div
        aria-hidden
        inert
        className="dark pointer-events-none absolute left-0 top-0 origin-top-left select-none bg-background font-sans text-foreground"
        style={{ width: largura, transform: `scale(${s})` }}
      >
        {children}
      </div>
    </div>
  );
}
