import type { Metadata } from "next";

import { Nav } from "@/components/academia-landing/nav";
import { Hero } from "@/components/academia-landing/hero";
import { Showcase } from "@/components/academia-landing/showcase/showcase";
import { BentoFunciona } from "@/components/academia-landing/bento-funciona";
import { Pricing } from "@/components/academia-landing/pricing";
import { Footer } from "@/components/academia-landing/footer";
import { Divisor, Trilhos } from "@/components/academia-landing/grid-bits";

export const metadata: Metadata = {
  title: "PyraLabs · Gestão de academia no automático",
  description:
    "Bot de WhatsApp que atende 24h, cobrança automática via Pix e um painel único para matrícula, frequência e financeiro. A gestão da sua academia rodando sozinha.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Trilhos>
          <Divisor />
          <BentoFunciona />
          <Divisor />
          <Showcase />
          <Divisor />
          <Pricing />
        </Trilhos>
      </main>
      <Footer />
    </>
  );
}
