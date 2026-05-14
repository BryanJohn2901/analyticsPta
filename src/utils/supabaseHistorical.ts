import { supabaseClient } from "@/lib/supabase";
import { HistoricalKind, HistoricalMeta, HistoricalRow } from "@/types/historical";

// ─── Mapping helpers ──────────────────────────────────────────────────────────

const TOP_LEVEL_KEYS = new Set([
  "id", "kind", "product", "turma", "month", "year", "monthKey", "monthLabel", "investment", "revenue",
]);

function toNum(value: unknown): number {
  return Number(value ?? 0);
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function splitForSupabase(row: HistoricalRow): { top: Record<string, unknown>; extra: Record<string, unknown> } {
  const top: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (TOP_LEVEL_KEYS.has(k)) top[k] = v;
    else extra[k] = v;
  }
  return { top, extra };
}

function reconstructFromSupabase(record: Record<string, unknown>): HistoricalRow {
  const kind = (record.kind as HistoricalKind | undefined) ?? "lancamento";
  const extra = (record.extra as Record<string, unknown> | null) ?? {};

  const base = {
    id: record.id as string,
    kind,
    product: String(record.product ?? ""),
    turma: (record.turma as string | undefined) || undefined,
    month: String(record.month ?? ""),
    year: Number(record.year ?? 0),
    monthKey: String(record.month_key ?? ""),
    monthLabel: String(record.month_label ?? ""),
    investment: toNum(record.investment),
    revenue: toNum(record.revenue),
  };

  // Mantém compatibilidade com registros antigos (colunas legadas)
  const legacy = {
    campaignEndDate: record.campaign_end_date as string | undefined,
    cpm: toNum(record.cpm),
    reach: toNum(record.reach),
    ctr: toNum(record.ctr),
    clicks: toNum(record.clicks),
    pageViews: toNum(record.page_views),
    pageViewRate: toNum(record.page_view_rate),
    preCheckouts: toNum(record.pre_checkouts),
    preCheckoutRate: toNum(record.pre_checkout_rate),
    sales: toNum(record.sales),
    salesRate: toNum(record.sales_rate),
    cac: toNum(record.cac),
    roas: toNum(record.roas),
  };

  return { ...base, ...legacy, ...extra } as HistoricalRow;
}

function toDbRow(r: HistoricalRow): Record<string, unknown> {
  const { top, extra } = splitForSupabase(r);

  const db: Record<string, unknown> = {
    kind: top.kind,
    product: top.product,
    turma: top.turma ?? null,
    month: top.month,
    year: top.year,
    month_key: top.monthKey,
    month_label: top.monthLabel,
    investment: top.investment,
    revenue: top.revenue,
    extra,
  };

  // Preencher colunas antigas para retrocompatibilidade dos relatórios já existentes
  for (const [key, value] of Object.entries(extra)) {
    const snake = toSnakeCase(key);
    if (!(snake in db)) db[snake] = value;
  }
  return db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMeta(r: any): HistoricalMeta {
  return {
    id:               r.id,
    product:          r.product,
    investment:       Number(r.investment),
    cpm:              Number(r.cpm),
    ctr:              Number(r.ctr),
    pageViewRate:     Number(r.page_view_rate),
    preCheckoutRate:  Number(r.pre_checkout_rate),
    salesTarget:      Number(r.sales_target),
    cac:              Number(r.cac),
  };
}

function toDbMeta(m: HistoricalMeta): Record<string, unknown> {
  return {
    product:          m.product,
    investment:       m.investment,
    cpm:              m.cpm,
    ctr:              m.ctr,
    page_view_rate:   m.pageViewRate,
    pre_checkout_rate: m.preCheckoutRate,
    sales_target:     m.salesTarget,
    cac:              m.cac,
  };
}

function client() {
  if (!supabaseClient) throw new Error("Supabase não configurado.");
  return supabaseClient;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchHistoricalRows(): Promise<HistoricalRow[]> {
  const { data, error } = await client()
    .from("historical_rows")
    .select("*")
    .order("month_key", { ascending: true });
  if (error) throw new Error(`Erro ao buscar histórico: ${error.message}`);
  return (data ?? []).map((row) => reconstructFromSupabase(row as Record<string, unknown>));
}

export async function fetchHistoricalMetas(): Promise<HistoricalMeta[]> {
  const { data, error } = await client()
    .from("historical_metas")
    .select("*")
    .order("product", { ascending: true });
  if (error) throw new Error(`Erro ao buscar metas: ${error.message}`);
  return (data ?? []).map(toMeta);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function insertHistoricalRow(row: HistoricalRow): Promise<HistoricalRow> {
  const { data, error } = await client()
    .from("historical_rows")
    .insert(toDbRow(row))
    .select()
    .single();
  if (error) throw new Error(`Erro ao inserir registro: ${error.message}`);
  return reconstructFromSupabase(data as Record<string, unknown>);
}

export async function updateHistoricalRow(id: string, row: HistoricalRow): Promise<HistoricalRow> {
  const { data, error } = await client()
    .from("historical_rows")
    .update(toDbRow(row))
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar registro: ${error.message}`);
  return reconstructFromSupabase(data as Record<string, unknown>);
}

export async function deleteHistoricalRowById(id: string): Promise<void> {
  const { error } = await client()
    .from("historical_rows")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Erro ao remover registro: ${error.message}`);
}

// ─── Bulk replace (CSV import) ────────────────────────────────────────────────

export async function replaceHistoricalData(
  rows: HistoricalRow[],
  metas: HistoricalMeta[],
): Promise<{ rows: HistoricalRow[]; metas: HistoricalMeta[] }> {
  const sb = client();

  // Delete all existing data
  await sb.from("historical_rows").delete().gte("year", 1900);
  await sb.from("historical_metas").delete().neq("product", "__none__");

  let newRows: HistoricalRow[] = [];
  if (rows.length > 0) {
    const { data, error } = await sb
      .from("historical_rows")
      .insert(rows.map(toDbRow))
      .select();
    if (error) throw new Error(`Erro ao importar linhas: ${error.message}`);
    newRows = (data ?? []).map((row) => reconstructFromSupabase(row as Record<string, unknown>));
  }

  let newMetas: HistoricalMeta[] = [];
  if (metas.length > 0) {
    const { data, error } = await sb
      .from("historical_metas")
      .insert(metas.map(toDbMeta))
      .select();
    if (error) throw new Error(`Erro ao importar metas: ${error.message}`);
    newMetas = (data ?? []).map(toMeta);
  }

  return { rows: newRows, metas: newMetas };
}
