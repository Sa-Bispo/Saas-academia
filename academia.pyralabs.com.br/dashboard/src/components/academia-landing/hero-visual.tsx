import { PhoneMock } from "./phone-mock";
import { LaptopMock } from "./showcase/laptop-mock";

// Composição do hero: celular (chat) à esquerda na frente + notebook (dashboard) à direita.
export function HeroVisual() {
  return (
    <>
      {/* mobile: só o celular */}
      {/* mobile: celular menor sobre a foto da academia, que some nas bordas */}
      <div className="relative -mx-5 flex justify-center pt-2 sm:-mx-8 lg:hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_30%,transparent_75%)]"
          style={{ backgroundImage: "url(/academia_fundo.png)" }}
        />
        <div className="relative w-[268px]">
          <PhoneMock width={268} />
        </div>
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
