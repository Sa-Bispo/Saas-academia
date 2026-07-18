import { DashboardMock } from "./dashboard-mock";

// Insets da tela medidos no PNG recortado (1545x952)
const INSET = { top: "5.042%", right: "10.162%", bottom: "13.655%", left: "9.515%" };
const SCREEN_W_FRAC = 1 - 0.09515 - 0.10162; // largura da tela / largura do laptop

export function LaptopMock({ width = 640 }: { width?: number }) {
  const scale = (width * SCREEN_W_FRAC) / 1000; // dashboard é desenhado em 1000px

  return (
    <div className="relative select-none" style={{ width }}>
      {/* dashboard atrás, na área da tela (a tela do PNG é transparente) */}
      <div className="absolute z-0 overflow-hidden" style={INSET}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <DashboardMock />
        </div>
      </div>

      {/* moldura do notebook por cima */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/laptop-mockup.png"
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
