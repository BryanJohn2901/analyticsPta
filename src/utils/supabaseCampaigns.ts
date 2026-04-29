import { RealtimeChannel } from "@supabase/supabase-js";
import { CampaignData } from "@/types/campaign";
import { supabaseClient } from "@/lib/supabase";
import { calculateDerivedMetrics } from "@/utils/metrics";

interface SupabaseCampaignRow {
  id: string;
  date: string;
  campaign_name: string;
  investment: number;
  clicks: number;
  impressions: number;
  conversions: number;
  revenue: number;
}

const mapSupabaseRow = (row: SupabaseCampaignRow, index: number): CampaignData => {
  return calculateDerivedMetrics(
    {
      date: row.date,
      campaignName: row.campaign_name,
      investment: Number(row.investment ?? 0),
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      conversions: Number(row.conversions ?? 0),
      revenue: Number(row.revenue ?? 0),
    },
    index,
  );
};

export const fetchSupabaseCampaigns = async (): Promise<CampaignData[]> => {
  if (!supabaseClient) {
    throw new Error("Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabaseClient
    .from("campaign_metrics")
    .select(
      "id, date, campaign_name, investment, clicks, impressions, conversions, revenue",
    )
    .order("date", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar dados no Supabase: ${error.message}`);
  }

  return (data ?? []).map((row, index) => mapSupabaseRow(row, index));
};

export const subscribeSupabaseCampaigns = (
  userId: string,
  onChange: () => Promise<void>,
): RealtimeChannel => {
  if (!supabaseClient) {
    throw new Error("Supabase não configurado.");
  }

  return supabaseClient
    .channel("campaign-metrics-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "campaign_metrics",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void onChange();
      },
    )
    .subscribe();
};

export const replaceSupabaseCampaigns = async (
  userId: string,
  campaigns: CampaignData[],
  source: "csv" | "google_sheets",
): Promise<void> => {
  if (!supabaseClient) {
    throw new Error("Supabase não configurado.");
  }

  const { error: deleteError } = await supabaseClient
    .from("campaign_metrics")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`Erro ao limpar dados antigos: ${deleteError.message}`);
  }

  if (campaigns.length === 0) {
    return;
  }

  const payload = campaigns.map((item) => ({
    user_id: userId,
    date: item.date,
    campaign_name: item.campaignName,
    investment: item.investment,
    clicks: item.clicks,
    impressions: item.impressions,
    conversions: item.conversions,
    revenue: item.revenue,
    source,
  }));

  const { error: insertError } = await supabaseClient
    .from("campaign_metrics")
    .insert(payload);

  if (insertError) {
    throw new Error(`Erro ao salvar campanhas no Supabase: ${insertError.message}`);
  }
};
