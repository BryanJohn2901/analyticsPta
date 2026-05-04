import { NextRequest, NextResponse } from "next/server";

const META_API_VERSION = "v19.0";

export interface MetaAdAccount {
  id: string;       // e.g. "act_123456789"
  name: string;
  account_status: number; // 1 = active
  currency: string;
}

/**
 * GET /api/meta/accounts?accessToken=EAAxxxx
 * Returns the list of ad accounts accessible by the token via /me/adaccounts
 */
export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get("accessToken");

  if (!accessToken) {
    return NextResponse.json({ error: "accessToken é obrigatório." }, { status: 400 });
  }

  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,account_status,currency",
    limit: "200",
  });

  const url = `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?${params.toString()}`;

  try {
    const res  = await fetch(url);
    const json = await res.json() as {
      data?: MetaAdAccount[];
      error?: { message?: string; code?: number };
    };

    if (!res.ok || json.error) {
      const msg = json.error?.message ?? `Meta API error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Sort: active accounts first, then alphabetically
    const accounts = (json.data ?? []).sort((a, b) => {
      if (a.account_status !== b.account_status) return b.account_status - a.account_status;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com Meta API." }, { status: 502 });
  }
}
