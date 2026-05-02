// ─── Product category ─────────────────────────────────────────────────────────

export type ProductCategory = "pos" | "livros" | "ebooks" | "perpetuo" | "eventos";

export interface CampaignRawRow {
  Data: string;
  "Nome da Campanha": string;
  "Investimento (R$)": string | number;
  Cliques: string | number;
  Impressões: string | number;
  Conversões: string | number;
  "Receita (R$)": string | number;
}

export interface CampaignData {
  id: string;
  date: string;
  campaignName: string;
  investment: number;
  clicks: number;
  impressions: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  conversionRate: number;
}

export interface DashboardTotals {
  totalInvestment: number;
  totalRevenue: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  roi: number;
  roas: number;
  averageCpa: number;
  averageCtr: number;
  averageConversionRate: number;
}

export interface DailyTrendPoint {
  date: string;
  clicks: number;
  conversions: number;
}

export interface CampaignComparisonPoint {
  campaignName: string;
  investment: number;
  revenue: number;
}

export interface BudgetDistributionPoint {
  campaignName: string;
  investment: number;
}

export interface AggregatedCampaign {
  campaignName: string;
  investment: number;
  revenue: number;
  clicks: number;
  impressions: number;
  conversions: number;
  roas: number;
  roi: number;
  ctr: number;
  cpa: number;
  conversionRate: number;
}
