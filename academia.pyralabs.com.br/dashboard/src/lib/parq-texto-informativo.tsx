import type { CSSProperties } from "react";

type LinhaInformativo =
  | { tipo: "vazio" }
  | { tipo: "bullet"; texto: string }
  | { tipo: "paragrafo"; texto: string };

function parseTextoInformativo(texto: string): LinhaInformativo[] {
  const linhas = texto.split("\n").map((linha): LinhaInformativo => {
    const trimmed = linha.trim();
    if (!trimmed) return { tipo: "vazio" };
    const bulletMatch = trimmed.match(/^[*\-•]\s+(.*)/);
    if (bulletMatch) return { tipo: "bullet", texto: bulletMatch[1] };
    return { tipo: "paragrafo", texto: trimmed };
  });

  // Colapsa sequências de linhas vazias em uma só, pra não empilhar espaçamento
  // de textos colados com múltiplas quebras de linha entre parágrafos.
  const colapsadas: LinhaInformativo[] = [];
  for (const linha of linhas) {
    if (linha.tipo === "vazio" && colapsadas[colapsadas.length - 1]?.tipo === "vazio") continue;
    colapsadas.push(linha);
  }
  while (colapsadas[0]?.tipo === "vazio") colapsadas.shift();
  while (colapsadas[colapsadas.length - 1]?.tipo === "vazio") colapsadas.pop();

  return colapsadas;
}

export function TextoInformativo({
  texto,
  className,
  style,
}: {
  texto: string;
  className?: string;
  style?: CSSProperties;
}) {
  const linhas = parseTextoInformativo(texto);
  return (
    <div className={className} style={style}>
      {linhas.map((linha, i) => {
        if (linha.tipo === "vazio") return <div key={i} aria-hidden className="h-2.5" />;
        if (linha.tipo === "bullet") {
          return (
            <p key={i} className="flex gap-2">
              <span aria-hidden className="shrink-0 opacity-60">
                •
              </span>
              <span>{linha.texto}</span>
            </p>
          );
        }
        return <p key={i}>{linha.texto}</p>;
      })}
    </div>
  );
}
