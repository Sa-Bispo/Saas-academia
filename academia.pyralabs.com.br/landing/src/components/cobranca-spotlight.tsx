import { Check } from "lucide-react";
import { Button } from "./button";
import { whatsappLink } from "@/lib/site";

const bullets = [
  "Dispara sozinho para quem vai vencer e para inadimplentes",
  "Pix gerado dentro da conversa, sem app de banco",
  "Baixa automática assim que o pagamento cai",
  "Opção de pagar em dinheiro com código na recepção",
];

const rows = [
  { nome: "Ana Souza", status: "Pago", cor: "var(--wpp)" },
  { nome: "Marcos Lima", status: "Aguardando", cor: "var(--accent-strong)" },
  { nome: "Júlia Reis", status: "Cobrado hoje", cor: "var(--text-tertiary)" },
  { nome: "Pedro Alves", status: "Pago", cor: "var(--wpp)" },
];

export function CobrancaSpotlight() {
  return (
    <section id="cobranca" className="py-24 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Financeiro
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-tight sm:text-[40px]">
            A mensalidade que se cobra sozinha
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Chega de sair atrás de aluno inadimplente. O sistema identifica quem
            está para vencer, envia a cobrança no WhatsApp e confirma o pagamento
            sem você mexer um dedo.
          </p>

          <ul className="mt-7 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <Check size={12} strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Button variant="wpp" size="lg" href={whatsappLink()} external>
              Quero automatizar minha cobrança
            </Button>
          </div>
        </div>

        {/* mock painel de cobranças */}
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Cobranças de julho</p>
              <p className="text-xs text-[var(--text-tertiary)]">Atualizado agora</p>
            </div>
            <span className="rounded-full bg-[rgba(37,211,102,0.12)] px-2.5 py-1 text-xs font-medium text-[var(--wpp)]">
              <span className="font-mono">82%</span> recebido
            </span>
          </div>

          <div className="px-5 py-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[var(--wpp)]"
                style={{ width: "82%" }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>
                <span className="font-mono text-[var(--text-secondary)]">R$ 9.840</span> recebidos
              </span>
              <span>
                meta <span className="font-mono">R$ 12.000</span>
              </span>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {rows.map((r) => (
              <div key={r.nome} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-xs font-medium text-[var(--text-secondary)]">
                    {r.nome.charAt(0)}
                  </div>
                  <span className="text-sm">{r.nome}</span>
                </div>
                <span
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: r.cor }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: r.cor }}
                  />
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
