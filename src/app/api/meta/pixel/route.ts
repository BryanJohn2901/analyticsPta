import { NextRequest, NextResponse } from "next/server";

const META_API_VERSION = "v21.0";

export interface PixelEventTotal {
  name: string;
  total: number;
}

export interface PixelStatsResponse {
  pixelId: string;
  events: PixelEventTotal[];
  funnel: {
    pageView: number;
    lead: number;
    initiateCheckout: number;
    addPaymentInfo: number;
    purchase: number;
  };
}

export async function GET(request: NextRequest) {
  const sp          = request.nextUrl.searchParams;
  const pixelId     = sp.get("pixelId");
  const dateFrom    = sp.get("dateFrom");
  const dateTo      = sp.get("dateTo");
  const accessToken = sp.get("accessToken");

  if (!pixelId || !accessToken) {
    return NextResponse.json({ error: "pixelId e accessToken são obrigatórios." }, { status: 400 });
  }

  const startTime = dateFrom
    ? Math.floor(new Date(`${dateFrom}T00:00:00Z`).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 86400 * 1000) / 1000);

  const endTime = dateTo
    ? Math.floor(new Date(`${dateTo}T23:59:59Z`).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/stats?${new URLSearchParams({
    aggregation: "event",
    start_time: String(startTime),
    end_time: String(endTime),
    access_token: accessToken,
  })}`;

  try {
    const res  = await fetch(url, { cache: "no-store" });
    const json = await res.json() as {
      data?: Array<{ data?: Array<{ value: string; count: number }> }>;
      error?: { message: string };
    };

    if (!res.ok || json.error) {
      return NextResponse.json(
        { error: json.error?.message ?? `Meta API error ${res.status}` },
        { status: 502 },
      );
    }

    // Aggregate hourly buckets → total per event name
    const totals: Record<string, number> = {};
    for (const hour of json.data ?? []) {
      for (const ev of hour.data ?? []) {
        totals[ev.value] = (totals[ev.value] ?? 0) + ev.count;
      }
    }

    const events: PixelEventTotal[] = Object.entries(totals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const get = (key: string) => totals[key] ?? 0;

    const response: PixelStatsResponse = {
      pixelId,
      events,
      funnel: {
        pageView:         get("PageView"),
        lead:             get("Lead"),
        initiateCheckout: get("InitiateCheckout"),
        addPaymentInfo:   get("AddPaymentInfo"),
        purchase:         get("Purchase"),
      },
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com Meta API." }, { status: 502 });
  }
}
