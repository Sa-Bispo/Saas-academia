import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  Clock,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

// TODO: troque pelo número real de WhatsApp da PyraLabs (formato 55DDXXXXXXXXX, sem espaços/símbolos).
const WHATSAPP_NUMBER = "5500000000000";

function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const metadata: Metadata = {
  title: "Pyra para Academias — Atendimento no WhatsApp com IA + Cobrança Automática",
  description:
    "Bot de IA que responde seus alunos no WhatsApp 24h, cobra mensalidade atrasada automaticamente via Pix e organiza tudo em um painel só. Feito para donos de academia.",
};

const PROBLEMAS = [
  {
    titulo: "Aluno manda mensagem fora do horário e ninguém responde",
    descricao:
      "Dúvida sobre plano, horário de aula ou congelamento chega de noite, no fim de semana — e só é respondida (se for) no outro dia.",
  },
  {
    titulo: "Cobrança de mensalidade atrasada é manual, um por um",
    descricao:
      "Você (ou alguém da equipe) precisa lembrar quem está devendo, mandar mensagem, cobrar comprovante e dar baixa manualmente.",
  },
  {
    titulo: "Sem visão clara de quem está ativo, inadimplente ou saiu",
    descricao:
      "A informação de aluno fica espalhada entre caderno, planilha e WhatsApp pessoal — difícil saber a real saúde da carteira de alunos.",
  },
];

const FEATURES_SECUNDARIAS = [
  {
    icon: Wallet,
    titulo: "Cobrança automática via Pix",
    descricao:
      "Dispara cobrança em lote para quem está pendente ou vencido, gera o Pix e recebe o comprovante direto na conversa do aluno.",
  },
  {
    icon: Receipt,
    titulo: "Validação de pagamento com 1 clique",
    descricao:
      "O comprovante chega no painel como “aguardando validação”. Você confirma com um clique e o status do aluno atualiza sozinho.",
  },
  {
    icon: Users,
    titulo: "Gestão de alunos e matrículas",
    descricao:
      "Cadastro de aluno, plano e status (ativo, inadimplente, inativo, suspenso) sempre atualizado, sem planilha paralela.",
  },
  {
    icon: Calendar,
    titulo: "Controle de frequência",
    descricao:
      "Histórico de presença dos últimos dias pra você entender engajamento e identificar quem está sumindo da academia.",
  },
];

const COMO_FUNCIONA = [
  {
    numero: "01",
    titulo: "O aluno manda mensagem no WhatsApp da academia",
    descricao: "No número que você já usa hoje — não precisa trocar de número nem instalar app novo.",
  },
  {
    numero: "02",
    titulo: "O bot de IA responde, tira a dúvida ou direciona a cobrança",
    descricao: "Horário de funcionamento, plano, status de mensalidade, geração de Pix — tudo automático.",
  },
  {
    numero: "03",
    titulo: "Você acompanha tudo em um painel só",
    descricao: "Sem precisar ficar com o celular na mão o dia inteiro respondendo aluno.",
  },
];

type Plano = {
  nome: string;
  preco: string;
  destaque?: boolean;
  descricao: string;
  features: string[];
};

const PLANOS: Plano[] = [
  {
    nome: "Básico",
    preco: "R$ 147",
    descricao: "Pra começar a automatizar o atendimento.",
    features: [
      "Bot de IA respondendo no WhatsApp 24h",
      "Até 150 alunos ativos",
      "Cadastro e status de alunos",
      "Cobrança com lembrete manual",
    ],
  },
  {
    nome: "Pro",
    preco: "R$ 247",
    destaque: true,
    descricao: "O mais escolhido por quem quer parar de cobrar aluno na mão.",
    features: [
      "Tudo do Básico",
      "Cobrança automática em lote via Pix",
      "Validação de comprovante com 1 clique",
      "Controle de frequência",
      "Até 400 alunos ativos",
    ],
  },
  {
    nome: "Premium",
    preco: "R$ 397",
    descricao: "Pra academia com base maior de alunos.",
    features: [
      "Tudo do Pro",
      "Alunos ilimitados",
      "Relatórios completos",
      "Suporte prioritário",
    ],
  },
];

const FAQ = [
  {
    pergunta: "Preciso trocar o número de WhatsApp da academia?",
    resposta:
      "Não. A conexão é feita no número que você já usa hoje, via Evolution API/WhatsApp Business — seus alunos continuam falando com o mesmo contato de sempre.",
  },
  {
    pergunta: "O bot realmente consegue cobrar aluno atrasado?",
    resposta:
      "Sim. No painel você dispara a cobrança em lote para quem está pendente ou vencido, com um intervalo entre os envios. O aluno recebe o valor e a chave Pix no WhatsApp, manda o comprovante na própria conversa, e você valida com um clique.",
  },
  {
    pergunta: "E se o bot não souber responder alguma pergunta do aluno?",
    resposta:
      "O bot foi treinado com as informações da sua academia (horários, planos, regras). Para perguntas fora desse contexto, a conversa fica registrada para você revisar e ajustar a resposta.",
  },
  {
    pergunta: "Quanto tempo leva para colocar no ar?",
    resposta:
      "O onboarding é guiado: você cadastra os dados da academia, conecta o WhatsApp e já começa a usar. Fale com a gente para combinar o prazo certo pro seu caso.",
  },
  {
    pergunta: "Tem contrato de fidelidade?",
    resposta:
      "Fale com a gente pelo WhatsApp para conhecer as condições atuais do plano que mais combina com o tamanho da sua academia.",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,168,132,0.18),rgba(0,168,132,0.03)_55%,transparent_70%)] blur-2xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-lg shadow-brand/20">
              <Zap size={18} className="text-slate-950" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-foreground">Pyra</span>
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted">by PyraLabs</span>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#bot" className="transition hover:text-foreground">
              Atendimento IA
            </a>
            <a href="#como-funciona" className="transition hover:text-foreground">
              Como funciona
            </a>
            <a href="#precos" className="transition hover:text-foreground">
              Preços
            </a>
            <a href="#faq" className="transition hover:text-foreground">
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-muted transition hover:text-foreground sm:inline">
              Já é cliente? Entrar
            </Link>
            <a
              href={whatsappLink("Oi! Vi a página da Pyra e quero saber mais sobre o sistema para academia.")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong"
            >
              <MessageCircle size={15} />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-14 sm:px-8 sm:pt-20 lg:flex-row lg:items-center lg:px-10 lg:pb-24">
        <div className="flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            <Sparkles size={13} />
            Feito para academias
          </span>

          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Sua academia respondendo no WhatsApp 24h — mesmo enquanto você dorme.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
            Um bot de IA tira dúvida de aluno a qualquer hora, e um painel organiza matrícula, frequência e cobrança de
            mensalidade — com disparo automático de Pix pra quem está atrasado.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={whatsappLink("Oi! Quero ver uma demonstração do sistema da Pyra para academia.")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong"
            >
              Falar no WhatsApp
              <ArrowRight size={15} />
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand"
            >
              Ver como funciona
            </a>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6 sm:max-w-md">
            <div>
              <p className="text-2xl font-semibold text-foreground">24h</p>
              <p className="text-xs text-muted">Atendimento sem pausa</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">Pix</p>
              <p className="text-xs text-muted">Cobrança automática</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">1 painel</p>
              <p className="text-xs text-muted">Pra tudo da academia</p>
            </div>
          </div>
        </div>

        {/* Mockup de conversa no WhatsApp */}
        <div className="flex-1">
          <div className="mx-auto max-w-sm rounded-3xl border border-line bg-[linear-gradient(155deg,rgba(255,255,255,0.05),rgba(9,17,26,0.9))] p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2.5 border-b border-line pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-brand">
                <Bot size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Academia • Atendimento</p>
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  online agora
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-brand/15 px-3.5 py-2 text-foreground">
                Oi, vcs abrem hoje até que horas?
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2 text-foreground">
                Oi! Hoje funcionamos até as 22h 💪 Quer que eu confira o status da sua mensalidade também?
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-brand/15 px-3.5 py-2 text-foreground">
                quero, acho que tá vencida
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2 text-foreground">
                Confirmado: venceu dia 15. Aqui está o Pix de R$ 120,00 — manda o comprovante aqui mesmo que eu já dou
                baixa ✅
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problema */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8 lg:px-10">
        <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Por que sua academia perde tempo (e aluno) hoje
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {PROBLEMAS.map((p) => (
            <article key={p.titulo} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-sm font-semibold text-foreground">{p.titulo}</h3>
              <p className="mt-2.5 text-sm leading-6 text-muted">{p.descricao}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Destaque: Atendimento IA 24h */}
      <section id="bot" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8 lg:px-10">
        <article className="relative overflow-hidden rounded-3xl border border-brand/30 bg-[linear-gradient(150deg,rgba(0,168,132,0.14),rgba(9,17,26,0.94))] p-8 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            <Bot size={14} />
            O coração do sistema
          </span>
          <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            Atendimento automático 24 horas, direto no WhatsApp da academia
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Horário de funcionamento, planos disponíveis, status de matrícula, dúvidas frequentes — o bot de IA
            responde sozinho, no número que seus alunos já conhecem. Sem app novo, sem atendente de madrugada, sem
            aluno esperando até o outro dia pra ter uma resposta.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Responde fora do horário comercial, fim de semana e feriado",
              "Reconhece o aluno e consulta status de matrícula e pagamento",
              "Direciona pra cobrança automática quando identifica pendência",
              "Registra o que não souber responder, pra você revisar depois",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Features secundárias */}
      <section id="cobranca" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8 lg:px-10">
        <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          E quando o assunto é dinheiro, o painel cuida do resto
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES_SECUNDARIAS.map((f) => {
            const Icon = f.icon;
            return (
              <article key={f.titulo} className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon size={17} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{f.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{f.descricao}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8 lg:px-10">
        <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Como funciona</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {COMO_FUNCIONA.map((passo) => (
            <div key={passo.numero} className="relative rounded-2xl border border-line bg-surface p-6">
              <span className="text-3xl font-bold text-brand/40">{passo.numero}</span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{passo.titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{passo.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-brand">
            <Clock size={14} />
            Sem necessidade de trocar de número
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Planos simples, sem letra miúda
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Valores de referência — fale com a gente pra confirmar a condição certa pro tamanho da sua academia.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {PLANOS.map((plano) => (
            <article
              key={plano.nome}
              className={
                plano.destaque
                  ? "relative flex flex-col rounded-3xl border border-brand/50 bg-[linear-gradient(155deg,rgba(0,168,132,0.14),rgba(9,17,26,0.94))] p-7 shadow-2xl shadow-brand/15 sm:scale-105"
                  : "relative flex flex-col rounded-3xl border border-line bg-[linear-gradient(155deg,rgba(255,255,255,0.05),rgba(9,17,26,0.92))] p-7"
              }
            >
              {plano.destaque && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-1 text-xs font-bold text-slate-950">
                  Mais escolhido
                </span>
              )}

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand/80">{plano.nome}</p>
              <div className="mt-4 flex items-end gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-foreground">{plano.preco}</span>
                <span className="pb-1 text-sm text-muted">/mês</span>
              </div>
              <p className="mt-2 text-sm text-muted">{plano.descricao}</p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plano.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check size={11} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={whatsappLink(`Oi! Quero assinar o plano ${plano.nome} (${plano.preco}/mês) da Pyra para academia.`)}
                className={
                  plano.destaque
                    ? "mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong"
                    : "mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold text-foreground transition hover:border-brand/35 hover:text-brand"
                }
              >
                Quero esse plano
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-8 lg:px-10">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Dúvidas frequentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.pergunta}
              className="group rounded-2xl border border-line bg-surface p-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
                {item.pergunta}
                <span className="shrink-0 text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted">{item.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-8 lg:px-10">
        <article className="flex flex-col items-center gap-5 rounded-3xl border border-brand/30 bg-[linear-gradient(150deg,rgba(0,168,132,0.14),rgba(9,17,26,0.94))] p-10 text-center">
          <ShieldCheck className="text-brand" size={28} />
          <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Pronto pra parar de perder aluno por demora na resposta?
          </h2>
          <a
            href={whatsappLink("Oi! Quero colocar a Pyra pra atender minha academia no WhatsApp.")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong"
          >
            <MessageCircle size={16} />
            Falar no WhatsApp agora
          </a>
        </article>
      </section>

      {/* Footer */}
      <footer className="border-t border-line px-4 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-brand" />
            <span>Pyra · by PyraLabs</span>
          </div>
          <p>© {new Date().getFullYear()} PyraLabs. Todos os direitos reservados.</p>
        </div>
      </footer>
    </main>
  );
}
