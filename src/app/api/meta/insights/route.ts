import { NextRequest, NextResponse } from "next/server";

const META_API_VERSION = "v19.0";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const accessToken = sp.get("accessToken");
  const adAccountId = sp.get("adAccountId");
  const dateFrom    = sp.get("dateFrom");
  const dateTo      = sp.get("dateTo");

  if (!accessToken || !adAccountId || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "Parâmetros obrigatórios ausentes." }, { status: 400 });
  }

  const fields = [
    "campaign_name",
    "adset_name",
    "impressions",
    "reach",
    "clicks",
    "spend",
    "cpm",
    "ctr",
    "date_start",
    "date_stop",
    "actions",
  ].join(",");

  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    level: "adset",
    limit: "500",
  });

  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?${params.toString()}`;

  try {
    const res = await fetch(url);
    const json = await res.json() as { data?: unknown; error?: { message?: string } };

    if (!res.ok || json.error) {
      const msg = json.error?.message ?? `Meta API error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    return NextResponse.json(json.data ?? []);
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com Meta API." }, { status: 502 });
  }
}
