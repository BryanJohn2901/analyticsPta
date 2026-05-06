import Papa from "papaparse";
import { HistoricalKind, HistoricalMeta, HistoricalRow } from "@/types/historical";

const MONTH_NUM: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

const MONTH_SHORT: Record<string, string> = {
  JANEIRO: "Jan", FEVEREIRO: "Fev", MARCO: "Mar", ABRIL: "Abr",
  MAIO: "Mai", JUNHO: "Jun", JULHO: "Jul", AGOSTO: "Ago",
  SETEMBRO: "Set", OUTUBRO: "Out", NOVEMBRO: "Nov", DEZEMBRO: "Dez",
};

const normalizeMonthName = (raw: string): string =>
  raw.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const parseNum = (val: string | undefined): number => {
  if (!val) return 0;
  const v = String(val).trim();
  if (v === "-" || v === "" || v === "0" || v.toLowerCase() === "null") return 0;
  const cleaned = v.replace(/[R$\s%]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

const KIND_ALIASES: Array<{ kind: HistoricalKind; aliases: string[] }> = [
  { kind: "lancamento", aliases: ["lancamento", "lançamento", "lan"] },
  { kind: "evento", aliases: ["evento", "event"] },
  { kind: "perpetuo", aliases: ["perpetuo", "perpétuo", "evergreen"] },
  { kind: "instagram", aliases: ["instagram", "ig", "perfil"] },
];

function detectKind(raw: string): HistoricalKind | null {
  const normalized = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  for (const item of KIND_ALIASES) {
    if (item.aliases.includes(normalized)) return item.kind;
  }
  return null;
}

export interface ParsedHistorical {
  rows: HistoricalRow[];
  metas: HistoricalMeta[];
}

export function parseHistoricalCsvFile(file: File): Promise<ParsedHistorical> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: false,
      complete: (result) => {
        try {
          resolve(processRows(result.data));
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Erro ao processar CSV histórico."));
        }
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

function processRows(raw: string[][]): ParsedHistorical {
  const rows: HistoricalRow[] = [];
  const metas: HistoricalMeta[] = [];

  let currentMonth = "";
  let currentYear = 2024;
  let prevMonthNum = 0;
  let lastProduct = "";

  for (const row of raw) {
    if (!row || row.length === 0) continue;

    const col0 = (row[0] ?? "").trim();
    if (!col0) continue;

    // Month header: "MÊS DE MARÇO" or "MÊS DE JANEIRO/24"
    const monthMatch = col0.match(/M[EÊ]S\s+DE\s+([A-ZÇÃÊ]+)(?:[/\s]+(\d+))?/i);
    if (monthMatch) {
      const rawName = normalizeMonthName(monthMatch[1]);
      const yearSuffix = monthMatch[2];
      if (yearSuffix) {
        const n = parseInt(yearSuffix);
        currentYear = n < 100 ? 2000 + n : n;
      }
      const monthNum = MONTH_NUM[rawName] ?? 0;
      if (monthNum > 0 && prevMonthNum > 0 && monthNum < prevMonthNum) {
        currentYear++;
      }
      if (monthNum > 0) prevMonthNum = monthNum;
      currentMonth = rawName;
      continue;
    }

    // Skip summary rows
    const upper = col0.toUpperCase();
    if (upper === "SOMA" || upper.startsWith("MEDIA") || upper.startsWith("MÉDIA")) continue;
    // Skip column header rows
    if (upper.includes("INVESTIMENTO") || upper.includes("MES DE") || upper.includes("MÊS DE")) continue;

    // META row
    if (upper.startsWith("META")) {
      if (lastProduct) {
        metas.push({
          product: lastProduct,
          investment: parseNum(row[1]),
          cpm: parseNum(row[2]),
          ctr: parseNum(row[4]),
          pageViewRate: parseNum(row[6]),
          preCheckoutRate: parseNum(row[8]),
          salesTarget: parseNum(row[11]),
          cac: parseNum(row[16] ?? row[13]),
        });
      }
      continue;
    }

    if (!currentMonth) continue;

    const explicitKind = row.map((cell) => detectKind(String(cell ?? ""))).find((v): v is HistoricalKind => Boolean(v));
    const kind = explicitKind ?? "lancamento";

    const investment = parseNum(row[1]);
    const revenue = parseNum(row[12]);
    const sales = parseNum(row[11]);
    const cac = parseNum(row[13]);
    const monthNum = MONTH_NUM[currentMonth] ?? 1;
    const monthKey = `${currentYear}-${String(monthNum).padStart(2, "0")}`;
    const monthLabel = `${MONTH_SHORT[currentMonth] ?? currentMonth}/${String(currentYear).slice(2)}`;

    rows.push({
      kind,
      product: col0,
      month: currentMonth,
      year: currentYear,
      monthKey,
      monthLabel,
      investment,
      cpm: kind === "lancamento" ? parseNum(row[2]) : 0,
      reach: parseNum(row[3]),
      ctr: parseNum(row[4]),
      clicks: parseNum(row[5]),
      pageViewRate: kind === "lancamento" ? parseNum(row[6]) : 0,
      pageViews: kind === "lancamento" ? parseNum(row[7]) : 0,
      preCheckoutRate: kind === "lancamento" ? parseNum(row[8]) : 0,
      preCheckouts: kind === "lancamento" ? parseNum(row[9]) : 0,
      salesRate: kind === "lancamento" ? parseNum(row[10]) : 0,
      sales,
      revenue,
      cac: cac > 0 ? cac : sales > 0 ? investment / Math.max(sales, 1) : 0,
      roas: investment > 0 ? revenue / investment : 0,
    } as HistoricalRow);

    lastProduct = col0;
  }

  return { rows, metas };
}
