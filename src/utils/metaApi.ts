import type { CampaignData } from "@/types/campaign";

const CREDS_KEY = "pta_meta_creds_v1";

// ─── Campaigns ────────────────────────────────────────────────────────────────

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;        // ACTIVE | PAUSED | DELETED | ARCHIVED
  objective: string;
  created_time: string;
}

/**
 * Fetches all campaigns (ACTIVE + PAUSED) for the given ad account.
 * Proxied through /api/meta/campaigns to avoid CORS.
 */
export async function fetchMetaCampaigns(
  adAccountId: string,
  accessToken: string,
): Promise<MetaCampaign[]> {
  if (!adAccountId) throw new Error("Informe o Ad Account ID.");
  if (!accessToken) throw new Error("Informe o Access Token antes de buscar campanhas.");

  const res  = await fetch(`/api/meta/campaigns?${new URLSearchParams({ adAccountId, accessToken })}`);
  const body = await res.json() as MetaCampaign[] | { error: string };
  if (!res.ok) throw new Error((body as { error: string }).error ?? `Meta API error ${res.status}`);
  return body as MetaCampaign[];
}

// ─── Ad Accounts ──────────────────────────────────────────────────────────────

export interface MetaAdAccount {
  id: string;            // "act_123456789" — includes prefix
  name: string;
  account_status: number; // 1 = active
  currency: string;
}

/** Fetches all ad accounts accessible by the given token (proxied to avoid CORS). */
export async function fetchMetaAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  if (!accessToken) throw new Error("Informe o Access Token antes de buscar as contas.");
  const res  = await fetch(`/api/meta/accounts?${new URLSearchParams({ accessToken })}`);
  const body = await res.json() as MetaAdAccount[] | { error: string };
  if (!res.ok) throw new Error((body as { error: string }).error ?? `Meta API error ${res.status}`);
  return body as MetaAdAccount[];
}

// ─── Credentials ─────────────────────────────────────────────────────────────

export interface MetaCredentials {
  accessToken: string;
}

export function loadMetaCredentials(): MetaCredentials {
  if (typeof window === "undefined") return { accessToken: "" };
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return { accessToken: "" };
    return { accessToken: "", ...JSON.parse(raw) };
  } catch {
    return { accessToken: "" };
  }
}

export function saveMetaCredentials(creds: MetaCredentials): void {
  try { localStorage.setItem(CREDS_KEY, JSON.stringify(creds)); } catch {}
}

// ─── Insights ─────────────────────────────────────────────────────────────────

interface MetaAction {
  action_type: string;
  value: string; // numeric string
}

export interface MetaInsight {
  campaign_name: string;
  campaign_id:   string;
  adset_name?:   string;  // present when level="adset" (kept for ProfileAnalysis compatibility)
  impressions:   string | number; // Meta API returns numeric strings
  reach:         string | number;
  clicks:        string | number; // all clicks (including reactions, shares — do NOT use for link metrics)
  inline_link_clicks?: string | number; // link clicks only — matches Meta Ads Manager "Cliques no link"
  spend:         string | number; // investment in account currency
  cpm:           string | number;
  ctr:           string | number; // all-click CTR percentage — e.g. "2.34" means 2.34%
  inline_link_click_ctr?: string | number; // link CTR — matches Meta Ads Manager default CTR column
  date_start:    string;
  date_stop:     string;
  actions?:       MetaAction[]; // conversion counts
  action_values?: MetaAction[]; // conversion revenue values
}

/**
 * Fetches campaign insights from Meta API for a given ad account and date range.
 * Returns one row per campaign per day (daily breakdown).
 *
 * @param campaignIds — optional list of campaign IDs to filter by (undefined = all)
 */
export async function fetchMetaInsights(
  adAccountId: string,
  dateFrom: string,
  dateTo: string,
  campaignIds?: string[],
): Promise<MetaInsight[]> {
  const { accessToken } = loadMetaCredentials();
  if (!accessToken) throw new Error("Token de acesso Meta não configurado.");

  const params = new URLSearchParams({ adAccountId, dateFrom, dateTo, accessToken });
  if (campaignIds && campaignIds.length > 0) {
    params.set("campaignIds", campaignIds.join(","));
  }
  const res = await fetch(`/api/meta/insights?${params.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Meta API error ${res.status}`);
  }

  return (await res.json()) as MetaInsight[];
}

// ─── Creatives ────────────────────────────────────────────────────────────────

export interface MetaCampaignCreative {
  campaignId:   string;
  campaignName: string;
  thumbnailUrl: string;
  adLink:       string;
}

/**
 * Fetches one creative (thumbnail + link) per campaign for the given ad account.
 * Proxied through /api/meta/creatives to avoid CORS.
 */
export async function fetchMetaCreatives(
  adAccountId: string,
  accessToken: string,
): Promise<MetaCampaignCreative[]> {
  if (!adAccountId || !accessToken) return [];
  const res  = await fetch(`/api/meta/creatives?${new URLSearchParams({ adAccountId, accessToken })}`);
  const body = await res.json() as MetaCampaignCreative[] | { error: string };
  if (!res.ok) throw new Error((body as { error: string }).error ?? `Meta API error ${res.status}`);
  return body as MetaCampaignCreative[];
}

// ─── Transformation ──────────────────────────────────────────────────────────

/**
 * Parses a numeric value from the Meta API (always US format: "1234.56").
 * Must NOT use parseBR — parseBR strips dots as thousands separators,
 * which destroys the decimal point and inflates values 100x.
 */
function parseMetaNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Finds the numeric value of a specific action_type in a Meta actions array. */
function pickAction(actions: MetaAction[] | undefined, ...types: string[]): number {
  if (!actions) return 0;
  for (const type of types) {
    const found = actions.find((a) => a.action_type === type);
    if (found) return parseFloat(found.value) || 0;
  }
  return 0;
}

/**
 * Converts Meta Insights API rows into CampaignData records compatible
 * with the DashMonster dashboard.
 *
 * Conversion counting: purchase > omni_purchase > offsite_conversion.fb_pixel_purchase
 * Revenue:            action_values for the same types
 */
export function metaInsightsToCampaignData(
  insights: MetaInsight[],
  adAccountId: string,
): CampaignData[] {
  return insights.map((row) => {
    const investment  = parseMetaNum(row.spend);
    const impressions = parseMetaNum(row.impressions);

    // Prefer inline_link_clicks (link clicks only, matches Meta Ads Manager "Cliques").
    // Fall back to all clicks if inline_link_clicks is absent (e.g. older API responses).
    const clicks = row.inline_link_clicks != null
      ? parseMetaNum(row.inline_link_clicks)
      : parseMetaNum(row.clicks);

    // Conversions — try most specific purchase types first
    const conversions = pickAction(
      row.actions,
      "purchase",
      "omni_purchase",
      "offsite_conversion.fb_pixel_purchase",
    );

    // Revenue — from action_values (monetary value of purchases)
    const revenue = pickAction(
      row.action_values,
      "purchase",
      "omni_purchase",
      "offsite_conversion.fb_pixel_purchase",
    );

    // Use Meta's link CTR if available; fall back to all-click CTR converted to decimal.
    // Both are stored as percentage strings ("2.34" = 2.34%).
    const ctrPct = row.inline_link_click_ctr != null
      ? parseMetaNum(row.inline_link_click_ctr)
      : parseMetaNum(row.ctr);
    const ctr = ctrPct / 100;

    return {
      id:             `meta-${adAccountId}-${row.date_start}-${row.campaign_id}`,
      date:           row.date_start,
      campaignName:   row.campaign_name,
      investment,
      clicks,
      impressions,
      conversions,
      revenue,
      ctr,
      cpc:            clicks      > 0 ? investment   / clicks      : 0,
      cpa:            conversions > 0 ? investment   / conversions : 0,
      roas:           investment  > 0 ? revenue      / investment  : 0,
      conversionRate: clicks      > 0 ? (conversions / clicks) * 100 : 0,
    };
  });
}
