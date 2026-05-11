import type { Template, KpiSpec, FunnelStage, PersonalizadoConfig } from "./types";
import { formatBRL, formatInt, safeDivide } from "@/lib/format";

// ─── Catalog of all available KPIs ───────────────────────────────────────────

export const ALL_KPI_OPTIONS: KpiSpec[] = [
  { id: "spend",          label: "Investimento",        format: formatBRL,                         color: "brand" },
  { id: "impressions",    label: "Impressões",          format: formatInt,                         color: "sky" },
  { id: "reach",          label: "Alcance",             format: formatInt,                         color: "sky" },
  { id: "clicks",         label: "Cliques",             format: formatInt,                         color: "sky" },
  { id: "cpm",            label: "CPM",                 format: formatBRL,                         color: "rose", invert: true },
  { id: "ctr",            label: "CTR (%)",             format: (n) => `${n.toFixed(2)}%`,        color: "brand" },
  { id: "leads",          label: "Leads",               format: formatInt,                         color: "green" },
  { id: "sales",          label: "Vendas",              format: formatInt,                         color: "green" },
  { id: "revenue",        label: "Faturamento",         format: formatBRL,                         color: "green" },
  { id: "cpa",            label: "CPA",                 format: formatBRL,                         color: "rose", invert: true },
  { id: "roas",           label: "ROAS",                format: (n) => `${n.toFixed(2)}x`,        color: "brand" },
  { id: "page_views",     label: "Visualizações",       format: formatInt,                         color: "sky" },
  { id: "profile_visits", label: "Visitas ao perfil",   format: formatInt,                         color: "green" },
  { id: "new_followers",  label: "Novos seguidores",    format: formatInt,                         color: "green" },
  { id: "tickets",        label: "Ingressos",           format: formatInt,                         color: "green" },
  { id: "cpf",            label: "Custo por seguidor",  format: formatBRL,                         color: "rose", invert: true },
  { id: "cpa_ticket",     label: "CPA por ingresso",    format: formatBRL,                         color: "rose", invert: true },
];

// ─── Catalog of all available funnel stages ───────────────────────────────────

export const ALL_FUNNEL_OPTIONS: FunnelStage[] = [
  { id: "reach",          label: "Alcance",                bg: "#DBEAFE" },
  { id: "impressions",    label: "Impressões",             bg: "#BFDBFE" },
  { id: "clicks",         label: "Cliques no link",        bg: "#93C5FD", rateFromPrev: "CTR" },
  { id: "page_views",     label: "Visualizações de página",bg: "#67E8F9", rateFromPrev: "Tx. Visita" },
  { id: "leads",          label: "Leads",                  bg: "#FEF08A", rateFromPrev: "Tx. Captura" },
  { id: "sales",          label: "Vendas",                 bg: "#BBF7D0", rateFromPrev: "Tx. Conversão" },
  { id: "profile_visits", label: "Visitas ao perfil",      bg: "#A7F3D0", rateFromPrev: "Tx. Visita" },
  { id: "new_followers",  label: "Novos seguidores",       bg: "#6EE7B7", rateFromPrev: "Tx. Follow" },
  { id: "tickets",        label: "Ingressos vendidos",     bg: "#D1FAE5", rateFromPrev: "Tx. Conversão" },
];

const KPI_MAP    = Object.fromEntries(ALL_KPI_OPTIONS.map((k) => [k.id, k]));
const FUNNEL_MAP = Object.fromEntries(ALL_FUNNEL_OPTIONS.map((s) => [s.id, s]));

export const DEFAULT_PERSONALIZADO_CONFIG: PersonalizadoConfig = {
  kpiIds:    ["spend", "impressions", "clicks", "leads", "cpa"],
  funnelIds: ["impressions", "clicks", "leads", "sales"],
};

// ─── Dynamic template builder ────────────────────────────────────────────────

export function buildPersonalizadoTemplate(config: PersonalizadoConfig): Template {
  const kpis   = config.kpiIds.map((id) => KPI_MAP[id]).filter(Boolean);
  const funnel = config.funnelIds.map((id) => FUNNEL_MAP[id]).filter(Boolean);

  // Table: campaign + adset fixed, then one column per selected KPI; spend always last if not already included
  const kpiCols = kpis.map((k) => ({ id: k.id, label: k.label, align: "right" as const, format: k.format }));
  const hasSpend = kpis.some((k) => k.id === "spend");
  const tableColumns = [
    { id: "campaign", label: "Campanha", align: "left" as const },
    { id: "adset",    label: "Conjunto", align: "left" as const },
    ...kpiCols,
    ...(!hasSpend ? [{ id: "spend", label: "Investimento", align: "right" as const, format: formatBRL }] : []),
  ];

  return {
    id: "personalizado",
    label: "Personalizado",
    description: "Dashboard montado por você",
    color: "#7C3AED",
    kpis,
    funnel,
    table: { title: "Performance por Conjunto", columns: tableColumns },
    derive: (raw) => ({
      cpa:       safeDivide(raw.spend, raw.sales ?? 0),
      cpm:       raw.impressions > 0 ? (raw.spend / raw.impressions) * 1000 : 0,
      ctr:       raw.impressions > 0 ? (raw.clicks / raw.impressions) * 100 : 0,
      roas:      safeDivide(raw.revenue, raw.spend),
      cpf:       safeDivide(raw.spend, raw.new_followers ?? 0),
      cpa_ticket: safeDivide(raw.spend, raw.tickets ?? 0),
    }),
  };
}
