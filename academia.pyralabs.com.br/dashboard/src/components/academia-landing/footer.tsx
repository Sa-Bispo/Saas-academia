import { Logo } from "./logo";
import { nav, site, whatsappLink } from "@/components/academia-landing/site";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="font-display text-[16px] font-bold uppercase tracking-tight">
                PyraLabs
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-tertiary)]">
              Automação de gestão para academias. Bot de WhatsApp, cobrança
              automática e painel único.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Produto
              </p>
              <ul className="mt-4 space-y-2.5">
                {nav.map((n) => (
                  <li key={n.href}>
                    <a
                      href={n.href}
                      className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Contato
              </p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a
                    href={whatsappLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${site.email}`}
                    className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {site.email}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Acesso
              </p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a
                    href={site.appUrl}
                    className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Entrar no painel
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-tertiary)] sm:flex-row">
          <p>© {new Date().getFullYear()} PyraLabs. Todos os direitos reservados.</p>
          <p>Feito para donos de academia.</p>
        </div>
      </div>
    </footer>
  );
}
