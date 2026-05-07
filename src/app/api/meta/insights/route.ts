import { NextRequest, NextResponse } from "next/server";

const META_API_VERSION = "v19.0";

export async function GET(request: NextRequest) {
  const sp          = request.nextUrl.searchParams;
  const accessToken = sp.get("accessToken");
  const adAccountId = sp.get("adAccountId");
  const dateFrom    = sp.get("dateFrom");
  const dateTo      = sp.get("dateTo");
  const campaignIds = sp.get("campaignIds"); // optional: comma-separated campaign IDs

  if (!accessToken || !adAccountId || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "Parâmetros obrigatórios ausentes." }, { status: 400 });
  }

  // Strip "act_" prefix to avoid "act_act_123" double-prefix bug.
  // The Meta API endpoint already expects "act_{id}" — we add it ourselves.
  const accountId = adAccountId.replace(/^act_/, "");

  const fields = [
    "campaign_name",
    "campaign_id",
    "impressions",
    "reach",
    "clicks",
    "spend",        // investment (in account currency)
    "cpm",
    "ctr",          // returned as percentage string, e.g. "2.34" = 2.34%
    "date_start",
    "date_stop",
    "actions",        // contains conversion counts (purchase, lead, etc.)
    "action_values",  // contains conversion revenue values
  ].join(",");

  const params = new URLSearchParams({
    access_token:   accessToken,
    fields,
    time_range:     JSON.stringify({ since: dateFrom, until: dateTo }),
    level:          "campaign",   // one row per campaign (not adset)
    time_increment: "1",          // daily breakdown for trend charts
    limit:          "500",        // max per page — pagination handles overflow
  });

  // Optional campaign filter — limits results to specific campaign IDs
  if (campaignIds) {
    const ids = campaignIds.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length > 0) {
      params.set(
        "filtering",
        JSON.stringify([{ field: "campaign.id", operator: "IN", value: ids }]),
      );
    }
  }

  const allData: unknown[] = [];
  let nextUrl: string | null =
    `https://graph.facebook.com/${META_API_VERSION}/act_${accountId}/insights?${params.toString()}`;

  try {
    while (nextUrl) {
      const res  = await fetch(nextUrl, { cache: "no-store" });
      const json = await res.json() as {
        data?:   unknown[];
        paging?: { next?: string };
        error?:  { message?: string; code?: number; type?: string };
      };

      if (!res.ok || json.error) {
        const msg = json.error?.message ?? `Meta API error ${res.status}`;
        return NextResponse.json({ error: msg }, { status: 502 });
      }

      allData.push(...(json.data ?? []));
      nextUrl = json.paging?.next ?? null;
    }

    return NextResponse.json(allData);
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com Meta API." }, { status: 502 });
  }
}
