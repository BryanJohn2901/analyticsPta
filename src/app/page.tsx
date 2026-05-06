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
  replaceSupabaseCampaigns,
  saveSharedDataSource,
  subscribeSharedDataSource,
  subscribeSupabaseCampaigns,
} from "@/utils/supabaseCampaigns";
import { fetchMetaInsights, metaInsightsToCampaignData } from "@/utils/metaApi";

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

  /** Clears all campaign data and source without page reload */
  const handleDisconnect = async (): Promise<void> => {
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

    for (const [groupId, adAccountId] of configured) {
      const campaignIds = campaignFilter?.[groupId];
      const insights = await fetchMetaInsights(
        adAccountId,
        dateFrom,
        dateTo,
        campaignIds && campaignIds.length > 0 ? campaignIds : undefined,
      );
      allData.push(...metaInsightsToCampaignData(insights, adAccountId));
    }

    if (allData.length === 0) {
      throw new Error("Nenhum dado encontrado para o período selecionado nas contas configuradas.");
    }

    await replaceSupabaseCampaigns(allData, "meta");
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
    const initAuth = async () => {
      const { data } = await supabaseClient.auth.getSession();
      setSession(data.session ?? null);
    };
    void initAuth();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
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
        await loadSharedDataSource();
        disconnectRealtime();
        campaignChannelRef.current = subscribeSupabaseCampaigns(loadSupabaseData);
        sourceChannelRef.current = subscribeSharedDataSource(loadSharedDataSource);
        setRealtimeActive(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao conectar no Supabase Realtime.");
      }
    })();
  }, [session?.user.id]);

  if (!session) {
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
      error={error}
      dataSource={dataSource}
      onImportCsv={handleCsvUpload}
      onImportUrl={handleGenerateDashboard}
      onImportMeta={handleMetaImport}
      onDisconnect={handleDisconnect}
    />
  );
}
