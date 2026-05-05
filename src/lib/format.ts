/** Converts a BR-formatted string ("1.234,56") or raw number to a plain JS number. */
export function parseBR(input: unknown): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (input == null) return 0;
  const s = String(input).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Coerces any value to a finite number, returning 0 for NaN/Infinity/null/undefined. */
export function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseBR(v);
  return Number.isFinite(n) ? n : 0;
}

/** Formats a number as BRL currency: 1234.56 → "R$ 1.234,56". */
export function formatBRL(n: number, opts?: { hideSymbol?: boolean }): string {
  return safeNumber(n).toLocaleString("pt-BR", {
    style: opts?.hideSymbol ? "decimal" : "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Compact format for large numbers: 6_377_398 → "6,4 mi". */
export function formatCompact(n: number): string {
  const safe = safeNumber(n);
  if (Math.abs(safe) < 1_000) return safe.toLocaleString("pt-BR");
  return safe.toLocaleString("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** Integer with BR thousand separator. */
export function formatInt(n: number): string {
  return Math.round(safeNumber(n)).toLocaleString("pt-BR");
}

/** Percentage: 0.0234 → "2,34%". */
export function formatPercent(n: number, digits = 2): string {
  return safeNumber(n).toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Safe division — returns 0 when denominator is zero. */
export function safeDivide(a: unknown, b: unknown): number {
  const na = safeNumber(a);
  const nb = safeNumber(b);
  return nb === 0 ? 0 : na / nb;
}
