import { NextRequest, NextResponse } from "next/server";

const META_API_VERSION = "v21.0";

function toUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0]!;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

/**
 * GET /api/instagram/insights?igUserId=xxx&accessToken=EAAxxxx&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Returns aggregated Instagram profile insights for the given period.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accessToken = searchParams.get("accessToken");
  const igUserId    = searchParams.get("igUserId");

  if (!accessToken || !igUserId) {
    return NextResponse.json({ error: "accessToken e igUserId são obrigatórios." }, { status: 400 });
  }

  const since = toUnix(searchParams.get("dateFrom") ?? daysAgo(30));
  const until = toUnix(searchParams.get("dateTo")   ?? todayStr());

  // Current followers count from profile
  const profileRes  = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${igUserId}?${new URLSearchParams({
      access_token: accessToken,
      fields: "followers_count",
    })}`,
  );
  const profileJson = await profileRes.json() as { followers_count?: number; error?: { message?: string } };

  if (!profileRes.ok || profileJson.error) {
    return NextResponse.json(
      { error: profileJson.error?.message ?? "Erro ao buscar perfil Instagram." },
      { status: 502 },
    );
  }

  // Daily insights for the period
  const insightsRes  = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${igUserId}/insights?${new URLSearchParams({
      access_token: accessToken,
      metric: "impressions,reach,profile_views,follower_count",
      period: "day",
      since: String(since),
      until: String(until),
    })}`,
  );
  const insightsJson = await insightsRes.json() as {
    data?: Array<{ name: string; values: Array<{ value: number; end_time: string }> }>;
    error?: { message?: string };
  };

  if (!insightsRes.ok || insightsJson.error) {
    return NextResponse.json(
      { error: insightsJson.error?.message ?? "Erro ao buscar insights Instagram." },
      { status: 502 },
    );
  }

  const data = insightsJson.data ?? [];

  const sum = (name: string) =>
    data.find((d) => d.name === name)?.values.reduce((acc, v) => acc + (v.value ?? 0), 0) ?? 0;

  const followerSeries = data.find((d) => d.name === "follower_count")?.values ?? [];
  const firstFollowers = followerSeries[0]?.value ?? 0;
  const lastFollowers  = followerSeries[followerSeries.length - 1]?.value ?? 0;
  const followerGrowth = lastFollowers - firstFollowers;

  return NextResponse.json({
    followersCount:    profileJson.followers_count ?? 0,
    impressionsTotal:  sum("impressions"),
    reachTotal:        sum("reach"),
    profileViewsTotal: sum("profile_views"),
    followerGrowth,
  });
}
