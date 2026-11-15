import type { ReactNode } from "react";
import { BotChatMock } from "./bot-chat-mock";

// Insets da tela medidos no PNG recortado colado no frame (702x1450)
const SCREEN = {
  top: "2.069%",
  right: "3.134%",
  bottom: "2.345%",
  left: "3.419%",
};

// Sem children: mostra o chat do bot (hero). Com children: qualquer tela (ex.: PAR-Q).
// A moldura é pointer-events-none, então a tela embaixo continua clicável.
export function PhoneMock({
  width = 320,
  children,
  glow = true,
  alt = "Demonstração do assistente PyraLabs no WhatsApp",
}: {
  width?: number;
  children?: ReactNode;
  glow?: boolean;
  alt?: string;
}) {
  return (
    <div
      className="relative isolate w-full"
      style={{ maxWidth: width }}
    >
      {/* Brilho ambiente respirando atrás do celular — maior que o aparelho pra vazar pelas bordas */}
      {glow && (
        <div className="phone-glow pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[92%] w-[135%] rounded-[50%]" />
      )}

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
        {children ?? <BotChatMock bare />}
      </div>

      {/* Moldura do iPhone por cima, com sombra limpa que segue o contorno */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/phone-mockup.webp"
        srcSet="/phone-mockup-sm.webp 351w, /phone-mockup.webp 702w"
        sizes={`${width}px`}
        width={702}
        height={1450}
        decoding="async"
        alt={alt}
        className="pointer-events-none relative z-10 h-auto w-full select-none"
        draggable={false}
        style={{
          filter:
            "drop-shadow(14px 34px 44px rgba(0,0,0,0.6)) drop-shadow(4px 12px 18px rgba(0,0,0,0.45))",
        }}
      />
    </div>
  );
}
