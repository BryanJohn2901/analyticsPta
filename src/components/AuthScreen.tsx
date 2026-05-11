"use client";

import { FormEvent, useState } from "react";
import { Loader2, Lock, Mail, User } from "lucide-react";

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (name: string, email: string, password: string) => Promise<void>;
  authError: string | null;
  supabaseReady: boolean;
}

export function AuthScreen({
  onSignIn,
  onSignUp,
  authError,
  supabaseReady,
}: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await onSignIn(email, password);
      } else {
        await onSignUp(name, email, password);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0C0C0C]">
      {/* Background Glows */}
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-[600px] w-[600px] translate-x-1/3 translate-y-1/3 rounded-full bg-emerald-500/10 blur-[100px]" />

      <section className="glass-panel relative z-10 mx-4 w-full max-w-[420px] rounded-[2rem] p-6 shadow-2xl sm:p-10" style={{ animation: "dm-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl shadow-blue-500/30">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--dm-text-primary)" }}>
            DashMonster
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: "var(--dm-text-secondary)" }}>
            Acesse seu painel de controle
          </p>
        </div>

        {!supabaseReady ? (
          <div className="mb-6 rounded-xl border border-amber-200/50 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
            <strong>Modo de Desenvolvimento:</strong> Configure <code className="rounded bg-amber-500/20 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> para ativar o login.
          </div>
        ) : null}

        <div className="mb-6 flex rounded-xl border bg-slate-100/50 p-1 dark:border-slate-700/50 dark:bg-slate-800/50" style={{ borderColor: "var(--dm-border-default)" }}>
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-2 text-[13px] font-bold transition-all ${
              mode === "login" ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
            type="button"
          >
            Entrar
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg py-2 text-[13px] font-bold transition-all ${
              mode === "signup" ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" ? (
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white/50 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-900"
              />
            </div>
          ) : null}

          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white/50 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-900"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha secreta"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white/50 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-900"
            />
          </div>

          {authError ? (
            <div className="rounded-xl border border-red-200/50 bg-red-500/10 p-3 text-center text-sm font-medium text-red-600 dark:text-red-400">
              {authError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !supabaseReady}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[15px] font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processando...
              </>
            ) : mode === "login" ? (
              "Acessar Painel"
            ) : (
              "Criar nova conta"
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
