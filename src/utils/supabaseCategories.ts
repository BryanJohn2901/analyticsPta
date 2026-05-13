import { supabaseClient } from "@/lib/supabase";
import type { UserCategory, UserAccountEntry } from "@/types/userConfig";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getUser();
  return data.user?.id ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCategory(row: any): UserCategory {
  return {
    id:        row.id,
    userId:    row.user_id,
    slug:      row.slug,
    name:      row.name,
    type:      row.type as "fixed" | "custom",
    emoji:     row.emoji ?? null,
    position:  row.position,
    isEnabled: row.is_enabled,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEntry(row: any): UserAccountEntry {
  return {
    id:                   row.id,
    userId:               row.user_id,
    categoryId:           row.category_id,
    label:                row.label,
    adAccountId:          row.ad_account_id,
    campaigns:            row.campaigns ?? [],
    selectedCampaignIds:  row.selected_campaign_ids ?? [],
    isEnabled:            row.is_enabled,
  };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchUserCategories(): Promise<UserCategory[]> {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from("user_categories")
    .select("*")
    .order("position");
  if (error) throw error;
  return (data ?? []).map(rowToCategory);
}

export async function upsertUserCategory(cat: {
  id?: string;
  slug: string;
  name: string;
  type?: "fixed" | "custom";
  emoji?: string | null;
  position?: number;
  isEnabled?: boolean;
}): Promise<UserCategory> {
  if (!supabaseClient) throw new Error("Supabase não configurado.");
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  const payload: Record<string, unknown> = {
    user_id:    userId,
    slug:       cat.slug,
    name:       cat.name,
    type:       cat.type ?? "fixed",
    emoji:      cat.emoji ?? null,
    position:   cat.position ?? 0,
    is_enabled: cat.isEnabled ?? true,
  };
  if (cat.id) payload.id = cat.id;

  const { data, error } = await supabaseClient
    .from("user_categories")
    .upsert(payload, { onConflict: "user_id,slug" })
    .select()
    .single();
  if (error) throw error;
  return rowToCategory(data);
}

export async function deleteUserCategory(id: string): Promise<void> {
  if (!supabaseClient) throw new Error("Supabase não configurado.");
  const { error } = await supabaseClient
    .from("user_categories")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Account Entries ─────────────────────────────────────────────────────────

export async function fetchUserAccountEntries(): Promise<UserAccountEntry[]> {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from("user_account_entries")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}

export async function upsertUserAccountEntry(entry: {
  id?: string;
  categoryId: string;
  label: string;
  adAccountId: string;
  campaigns?: Array<{ id: string; name: string; status: string }>;
  selectedCampaignIds?: string[];
  isEnabled?: boolean;
}): Promise<UserAccountEntry> {
  if (!supabaseClient) throw new Error("Supabase não configurado.");
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  const payload: Record<string, unknown> = {
    user_id:               userId,
    category_id:           entry.categoryId,
    label:                 entry.label,
    ad_account_id:         entry.adAccountId,
    campaigns:             entry.campaigns ?? [],
    selected_campaign_ids: entry.selectedCampaignIds ?? [],
    is_enabled:            entry.isEnabled ?? true,
  };
  if (entry.id) payload.id = entry.id;

  const { data, error } = await supabaseClient
    .from("user_account_entries")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

export async function deleteUserAccountEntry(id: string): Promise<void> {
  if (!supabaseClient) throw new Error("Supabase não configurado.");
  const { error } = await supabaseClient
    .from("user_account_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
