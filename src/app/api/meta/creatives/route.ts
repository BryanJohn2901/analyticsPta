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
    /** Image URL for static image ads */
    image_url?: string;
    /** Rendered picture of the creative (most reliable for image ads) */
    picture?: string;
    /** Permalink to the Instagram post/reel used as the ad */
    instagram_permalink_url?: string;
    /** Direct preview URL for Instagram Story ads */
    effective_instagram_story_url?: string;
    object_story_spec?: {
      link_data?: {
        link?: string;
        picture?: string;
        /** Carousel child attachments */
        child_attachments?: Array<{ picture?: string; image_url?: string }>;
      };
      video_data?: { call_to_action?: { value?: { link?: string } }; image_url?: string };
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
      fields: [
        "name",
        "campaign_id",
        "campaign{name}",
        "preview_shareable_link",
        "creative{thumbnail_url,image_url,picture,instagram_permalink_url,effective_instagram_story_url,object_story_spec{link_data{link,picture,child_attachments{picture,image_url}},video_data{image_url,call_to_action{value{link}}}}}",
      ].join(","),
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

    const spec = ad.creative?.object_story_spec;

    // thumbnail: video thumbnail → picture (rendered) → image_url → carousel 1st child → nothing
    const carouselPicture =
      spec?.link_data?.child_attachments?.[0]?.picture ??
      spec?.link_data?.child_attachments?.[0]?.image_url;
    const thumbnailUrl =
      ad.creative?.thumbnail_url ??
      ad.creative?.picture ??
      ad.creative?.image_url ??
      spec?.video_data?.image_url ??
      spec?.link_data?.picture ??
      carouselPicture ??
      "";

    // adLink (5.2): Ads Library URL sempre válido por ad_id → nunca expira, funciona para todos os formatos.
    // Complementa com preview_shareable_link e outros fallbacks.
    const adsLibraryUrl = `https://www.facebook.com/ads/library/?id=${ad.id}`;
    const adLink =
      ad.preview_shareable_link ??
      ad.creative?.instagram_permalink_url ??
      ad.creative?.effective_instagram_story_url ??
      spec?.link_data?.link ??
      spec?.video_data?.call_to_action?.value?.link ??
      adsLibraryUrl;

    byCampaign.set(campaignName, {
      campaignId:   ad.campaign_id,
      campaignName,
      thumbnailUrl: existing?.thumbnailUrl || thumbnailUrl,
      adLink:       existing?.adLink       || adLink,
    });
  }

  return NextResponse.json(Array.from(byCampaign.values()));
}
