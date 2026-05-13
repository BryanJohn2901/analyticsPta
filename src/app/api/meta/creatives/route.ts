import { NextRequest, NextResponse } from "next/server";

const META_API_VERSION = "v21.0";

interface MetaAdRaw {
  id: string;
  name: string;
  campaign_id: string;
  campaign?: { name: string };
  /** Shareable preview link — works for all ad formats, most reliable adLink source */
  preview_shareable_link?: string;
  creative?: {
    thumbnail_url?: string;
    /** Image URL for static image ads — fallback when thumbnail_url is absent */
    image_url?: string;
    /** Permalink to the Instagram post/reel used as the ad */
    instagram_permalink_url?: string;
    /** Direct preview URL for Instagram Story ads */
    effective_instagram_story_url?: string;
    object_story_spec?: {
      link_data?:  { link?: string };
      video_data?: { call_to_action?: { value?: { link?: string } } };
    };
  };
}

export interface MetaCampaignCreative {
  campaignId:   string;
  campaignName: string;
  thumbnailUrl: string;
  adLink:       string;
}

/**
 * GET /api/meta/creatives?accessToken=EAAx...&adAccountId=act_123
 *
 * Returns one creative (thumbnail + preview link) per campaign.
 * Accumulates thumbnail_url/image_url and preview_shareable_link across ads
 * until both are found. Fetches ACTIVE + PAUSED ads and follows pagination.
 */
export async function GET(request: NextRequest) {
  const sp          = request.nextUrl.searchParams;
  const accessToken = sp.get("accessToken");
  const adAccountId = sp.get("adAccountId");

  if (!accessToken || !adAccountId) {
    return NextResponse.json(
      { error: "accessToken e adAccountId são obrigatórios." },
      { status: 400 },
    );
  }

  const accountId = adAccountId.replace(/^act_/, "");
  const allAds: MetaAdRaw[] = [];

  let nextUrl: string | null =
    `https://graph.facebook.com/${META_API_VERSION}/act_${accountId}/ads?` +
    new URLSearchParams({
      access_token:     accessToken,
      fields:           "name,campaign_id,campaign{name},preview_shareable_link,creative{thumbnail_url,image_url,instagram_permalink_url,effective_instagram_story_url,object_story_spec}",
      effective_status: JSON.stringify(["ACTIVE", "PAUSED"]),
      limit:            "200",
    }).toString();

  while (nextUrl) {
    const res  = await fetch(nextUrl, { cache: "no-store" });
    const json = await res.json() as {
      data?:   MetaAdRaw[];
      paging?: { next?: string };
      error?:  { message?: string };
    };

    if (!res.ok || json.error) {
      const msg = json.error?.message ?? `Meta API error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    allAds.push(...(json.data ?? []));
    nextUrl = json.paging?.next ?? null;
  }

  // One creative per campaign — accumulate thumbnail + adLink across ads until both are found
  const byCampaign = new Map<string, MetaCampaignCreative>();

  for (const ad of allAds) {
    const campaignName = ad.campaign?.name ?? "";
    if (!campaignName) continue;

    const existing = byCampaign.get(campaignName);
    if (existing?.thumbnailUrl && existing?.adLink) continue; // already complete

    // thumbnail: video thumbnail → static image → nothing
    const thumbnailUrl =
      ad.creative?.thumbnail_url ??
      ad.creative?.image_url ??
      "";

    // adLink: shareable preview (all formats) → Instagram permalink → story URL → object_story_spec fallbacks
    const spec    = ad.creative?.object_story_spec;
    const adLink  =
      ad.preview_shareable_link ??
      ad.creative?.instagram_permalink_url ??
      ad.creative?.effective_instagram_story_url ??
      spec?.link_data?.link ??
      spec?.video_data?.call_to_action?.value?.link ??
      "";

    byCampaign.set(campaignName, {
      campaignId:   ad.campaign_id,
      campaignName,
      thumbnailUrl: existing?.thumbnailUrl || thumbnailUrl,
      adLink:       existing?.adLink       || adLink,
    });
  }

  return NextResponse.json(Array.from(byCampaign.values()));
}
