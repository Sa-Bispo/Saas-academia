
// Insets da tela medidos no PNG recortado (1545x952)
const INSET = { top: "5.042%", right: "10.162%", bottom: "13.655%", left: "9.515%" };
const SCREEN_W_FRAC = 1 - 0.09515 - 0.10162; // largura da tela / largura do laptop

export function LaptopMock({ width = 640 }: { width?: number }) {
  // print real do painel com a barra lateral (dados fictícios da Academia Demo).
  // object-contain pela largura: o print (1,82) é mais largo que a tela (1,60); com cover
  // a direita era cortada. A faixa de baixo fica no fundo do painel (#0b0b0d).
  const telaW = Math.round(width * SCREEN_W_FRAC);

  return (
    <div className="relative select-none" style={{ width }}>
      {/* tela atrás da moldura (a tela do PNG é transparente) */}
      <div className="absolute z-0 overflow-hidden bg-[#0b0b0d]" style={INSET}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sistema/painel-hero-sm.webp"
          srcSet="/sistema/painel-hero-sm.webp 1200w, /sistema/painel-hero.webp 1919w"
          sizes={`${telaW}px`}
          alt="Visão geral do painel da academia"
          className="h-full w-full object-contain object-top"
          draggable={false}
        />
      </div>

      {/* moldura do notebook por cima */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/laptop-mockup.webp"
        alt="Dashboard PyraLabs"
        draggable={false}
        className="pointer-events-none relative z-10 w-full"
        style={{
          filter: "drop-shadow(0 24px 40px rgba(0,0,0,0.55))",
        }}
      />
    </div>
  );
}
