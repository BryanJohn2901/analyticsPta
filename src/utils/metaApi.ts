const CREDS_KEY = "pta_meta_creds_v1";

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
