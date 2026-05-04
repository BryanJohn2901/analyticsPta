const CREDS_KEY = "pta_meta_creds_v1";

export interface MetaAdAccount {
  id: string;       // e.g. "act_123456789"
  name: string;
  account_status: number; // 1 = active
  currency: string;
}

/**
 * Fetches all ad accounts accessible by the given token.
 * Calls our own Next.js route to avoid CORS issues.
 */
export async function fetchMetaAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  if (!accessToken) throw new Error("Informe o Access Token antes de buscar as contas.");
  const params = new URLSearchParams({ accessToken });
  const res = await fetch(`/api/meta/accounts?${params.toString()}`);
  const body = await res.json() as MetaAdAccount[] | { error: string };
  if (!res.ok) throw new Error((body as { error: string }).error ?? `Meta API error ${res.status}`);
  return body as MetaAdAccount[];
}

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

export interface MetaInsight {
  campaign_name: string;
  adset_name: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpm: number;
  ctr: number;
  date_start: string;
  date_stop: string;
  actions?: { action_type: string; value: string }[];
}

export async function fetchMetaInsights(
  adAccountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<MetaInsight[]> {
  const { accessToken } = loadMetaCredentials();
  if (!accessToken) throw new Error("Token de acesso Meta não configurado.");
  const params = new URLSearchParams({ adAccountId, dateFrom, dateTo, accessToken });
  const res = await fetch(`/api/meta/insights?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Meta API error ${res.status}`);
  }
  return (await res.json()) as MetaInsight[];
}
