import { BotChatMock } from "./bot-chat-mock";

// Insets da tela medidos no PNG recortado colado no frame (702x1450)
const SCREEN = {
  top: "2.069%",
  right: "3.134%",
  bottom: "2.345%",
  left: "3.419%",
};

export function PhoneMock({ width = 320 }: { width?: number }) {
  return (
    <div
      className="relative isolate w-full"
      style={{ maxWidth: width }}
    >
      {/* Brilho ambiente respirando atrás do celular — maior que o aparelho pra vazar pelas bordas */}
      <div className="phone-glow pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[92%] w-[135%] rounded-[50%]" />

      {/* Chat na área da tela, ATRÁS da moldura (a tela do PNG é transparente) */}
      <div
        className="absolute z-0 overflow-hidden rounded-[34px]"
        style={{
          top: SCREEN.top,
          right: SCREEN.right,
          bottom: SCREEN.bottom,
          left: SCREEN.left,
        }}
      >
        <BotChatMock bare />
      </div>

      {/* Moldura do iPhone por cima, com sombra limpa que segue o contorno */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/phone-mockup.png"
        alt="Demonstração do assistente PyraLabs no WhatsApp"
        className="pointer-events-none relative z-10 w-full select-none"
        draggable={false}
        style={{
          filter:
            "drop-shadow(14px 34px 44px rgba(0,0,0,0.6)) drop-shadow(4px 12px 18px rgba(0,0,0,0.45))",
        }}
      />
    </div>
  );
}
