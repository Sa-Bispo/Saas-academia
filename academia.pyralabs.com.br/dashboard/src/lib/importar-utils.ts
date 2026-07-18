export function parseDateBR(raw: string | undefined | null): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // Só o dia do mês (1-31): usa mês atual, ou próximo mês se o dia já passou
  if (/^\d{1,2}$/.test(s)) {
    const day = parseInt(s, 10);
    if (day < 1 || day > 31) return null;
    const now = new Date();
    const candidate = new Date(now.getFullYear(), now.getMonth(), day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate;
  }

  // DD/MM/YYYY · DD-MM-YYYY · DD.MM.YYYY (formato brasileiro)
  const brMatch = s.match(/^(\d{1,2})[/\-.·](\d{1,2})[/\-.·](\d{2,4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD (ISO — Excel exporta às vezes neste formato)
  const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function normalizeTelefone(raw: string | undefined | null): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return digits;

  // Já correto: 55 + 10 (DDD+fixo) ou 55 + 11 (DDD+celular)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Sem código de país: 10 ou 11 dígitos (DDD + número)
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }

  // Fallback: adiciona 55
  return "55" + digits;
}
