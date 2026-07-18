export function Logo({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/pyra_transparent.png"
      alt="PyraLabs"
      width={size}
      className="object-contain"
      // neutraliza o roxo da marca -> giz, pra harmonizar com a paleta quente
      style={{
        width: size,
        height: "auto",
        filter: "brightness(0) invert(0.94)",
      }}
    />
  );
}
