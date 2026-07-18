import type { Metadata } from "next";

import { Nav } from "@/components/academia-landing/nav";
import { Hero } from "@/components/academia-landing/hero";
import { Stats } from "@/components/academia-landing/stats";
import { Showcase } from "@/components/academia-landing/showcase/showcase";
import { HowItWorks } from "@/components/academia-landing/how-it-works";
import { CobrancaSpotlight } from "@/components/academia-landing/cobranca-spotlight";
import { Proof } from "@/components/academia-landing/proof";
import { Pricing } from "@/components/academia-landing/pricing";
import { FinalCta } from "@/components/academia-landing/final-cta";
import { Footer } from "@/components/academia-landing/footer";

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
        <Stats />
        <Showcase />
        <HowItWorks />
        <CobrancaSpotlight />
        <Proof />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
