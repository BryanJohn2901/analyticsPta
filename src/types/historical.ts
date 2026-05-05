export interface HistoricalRow {
  id?: string;       // UUID from Supabase (undefined for unsaved local rows)
  product: string;
  month: string;
  year: number;
  monthKey: string;   // "2025-03" for sorting
  monthLabel: string; // "Mar/25" for display
  campaignEndDate?: string; // "YYYY-MM-DD"
  investment: number;
  cpm: number;
  reach: number;
  ctr: number;
  clicks: number;
  pageViewRate: number;
  pageViews: number;
  preCheckoutRate: number;
  preCheckouts: number;
  salesRate: number;
  sales: number;
  revenue: number;
  cac: number;
  roas: number;
}

export interface HistoricalMeta {
  id?: string;
  product: string;
  investment: number;
  cpm: number;
  ctr: number;
  pageViewRate: number;
  preCheckoutRate: number;
  salesTarget: number;
  cac: number;
}
