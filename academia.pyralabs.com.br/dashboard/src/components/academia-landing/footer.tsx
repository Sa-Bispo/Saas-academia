"use client";

import RidgelineDitherFooter from "./ridgeline-footer";
import { Logo } from "./logo";
import { site, whatsappLink } from "@/components/academia-landing/site";

// Rodapé com a cordilheira em dither (21st.dev "ridgeline-dither-footer"), na paleta da
// landing: fundo #0b0b0d, montanhas em verde escuro discreto e hover no verde do WhatsApp.
export function Footer() {
  return (
    <RidgelineDitherFooter
      name="PyraLabs"
      brandHref="/"
      logo={<Logo size={26} />}
      tagline="Sistema de gestão pra academia de bairro: alunos, PAR-Q digital e cobrança no WhatsApp, num painel só."
      columns={[
        {
          title: "Produto",
          links: [
            { label: "Recursos", href: "#recursos" },
            { label: "Como funciona", href: "#como-funciona" },
            { label: "Preço", href: "#planos" },
          ],
        },
        {
          title: "Planos",
          links: [
            { label: "Gestão", href: "#planos" },
            { label: "Cobrança", href: "#planos", shine: true },
            { label: "Completo", href: "#planos" },
          ],
        },
        {
          title: "Contato",
          links: [
            { label: "WhatsApp", href: whatsappLink(), external: true },
            { label: "E-mail", href: `mailto:${site.email}` },
            { label: "Entrar no painel", href: site.appUrl },
          ],
        },
      ]}
      socials={[]}
      copyright={`© ${new Date().getFullYear()} PyraLabs. Todos os direitos reservados.`}
      credit={null}
      preset="night"
      palette={{
        paper: "#0b0b0d",
        ink: "#f2f0ec",
        muted: "#9a9aa2",
        line: "rgba(255,255,255,0.08)",
        heart: "#e5484d",
        accent: "#25d366",
        tones: ["#0b0b0d", "#0f1412", "#14201a", "#1b3024", "#244430", "#325f42", "#467f58"],
      }}
      seed={23}
      ridges={7}
      altimeter={false}
      maxWidth="1216px"
      height="620px"
      fontFamily="var(--font-barlow), system-ui, sans-serif"
      monoFamily="var(--font-space-mono), ui-monospace, monospace"
    />
  );
}
