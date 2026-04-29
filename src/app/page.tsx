"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, LogOut } from "lucide-react";
import { RealtimeChannel, Session } from "@supabase/supabase-js";
import { HeroInput } from "@/components/HeroInput";
import { Dashboard } from "@/components/Dashboard";
import { AuthScreen } from "@/components/AuthScreen";
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
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
        setError("Faça login para conectar o realtime.");
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

  const handleSignIn = async (email: string, password: string): Promise<void> => {
    setAuthError(null);
    if (!supabaseClient) {
      setAuthError("Supabase não configurado para autenticação.");
      return;
    }

    const { data, error: signInError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setAuthError(signInError.message);
      return;
    }

    if (!data.session?.user.id) {
      setAuthError("Não foi possível validar a sessão do usuário.");
      return;
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("usuarios")
      .select("id")
      .eq("id", data.session.user.id)
      .maybeSingle();

    if (profileError) {
      setAuthError(`Erro ao validar cadastro no banco: ${profileError.message}`);
      return;
    }

    if (!profile) {
      setAuthError(
        "Usuário autenticado, mas sem registro na tabela usuarios. Verifique o trigger on_auth_user_created no Supabase.",
      );
      return;
    }

    setSession(data.session);
  };

  const handleSignUp = async (
    name: string,
    email: string,
    password: string,
  ): Promise<void> => {
    setAuthError(null);
    if (!supabaseClient) {
      setAuthError("Supabase não configurado para autenticação.");
      return;
    }

    const { data, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: name,
        },
      },
    });

    if (signUpError) {
      setAuthError(signUpError.message);
      return;
    }

    setSession(data.session ?? null);
    if (!data.user) {
      setAuthError("Não foi possível concluir o cadastro.");
      return;
    }

    if (!data.session) {
      setAuthError(
        "Conta criada. Verifique seu e-mail para confirmar o cadastro antes do login.",
      );
      return;
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("usuarios")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      setAuthError(`Erro ao validar cadastro no banco: ${profileError.message}`);
      return;
    }

    if (!profile) {
      setAuthError(
        "Conta criada, mas sem registro na tabela usuarios. Verifique o trigger on_auth_user_created.",
      );
      return;
    }
  };

  const handleSignOut = async (): Promise<void> => {
    disconnectRealtime();
    setCampaigns([]);
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    setSession(null);
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

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }
    const client = supabaseClient;

    const loadSession = async () => {
      const { data } = await client.auth.getSession();
      setSession(data.session);
      setAuthLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-slate-100" />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100">
        <AuthScreen
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          authError={authError}
          supabaseReady={isSupabaseConfigured}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs text-slate-500">Sessão autenticada</p>
            <p className="text-sm font-medium text-slate-900">
              {session.user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>

        <HeroInput
          onSubmitUrl={handleGenerateDashboard}
          onSubmitCsv={handleCsvUpload}
          onConnectRealtime={handleConnectRealtime}
          realtimeActive={realtimeActive}
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
