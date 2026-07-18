import Link from "next/link";

const footerSections = [
  {
    title: "PRODUTO",
    links: [
      { label: "Funcionalidades", href: "/#" },
      { label: "Preços", href: "/#precos" },
      { label: "Atualizações", href: "#" },
    ],
  },
  {
    title: "SOLUÇÕES",
    links: [
      { label: "Adega de Bairro", href: "/#adega" },
      { label: "Lanchonete", href: "/#lanchonete" },
      { label: "Pizzaria", href: "/#pizzaria" },
      { label: "Restaurantes", href: "/" },
    ],
  },
  {
    title: "EMPRESA",
    links: [
      { label: "Sobre nós", href: "#" },
      { label: "Contato", href: "#" },
      { label: "Trabalhe conosco", href: "#" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Termos de Uso", href: "#" },
      { label: "Política de Privacidade", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#000000] text-slate-400 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Todos os sistemas operacionais
          </div>

          <p className="text-xs text-slate-500">© 2026 Pyra Labs. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
