import { PhoneMock } from "./phone-mock";
import { LaptopMock } from "./showcase/laptop-mock";

// Composição do hero: celular (chat) à esquerda na frente + notebook (dashboard) à direita.
export function HeroVisual() {
  return (
    <>
      {/* mobile: só o celular */}
      <div className="flex justify-center lg:hidden">
        <PhoneMock />
      </div>

      {/* desktop: celular à esquerda + laptop à direita (conjunto escalado como um todo) */}
      <div
        className="relative mx-auto hidden h-[560px] w-full max-w-[820px] origin-center lg:block"
        style={{ transform: "scale(0.85)" }}
      >
        {/* laptop (dashboard) à direita, atrás — sangra pela direita */}
        <div className="absolute left-[248px] top-1/2 z-0 -translate-y-1/2">
          <LaptopMock width={700} />
        </div>

        {/* celular (chat) à esquerda, na frente */}
        <div className="absolute bottom-0 left-0 z-20 w-[310px]">
          <PhoneMock width={310} />
        </div>
      </div>
    </>
  );
}
