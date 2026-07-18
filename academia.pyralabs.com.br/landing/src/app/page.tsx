import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { Stats } from "@/components/stats";
import { Showcase } from "@/components/showcase/showcase";
import { HowItWorks } from "@/components/how-it-works";
import { CobrancaSpotlight } from "@/components/cobranca-spotlight";
import { Proof } from "@/components/proof";
import { Pricing } from "@/components/pricing";
import { FinalCta } from "@/components/final-cta";
import { Footer } from "@/components/footer";

export default function Home() {
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
