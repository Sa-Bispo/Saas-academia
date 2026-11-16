"use client";

// Tela do sistema numa moldura de navegador. A tela é uma réplica em HTML/CSS
// (showcase/telas/*), desenhada no tamanho real e reduzida por escala: fica nítida em
// qualquer tela. Os marcadores numerados (①②③) se ancoram no canto dos elementos com
// `data-marca="n"` e batem com a lista de pontos do texto.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PhoneMock } from "../phone-mock";
import { Escala } from "./telas/escala";
import { TourMobile } from "./tour-mobile";

export type Sobreposto = {
  tela: ReactNode;
  largura: number;
  alturaMax?: number;
  // posição/tamanho da caixa sobreposta (classes Tailwind, relativas à moldura)
  className: string;
  // moldura da sobreposição: "celular" (iPhone) ou "cartao" (modal solto)
  tipo: "celular" | "cartao";
  // número do ponto que mora nessa tela (o tour do celular mostra ela em destaque)
  marca?: number;
};

// celular/tablet (sem hover): tour guiado em vez da tela inteira encolhida
function useMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const atualizar = () => setMobile(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);
  return mobile;
}

type Ponto = { n: number; x: number; y: number };

function Marcador({ n, ativo, x, y }: { n: number; ativo: boolean; x: number; y: number }) {
  return (
    <span
      style={{ left: x, top: y }}
      className={`pointer-events-none absolute z-30 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-[family-name:var(--font-space-mono)] text-[11px] font-bold text-[#04140a] shadow-[0_0_0_4px_rgba(37,211,102,0.22)] transition-transform duration-300 sm:size-7 sm:text-xs ${
        ativo ? "scale-125 bg-white" : "bg-[var(--wpp)]"
      }`}
    >
      {n}
      {ativo && <span className="absolute inset-0 animate-ping rounded-full bg-white/50" />}
    </span>
  );
}

export function PrintSistema({
  tela,
  largura,
  alturaMax,
  url,
  sobreposto,
  ativo,
  marcas = [],
  onAtivo,
}: {
  tela: ReactNode;
  largura: number;
  alturaMax?: number;
  url: string;
  sobreposto?: Sobreposto;
  ativo: number | null;
  marcas?: number[];
  onAtivo?: (n: number) => void;
}) {
  const mobile = useMobile();
  const raiz = useRef<HTMLDivElement>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);

  // mede a posição dos elementos marcados (depois da escala) e remede ao redimensionar
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const medir = () => {
      const base = el.getBoundingClientRect();
      // o zoom do hover é um transform: divide pela escala atual pra medir no tamanho normal
      const z = el.offsetWidth ? base.width / el.offsetWidth : 1;
      const achados = [...el.querySelectorAll<HTMLElement>("[data-marca]")].map((m) => {
        const r = m.getBoundingClientRect();
        return { n: Number(m.dataset.marca), x: (r.left - base.left) / z, y: (r.top - base.top) / z };
      });
      setPontos(achados);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    // telas que montam depois (carregadas sob demanda) ou marcam alvos depois
    const mo = new MutationObserver(medir);
    mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-marca"] });
    document.fonts?.ready.then(medir);
    // depois das animações de entrada das telas
    const t = setTimeout(medir, 1200);
    return () => {
      ro.disconnect();
      mo.disconnect();
      clearTimeout(t);
    };
  }, []);

  if (mobile) {
    return (
      <TourMobile
        tela={tela}
        largura={largura}
        alturaMax={alturaMax}
        url={url}
        sobreposto={sobreposto}
        marcas={marcas}
        ativo={ativo}
        onAtivo={(n) => onAtivo?.(n)}
      />
    );
  }

  return (
    // zoom no hover (só desktop): a tela cresce por cima da coluna do texto pra ler melhor
    <div
      ref={raiz}
      className="zoom-tela relative mx-auto w-full max-w-[720px] origin-right pb-6 sm:pb-8"
    >
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
        <Escala largura={largura} alturaMax={alturaMax}>
          {tela}
        </Escala>
      </div>

      {sobreposto && (
        <div className={`absolute z-10 ${sobreposto.className}`}>
          {sobreposto.tipo === "celular" ? (
            // a mesma moldura de iPhone do hero, com uma sombra escura atrás que apaga em
            // degradê o que fica cortado da tela de fundo (em vez de texto pela metade)
            <>
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-[45%] -inset-y-[12%] -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(11,11,13,0.92),rgba(11,11,13,0.55)_60%,transparent)]"
            />
            <PhoneMock width={400} glow={false} alt="Ficha PAR-Q no celular do aluno">
              <Escala largura={sobreposto.largura} className="h-full">
                {sobreposto.tela}
              </Escala>
            </PhoneMock>
            </>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.95)]">
              <Escala largura={sobreposto.largura} alturaMax={sobreposto.alturaMax}>
                {sobreposto.tela}
              </Escala>
              {/* recortado: some suave embaixo em vez de cortar seco */}
              {sobreposto.alturaMax && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#141317] to-transparent" />
              )}
            </div>
          )}
        </div>
      )}

      {pontos.map((p) => (
        <Marcador key={p.n} n={p.n} ativo={ativo === p.n} x={p.x} y={p.y} />
      ))}
    </div>
  );
}
