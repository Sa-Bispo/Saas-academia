// Vídeo real do painel (tenant demo, dados fictícios), narrado pelo Samuel.
// Fonte: projeto-wpp-samuel/video-demo (montar_voz.py + legendar.py). Legenda já vem no vídeo.
export function VideoDemo() {
  return (
    <section id="video" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Veja funcionando
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-tight sm:text-[40px]">
            O sistema em 1 minuto
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Cobrança no WhatsApp, baixa do Pix em um clique e o aluno novo se
            cadastrando sozinho pelo celular. Tela real, sem montagem.
          </p>
        </div>

        <div className="card mt-10 overflow-hidden p-0">
          <video
            className="block aspect-video w-full bg-black"
            src="/demo-academia.mp4"
            poster="/demo-academia-poster.jpg"
            controls
            playsInline
            preload="none"
          >
            Seu navegador não conseguiu abrir o vídeo.
          </video>
        </div>
      </div>
    </section>
  );
}
