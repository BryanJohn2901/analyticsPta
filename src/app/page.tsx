"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { RealtimeChannel, Session } from "@supabase/supabase-js";
import { HeroInput } from "@/components/HeroInput";
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
  interface Window {
    supabase?: typeof supabaseClient;
  }
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session] = useState<Session | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const disconnectRealtime = () => {
    if (channelRef.current && supabaseClient) {
      void supabaseClient.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRealtimeActive(false);
  };

  const handleGenerateDashboard = async (sheetUrl: string): Promise<void> => {
    setError(null);

    if (!sheetUrl.includes("docs.google.com/spreadsheets")) {
      setCampaigns([]);
      setError("Informe uma URL válida de Google Sheets.");
      return;
    }

    try {
      const data = await fetchCampaignSheetData(sheetUrl);
      if (session?.user.id && isSupabaseConfigured) {
        await replaceSupabaseCampaigns(session.user.id, data, "google_sheets");
        await loadSupabaseData();
        if (!realtimeActive) {
          await handleConnectRealtime();
        }
      } else {
        setCampaigns(data);
      }
    } catch (requestError) {
      setCampaigns([]);
      if (requestError instanceof Error) {
        setError(requestError.message);
        return;
      }
      setError("Não foi possível gerar o dashboard com os dados informados.");
    }
  };

  const handleCsvUpload = async (file: File): Promise<void> => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCampaigns([]);
      setError("Envie um arquivo no formato CSV.");
      return;
    }

    try {
      const data = await parseCampaignCsvFile(file);
      if (session?.user.id && isSupabaseConfigured) {
        await replaceSupabaseCampaigns(session.user.id, data, "csv");
        await loadSupabaseData();
        if (!realtimeActive) {
          await handleConnectRealtime();
        }
      } else {
        setCampaigns(data);
      }
    } catch (requestError) {
      setCampaigns([]);
      if (requestError instanceof Error) {
        setError(requestError.message);
        return;
      }
      setError("Não foi possível gerar o dashboard com o CSV informado.");
    }
  };

  const loadSupabaseData = async () => {
    const data = await fetchSupabaseCampaigns();
    setCampaigns(data);
  };

  const handleConnectRealtime = async (): Promise<void> => {
    setError(null);

    if (!isSupabaseConfigured) {
      setError(
        "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.",
      );
      return;
    }

    try {
      await loadSupabaseData();
      disconnectRealtime();
      if (!session?.user.id) {
        setError("Realtime indisponível enquanto o login estiver desativado.");
        return;
      }
      channelRef.current = subscribeSupabaseCampaigns(session.user.id, loadSupabaseData);
      setRealtimeActive(true);
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
        return;
      }
      setError("Falha ao conectar no Supabase Realtime.");
    }
  };

  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined" &&
      supabaseClient
    ) {
      window.supabase = supabaseClient;
    }

    return () => {
      if (channelRef.current && supabaseClient) {
        void supabaseClient.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id || !isSupabaseConfigured) {
      return;
    }
    void (async () => {
      try {
        await loadSupabaseData();
        disconnectRealtime();
        channelRef.current = subscribeSupabaseCampaigns(
          session.user.id,
          loadSupabaseData,
        );
        setRealtimeActive(true);
      } catch (requestError) {
        if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError("Falha ao conectar no Supabase Realtime.");
        }
      }
    })();
  }, [session?.user.id]);

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <HeroInput
          onSubmitUrl={handleGenerateDashboard}
          onSubmitCsv={handleCsvUpload}
          showRealtime={false}
        />

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {campaigns.length > 0 ? <Dashboard campaigns={campaigns} /> : null}
      </main>
    </div>
  );
}
