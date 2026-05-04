"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertCircle, Key, Loader2, RefreshCw, Users } from "lucide-react";
import { fetchMetaInsights, loadMetaCredentials, MetaInsight } from "@/utils/metaApi";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/metrics";

interface ProfileAnalysisProps {
  selectedGroup: string;
  adAccountId: string;
  groupLabel: string;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function getActionValue(actions: MetaInsight["actions"], type: string): number {
  return Number(actions?.find((a) => a.action_type === type)?.value ?? 0);
}

interface AdsetRow {
  name: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpm: number;
  ctr: number;
  purchases: number;
  cpa: number;
}

function toAdsetRows(data: MetaInsight[]): AdsetRow[] {
  const map = new Map<string, AdsetRow>();
  data.forEach((d) => {
    const key = d.adset_name ?? d.campaign_name;
    const cur = map.get(key) ?? {
      name: d.adset_name ?? d.campaign_name,
      impressions: 0, reach: 0, clicks: 0, spend: 0, cpm: 0, ctr: 0, purchases: 0, cpa: 0,
    };
    cur.impressions += d.impressions;
    cur.reach       += d.reach;
    cur.clicks      += d.clicks;
    cur.spend       += d.spend;
    cur.purchases   += getActionValue(d.actions, "purchase");
    map.set(key ?? "", cur);
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    cpm: r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0,
    ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
    cpa: r.purchases > 0 ? r.spend / r.purchases : 0,
  })).sort((a, b) => b.spend - a.spend);
}

export function ProfileAnalysis({ selectedGroup, adAccountId, groupLabel }: ProfileAnalysisProps) {
  const [data, setData]         = useState<AdsetRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(daysAgoStr(30));
  const [dateTo, setDateTo]     = useState(todayStr());

  const hasToken = Boolean(loadMetaCredentials().accessToken);
  const hasAccount = Boolean(adAccountId);

  const load = useCallback(async () => {
    if (!hasToken || !hasAccount) return;
    setLoading(true); setError(null);
    try {
      const raw = await fetchMetaInsights(adAccountId, dateFrom, dateTo);
      setData(toAdsetRows(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  }, [adAccountId, dateFrom, dateTo, hasToken, hasAccount]);

  useEffect(() => { void load(); }, [load]);

  const totalSpend     = data.reduce((s, r) => s + r.spend, 0);
  const totalPurchases = data.reduce((s, r) => s + r.purchases, 0);
  const totalClicks    = data.reduce((s, r) => s + r.clicks, 0);

  if (!hasToken) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Key size={22} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Token de acesso não configurado</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Configure o Access Token da Meta Ads API em{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">Importar dados → Meta Ads API</span>
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccount || selectedGroup === "all") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Users size={22} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Selecione uma campanha</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {selectedGroup === "all"
              ? "Escolha uma campanha no painel direito para ver a análise por perfil."
              : `Nenhum Ad Account configurado para "${groupLabel}". Configure em Importar dados → Meta Ads API.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Análise por Perfil — {groupLabel}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Ad Account: {adAccountId}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          <span className="text-xs text-slate-400 dark:text-slate-500">até</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          <button onClick={() => void load()} disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {loading && data.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      )}

      {!loading && data.length === 0 && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
          Nenhum dado encontrado para o período selecionado.
        </div>
      )}

      {data.length > 0 && (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Investido",  value: formatCurrency(totalSpend) },
              { label: "Total Cliques",    value: formatNumber(totalClicks) },
              { label: "Total Compras",    value: formatNumber(totalPurchases) },
              { label: "CPA Médio",        value: totalPurchases > 0 ? formatCurrency(totalSpend / totalPurchases) : "—" },
            ].map((kpi) => (
              <article key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{kpi.value}</p>
              </article>
            ))}
          </div>

          {/* Spend by adset chart */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Investimento por Conjunto de Anúncios</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} width={115} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 12 }}
                    formatter={(v) => [formatCurrency(Number(v)), "Investimento"]}
                  />
                  <Bar dataKey="spend" name="Investimento" fill="#2563eb" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Adset table */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Detalhamento por Conjunto</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
                <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                  <tr>
                    {["Conjunto", "Investimento", "Alcance", "Cliques", "CTR", "CPM", "Compras", "CPA"].map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-700 dark:text-slate-300">
                  {data.map((r) => (
                    <tr key={r.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="max-w-[200px] truncate px-3 py-2 font-medium" title={r.name}>{r.name}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatCurrency(r.spend)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatNumber(r.reach)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatNumber(r.clicks)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatPercent(r.ctr)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatCurrency(r.cpm)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{r.purchases > 0 ? formatNumber(r.purchases) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{r.cpa > 0 ? formatCurrency(r.cpa) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* CTR vs CPM scatter (bar approximation) */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">CTR por Conjunto (top 10)</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(0, 10)} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9, fill: "#64748b" }}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 12 }}
                    formatter={(v) => [`${Number(v).toFixed(2)}%`, "CTR"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ctr" name="CTR (%)" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </>
      )}
    </div>
  );
}
