"use client";

import { useEffect, useRef, useState } from "react";
import { RealtimeChannel, Session } from "@supabase/supabase-js";
import { Dashboard } from "@/components/Dashboard";
import { CampaignData } from "@/types/campaign";
import { fetchCampaignSheetData, parseCampaignCsvFile } from "@/utils/googleSheets";
import { isSupabaseConfigured, supabaseClient } from "@/lib/supabase";
import {
  fetchSupabaseCampaigns,
  replaceSupabaseCampaigns,
  subscribeSupabaseCampaigns,
} from "@/utils/supabaseCampaigns";

declare global {
  interface Window { supabase?: typeof supabaseClient; }
}

/** Tracks the currently active data source so the UI can show a disconnect badge */
interface DataSource {
  type: "google_sheets" | "csv";
  label: string; // URL or filename
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [session]                 = useState<Session | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const disconnectRealtime = () => {
    if (channelRef.current && supabaseClient) {
      void supabaseClient.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRealtimeActive(false);
  };

  /** Disconnect current source — clears all campaign data without page reload */
  const handleDisconnect = async (): Promise<void> => {
    disconnectRealtime();
    setCampaigns([]);
    setDataSource(null);
    setError(null);
    if (session?.user.id && isSupabaseConfigured && supabaseClient) {
      await supabaseClient
        .from("campaign_metrics")
        .delete()
        .eq("user_id", session.user.id);
    }
  };

  const handleGenerateDashboard = async (sheetUrl: string): Promise<void> => {
    setError(null);
    if (!sheetUrl.includes("docs.google.com/spreadsheets")) {
      setError("Informe uma URL válida de Google Sheets.");
      return;
    }
    try {
      const data = await fetchCampaignSheetData(sheetUrl);
      if (session?.user.id && isSupabaseConfigured) {
        await replaceSupabaseCampaigns(session.user.id, data, "google_sheets");
        await loadSupabaseData();
        if (!realtimeActive) await handleConnectRealtime();
      } else {
        setCampaigns(data);
      }
      setDataSource({ type: "google_sheets", label: sheetUrl });
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
      if (session?.user.id && isSupabaseConfigured) {
        await replaceSupabaseCampaigns(session.user.id, data, "csv");
        await loadSupabaseData();
        if (!realtimeActive) await handleConnectRealtime();
      } else {
        setCampaigns(data);
      }
      setDataSource({ type: "csv", label: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível processar o CSV.");
    }
  };

  const loadSupabaseData = async () => setCampaigns(await fetchSupabaseCampaigns());

  const handleConnectRealtime = async (): Promise<void> => {
    if (!isSupabaseConfigured) return;
    try {
      await loadSupabaseData();
      disconnectRealtime();
      if (!session?.user.id) return;
      channelRef.current = subscribeSupabaseCampaigns(session.user.id, loadSupabaseData);
      setRealtimeActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao conectar no Supabase Realtime.");
    }
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && supabaseClient) {
      window.supabase = supabaseClient;
    }
    return () => { if (channelRef.current && supabaseClient) void supabaseClient.removeChannel(channelRef.current); };
  }, []);

  useEffect(() => {
    if (!session?.user.id || !isSupabaseConfigured) return;
    void (async () => {
      try {
        await loadSupabaseData();
        disconnectRealtime();
        channelRef.current = subscribeSupabaseCampaigns(session.user.id, loadSupabaseData);
        setRealtimeActive(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao conectar no Supabase Realtime.");
      }
    })();
  }, [session?.user.id]);

  return (
    <Dashboard
      campaigns={campaigns}
      error={error}
      dataSource={dataSource}
      onImportCsv={handleCsvUpload}
      onImportUrl={handleGenerateDashboard}
      onDisconnect={handleDisconnect}
    />
  );
}
