import { NextRequest, NextResponse } from "next/server";

const META_API_VERSION = "v21.0";

export interface InstagramAccount {
  id: string;
  name: string;
  username: string;
  followersCount: number;
  profilePictureUrl?: string;
}

/**
 * GET /api/instagram/accounts?accessToken=EAAxxxx
 * Returns Instagram Business Accounts linked to the user's Facebook Pages.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get("accessToken");

  if (!accessToken) {
    return NextResponse.json({ error: "accessToken é obrigatório." }, { status: 400 });
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/me/accounts?${new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,instagram_business_account{id,name,username,followers_count,profile_picture_url}",
    limit: "200",
  })}`;

  const res = await fetch(url);
  const json = await res.json() as {
    data?: Array<{
      id: string;
      name: string;
      instagram_business_account?: {
        id: string;
        name?: string;
        username?: string;
        followers_count?: number;
        profile_picture_url?: string;
      };
    }>;
    error?: { message?: string };
  };

  if (!res.ok || json.error) {
    return NextResponse.json(
      { error: json.error?.message ?? `Instagram API error ${res.status}` },
      { status: 502 },
    );
  }

  const accounts: InstagramAccount[] = (json.data ?? [])
    .filter((page) => page.instagram_business_account)
    .map((page) => {
      const ig = page.instagram_business_account!;
      return {
        id: ig.id,
        name: ig.name ?? page.name,
        username: ig.username ?? "",
        followersCount: ig.followers_count ?? 0,
        profilePictureUrl: ig.profile_picture_url,
      };
    });

  return NextResponse.json(accounts);
}
