import { supabaseClient } from "@/lib/supabase";
import { HistoricalMeta, HistoricalRow } from "@/types/historical";

// ─── Mapping helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(r: any): HistoricalRow {
  return {
    id:               r.id,
    product:          r.product,
    month:            r.month,
    year:             Number(r.year),
    monthKey:         r.month_key,
    monthLabel:       r.month_label,
    investment:       Number(r.investment),
    cpm:              Number(r.cpm),
    reach:            Number(r.reach),
    ctr:              Number(r.ctr),
    clicks:           Number(r.clicks),
    pageViewRate:     Number(r.page_view_rate),
    pageViews:        Number(r.page_views),
    preCheckoutRate:  Number(r.pre_checkout_rate),
    preCheckouts:     Number(r.pre_checkouts),
    salesRate:        Number(r.sales_rate),
    sales:            Number(r.sales),
    revenue:          Number(r.revenue),
    cac:              Number(r.cac),
    roas:             Number(r.roas),
  };
}

function toDbRow(r: HistoricalRow): Record<string, unknown> {
  return {
    product:          r.product,
    month:            r.month,
    year:             r.year,
    month_key:        r.monthKey,
    month_label:      r.monthLabel,
    investment:       r.investment,
    cpm:              r.cpm,
    reach:            r.reach,
    ctr:              r.ctr,
    clicks:           r.clicks,
    page_view_rate:   r.pageViewRate,
    page_views:       r.pageViews,
    pre_checkout_rate: r.preCheckoutRate,
    pre_checkouts:    r.preCheckouts,
    sales_rate:       r.salesRate,
    sales:            r.sales,
    revenue:          r.revenue,
    cac:              r.cac,
    roas:             r.roas,
  };
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
  return (data ?? []).map(toRow);
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
  return toRow(data);
}

export async function updateHistoricalRow(id: string, row: HistoricalRow): Promise<HistoricalRow> {
  const { data, error } = await client()
    .from("historical_rows")
    .update(toDbRow(row))
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar registro: ${error.message}`);
  return toRow(data);
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
    newRows = (data ?? []).map(toRow);
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
