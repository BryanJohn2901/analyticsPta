const LS_KEY = "pta_instagram_creds_v1";

export interface InstagramCredentials {
  accessToken: string;
}

export interface InstagramAccount {
  id: string;
  name: string;
  username: string;
  followersCount: number;
  profilePictureUrl?: string;
}

export interface InstagramProfileInsights {
  followersCount: number;
  impressionsTotal: number;
  reachTotal: number;
  profileViewsTotal: number;
  followerGrowth: number;
}

export function loadInstagramCredentials(): InstagramCredentials {
  if (typeof window === "undefined") return { accessToken: "" };
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as InstagramCredentials;
  } catch {
    return { accessToken: "" };
  }
}

export function saveInstagramCredentials(creds: InstagramCredentials): void {
  localStorage.setItem(LS_KEY, JSON.stringify(creds));
}

export async function fetchInstagramAccounts(accessToken: string): Promise<InstagramAccount[]> {
  const res = await fetch(`/api/instagram/accounts?accessToken=${encodeURIComponent(accessToken)}`);
  const json = await res.json() as InstagramAccount[] | { error: string };
  if (!res.ok || "error" in json) {
    throw new Error(("error" in json ? json.error : null) ?? "Erro ao buscar contas Instagram.");
  }
  return json as InstagramAccount[];
}

export async function fetchInstagramInsights(
  igUserId: string,
  accessToken: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<InstagramProfileInsights> {
  const params = new URLSearchParams({ igUserId, accessToken });
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  const res = await fetch(`/api/instagram/insights?${params.toString()}`);
  const json = await res.json() as InstagramProfileInsights | { error: string };
  if (!res.ok || "error" in json) {
    throw new Error(("error" in json ? json.error : null) ?? "Erro ao buscar insights Instagram.");
  }
  return json as InstagramProfileInsights;
}
