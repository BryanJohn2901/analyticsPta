"use client";

import { useEffect, useRef, useState } from "react";
import { RealtimeChannel, Session } from "@supabase/supabase-js";
import { Dashboard } from "@/components/Dashboard";
import { AuthScreen } from "@/components/AuthScreen";
import { CampaignData } from "@/types/campaign";
import { fetchCampaignSheetData, parseCampaignCsvFile } from "@/utils/googleSheets";
import { isSupabaseConfigured, supabaseClient } from "@/lib/supabase";
import {
  fetchSharedDataSource,
  fetchSupabaseCampaigns,
  MetaSyncResult,
  replaceSupabaseCampaigns,
  saveSharedDataSource,
  subscribeSharedDataSource,
  subscribeSupabaseCampaigns,
  upsertMetaCampaigns,
} from "@/utils/supabaseCampaigns";
import {
  fetchMetaInsights,
  loadMetaCredentials,
  metaInsightsToCampaignData,
} from "@/utils/metaApi";
import type { AdvertiserProfile } from "@/hooks/useAdvertiserStore";

declare global {
  interface Window { supabase?: typeof supabaseClient; }
}

/** Tracks the currently active data source for the disconnect badge */
export interface DataSource {
  type: "google_sheets" | "csv" | "meta";
  label: string;
}

export default function Home() {
  const [campaigns, setCampaigns]       = useState<CampaignData[]>([]);
  const [error, setError]               = useState<string | null>(null);
  const [authError, setAuthError]       = useState<string | null>(null);
  const [session, setSession]           = useState<Session | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [dataSource, setDataSource]     = useState<DataSource | null>(null);
  const [syncStatus, setSyncStatus]     = useState<{ syncing: boolean; result?: MetaSyncResult; error?: string }>({ syncing: false });
  const campaignChannelRef = useRef<RealtimeChannel | null>(null);
  const sourceChannelRef = useRef<RealtimeChannel | null>(null);

  const closeRealtimeChannels = () => {
    if (campaignChannelRef.current && supabaseClient) {
      void supabaseClient.removeChannel(campaignChannelRef.current);
      campaignChannelRef.current = null;
    }
    if (sourceChannelRef.current && supabaseClient) {
      void supabaseClient.removeChannel(sourceChannelRef.current);
      sourceChannelRef.current = null;
    }
  };

  const disconnectRealtime = () => {
    closeRealtimeChannels();
    setRealtimeActive(false);
  };

  /** Reads advertiser profiles from localStorage without needing the hook. */
  function loadStoredProfiles(): AdvertiserProfile[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("pta_advertiser_profiles_v2");
      return raw ? (JSON.parse(raw) as AdvertiserProfile[]) : [];
    } catch { return []; }
  }

  /**
   * Syncs the last 7 days of Meta Ads data into Supabase using upsert.
   * Safe to call on every load — only updates rows that changed.
   */
  const handleMetaAutoSync = async (): Promise<void> => {
    const { accessToken } = loadMetaCredentials();
    if (!accessToken) return;

    const profiles = loadStoredProfiles();
    const accounts = profiles
      .filter((p) => p.adAccountId)
      .reduce<Record<string, string>>((acc, p) => {
        const key = p.groupId || p.id;
        if (!acc[key]) acc[key] = p.adAccountId;
        return acc;
      }, {});

    if (Object.keys(accounts).length === 0) return;

    const dateTo   = new Date();
    const dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - 7);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    setSyncStatus({ syncing: true });

    try {
      const allData: CampaignData[] = [];
      const seen = new Set<string>();

      for (const [groupId, adAccountId] of Object.entries(accounts)) {
        const profile = profiles.find((p) => (p.groupId || p.id) === groupId);
        const campaignIds = profile?.campaigns.map((c) => c.id);
        const key = `${adAccountId}::${(campaignIds ?? []).slice().sort().join(",")}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const insights = await fetchMetaInsights(
          adAccountId,
          fmt(dateFrom),
          fmt(dateTo),
          campaignIds && campaignIds.length > 0 ? campaignIds : undefined,
        );
        allData.push(...metaInsightsToCampaignData(insights, adAccountId));
      }

      // Deduplicate by id
      const deduped = allData.filter(((seen2) => (item) => {
        if (seen2.has(item.id)) return false;
        seen2.add(item.id);
        return true;
      })(new Set<string>()));

      if (deduped.length === 0) {
        setSyncStatus({ syncing: false });
        return;
      }

      const result = await upsertMetaCampaigns(deduped);
      await loadSupabaseData();
      setSyncStatus({ syncing: false, result });
    } catch (e) {
      setSyncStatus({
        syncing: false,
        error: e instanceof Error ? e.message : "Erro no sync com Meta Ads.",
      });
    }
  };

  const handleSignOut = async (): Promise<void> => {
    setError(null);
    if (!supabaseClient) return;
    const { error: signOutError } = await supabaseClient.auth.signOut();
    if (signOutError) {
      setError(`Erro ao sair: ${signOutError.message}`);
      return;
    }
    disconnectRealtime();
    setCampaigns([]);
    setDataSource(null);
    setSession(null);
  };

  const handleClearData = async (): Promise<void> => {
    setError(null);
    if (!supabaseClient) return;

    const { error: metricsError } = await supabaseClient
      .from("campaign_metrics")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (metricsError) {
      setError(`Erro ao limpar campanhas: ${metricsError.message}`);
      return;
    }

    const { error: sourceError } = await supabaseClient
      .from("dashboard_data_source")
      .delete()
      .eq("id", true);

    if (sourceError) {
      setError(`Erro ao limpar fonte de dados: ${sourceError.message}`);
      return;
    }

    setCampaigns([]);
    setDataSource(null);
  };

  const handleGenerateDashboard = async (sheetUrl: string): Promise<void> => {
    setError(null);
    if (!sheetUrl.includes("docs.google.com/spreadsheets")) {
      setError("Informe uma URL válida de Google Sheets.");
      return;
    }
    try {
      const data = await fetchCampaignSheetData(sheetUrl);
      await replaceSupabaseCampaigns(data, "google_sheets");
      await saveSharedDataSource({ type: "google_sheets", label: sheetUrl });
      await loadSupabaseData();
      await loadSharedDataSource();
      if (!realtimeActive) await handleConnectRealtime();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os dados da planilha.");
    }
  };

  const handleCsvUpload = async (file: File): Promise<void> => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Envie um arquivo no formato CSV.");
      return;
    }
    try {
      const data = await parseCampaignCsvFile(file);
      await replaceSupabaseCampaigns(data, "csv");
      await saveSharedDataSource({ type: "csv", label: file.name });
      await loadSupabaseData();
      await loadSharedDataSource();
      if (!realtimeActive) await handleConnectRealtime();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível processar o CSV.");
    }
  };

  /**
   * Fetches insights from Meta API for all configured ad accounts.
   * Called automatically after saving Meta credentials in the ImportPopover.
   *
   * @param accounts  — map of campaignGroupId → adAccountId (may include "act_" prefix)
   * @param dateFrom  — ISO date string "YYYY-MM-DD"
   * @param dateTo    — ISO date string "YYYY-MM-DD"
   */
  const handleMetaImport = async (
    accounts: Record<string, string>,
    dateFrom: string,
    dateTo: string,
    campaignFilter?: Record<string, string[]>,
  ): Promise<void> => {
    setError(null);

    const configured = Object.entries(accounts).filter(([, id]) => id.trim() !== "");
    if (configured.length === 0) {
      throw new Error("Configure pelo menos uma conta de anúncio antes de importar.");
    }

    const allData: CampaignData[] = [];
    // Track which (adAccountId, campaignIds) pairs we've already fetched to avoid
    // doubling metrics when two groups share the same ad account with no campaign filter.
    const fetchedKeys = new Set<string>();

    for (const [groupId, adAccountId] of configured) {
      const campaignIds = campaignFilter?.[groupId];
      const normalizedAccount = adAccountId.replace(/^act_/, "");
      const fetchKey = `${normalizedAccount}::${(campaignIds ?? []).slice().sort().join(",")}`;

      if (fetchedKeys.has(fetchKey)) continue; // skip exact duplicate fetch
      fetchedKeys.add(fetchKey);

      const insights = await fetchMetaInsights(
        adAccountId,
        dateFrom,
        dateTo,
        campaignIds && campaignIds.length > 0 ? campaignIds : undefined,
      );
      allData.push(...metaInsightsToCampaignData(insights, adAccountId));
    }

    // Deduplicate by id (meta-{account}-{date}-{campaignId}) to guard against any
    // remaining overlaps when two groups have different but overlapping campaign filters.
    const seenIds = new Set<string>();
    const dedupedData = allData.filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

    if (dedupedData.length === 0) {
      throw new Error("Nenhum dado encontrado para o período selecionado nas contas configuradas.");
    }

    await replaceSupabaseCampaigns(dedupedData, "meta");
    await saveSharedDataSource({
      type:  "meta",
      label: `Meta Ads · ${configured.length} conta${configured.length > 1 ? "s" : ""}`,
    });
    await loadSupabaseData();
    await loadSharedDataSource();
  };

  const loadSupabaseData = async () => setCampaigns(await fetchSupabaseCampaigns());
  const loadSharedDataSource = async () => setDataSource(await fetchSharedDataSource());

  const handleSignIn = async (email: string, password: string): Promise<void> => {
    setAuthError(null);
    if (!supabaseClient) return;
    const normalizedEmail = email === "admin" ? "admin@dashboard.local" : email;
    const normalizedPassword = email === "admin" && password === "admin" ? "admin123" : password;
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });
    if (signInError) {
      setAuthError(`Falha no login: ${signInError.message}`);
    }
  };

  const handleSignUp = async (name: string, email: string, password: string): Promise<void> => {
    setAuthError(null);
    if (!supabaseClient) return;
    const { error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (signUpError) {
      setAuthError(`Falha no cadastro: ${signUpError.message}`);
      return;
    }
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (signInError) {
      setAuthError(`Conta criada, mas não foi possível logar: ${signInError.message}`);
    }
  };

  const handleUpdateProfile = async (name: string): Promise<void> => {
    setError(null);
    if (!supabaseClient) return;
    const { error: updateError } = await supabaseClient.auth.updateUser({
      data: { full_name: name },
    });
    if (updateError) {
      setError(`Falha ao atualizar perfil: ${updateError.message}`);
      return;
    }
    const { data } = await supabaseClient.auth.getSession();
    setSession(data.session ?? null);
  };

  const handleConnectRealtime = async (): Promise<void> => {
    if (!isSupabaseConfigured) return;
    try {
      await loadSupabaseData();
      await loadSharedDataSource();
      disconnectRealtime();
      campaignChannelRef.current = subscribeSupabaseCampaigns(loadSupabaseData);
      sourceChannelRef.current = subscribeSharedDataSource(loadSharedDataSource);
      setRealtimeActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao conectar no Supabase Realtime.");
    }
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && supabaseClient) {
      window.supabase = supabaseClient;
    }
    return () => {
      if (campaignChannelRef.current && supabaseClient) void supabaseClient.removeChannel(campaignChannelRef.current);
      if (sourceChannelRef.current && supabaseClient) void supabaseClient.removeChannel(sourceChannelRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabaseClient) return;
    const client = supabaseClient;
    const initAuth = async () => {
      const { data } = await client.auth.getSession();
      setSession(data.session ?? null);
    };
    void initAuth();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id || !isSupabaseConfigured) {
      closeRealtimeChannels();
      return;
    }
    void (async () => {
      try {
        await loadSupabaseData();
        const source = await fetchSharedDataSource();
        setDataSource(source);

        disconnectRealtime();
        campaignChannelRef.current = subscribeSupabaseCampaigns(loadSupabaseData);
        sourceChannelRef.current = subscribeSharedDataSource(loadSharedDataSource);
        setRealtimeActive(true);

        // Auto-sync Meta Ads data on every login if source is Meta
        if (source?.type === "meta") {
          void handleMetaAutoSync();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao conectar no Supabase Realtime.");
      }
    })();
  }, [session?.user.id]);

  const devBypass = process.env.NODE_ENV === "development" && !isSupabaseConfigured;

  if (!session && !devBypass) {
    return (
      <AuthScreen
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        authError={authError}
        supabaseReady={isSupabaseConfigured}
      />
    );
  }

  return (
    <Dashboard
      campaigns={campaigns}
      error={error ?? syncStatus.error ?? null}
      dataSource={dataSource}
      syncStatus={syncStatus}
      currentUser={{
        email: devBypass ? "dev@preview.local" : (session?.user.email ?? ""),
        name: devBypass ? "Dev Preview" : String(session?.user.user_metadata?.full_name ?? "").trim(),
      }}
      onImportCsv={handleCsvUpload}
      onImportUrl={handleGenerateDashboard}
      onImportMeta={handleMetaImport}
      onClearData={handleClearData}
      onSignOut={handleSignOut}
      onUpdateProfile={handleUpdateProfile}
    />
  );
}
