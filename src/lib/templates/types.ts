export type TemplateId = "pos" | "imersao" | "perfil" | "personalizado";

export interface PersonalizadoConfig {
  name?: string;       // 3.7 — nome do layout salvo
  kpiIds: string[];    // ordered, max 10
  funnelIds: string[]; // ordered
}

export interface KpiSpec {
  id: string;
  label: string;
  tooltip?: string;   // 4.4 — texto expandido para métricas abreviadas
  format: (value: number) => string;
  color: "brand" | "sky" | "green" | "rose" | "amber" | "slate";
  invert?: boolean;   // true = menor é melhor (CPA, CPC, CPM)
  goalKey?: string;   // chave para buscar a meta no GoalsPanel
}

export interface FunnelStage {
  id: string;
  label: string;
  bg: string;         // hex color
  rateFromPrev?: string; // label da taxa entre estágio anterior e este
}

export interface TableColumnSpec {
  id: string;
  label: string;
  align: "left" | "right" | "center";
  format?: (v: number) => string;
}

export interface Template {
  id: TemplateId;
  label: string;
  description: string;
  color: string;
  kpis: KpiSpec[];
  funnel: FunnelStage[];
  table: { title: string; columns: TableColumnSpec[] };
  derive: (raw: Record<string, number>) => Record<string, number>;
}
