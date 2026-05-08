"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignData } from "@/types/campaign";
import {
  formatCurrency, formatDatePtBr, formatNumber, formatPercent,
} from "@/utils/metrics";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useTheme } from "next-themes";

interface CampaignTableProps {
  campaigns: CampaignData[];
}

const ITEMS_PER_PAGE = 10;

// ─── Badge helpers ────────────────────────────────────────────────────────────

function RoasBadge({ value }: { value: number }) {
  const cls =
    value >= 3   ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : value >= 1.5 ? "bg-blue-50 text-blue-700 ring-blue-200"
    : value >= 1   ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-red-50 text-red-600 ring-red-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${cls}`}>
      {value.toFixed(2)}x
    </span>
  );
}

function CtrBadge({ value }: { value: number }) {
  const cls =
    value >= 3   ? "bg-emerald-50 text-emerald-700"
    : value >= 1.5 ? "bg-blue-50 text-blue-700"
    : value >= 0.5 ? "bg-slate-100 text-slate-600"
    : "bg-red-50 text-red-500";
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${cls}`}>
      {formatPercent(value)}
    </span>
  );
}

// ─── Short date helper ────────────────────────────────────────────────────────

function shortDate(v: string): string {
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Single‑campaign daily view ───────────────────────────────────────────────

function SingleCampaignView({ campaigns }: { campaigns: CampaignData[] }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () => [...campaigns].sort((a, b) => a.date.localeCompare(b.date)),
    [campaigns],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const campaignName = sorted[0]?.campaignName ?? "";
  const totalInvestment = sorted.reduce((s, r) => s + r.investment, 0);
  const totalClicks     = sorted.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = sorted.reduce((s, r) => s + r.conversions, 0);
  const totalRevenue    = sorted.reduce((s, r) => s + r.revenue, 0);
  const avgRoas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;

  const tickFill = dark ? "#64748b" : "#94a3b8";
  const gridStroke = dark ? "#334155" : "#f1f5f9";
  const tooltipBg = dark ? "#1e293b" : "#ffffff";
  const tooltipBorder = dark ? "#334155" : "#e2e8f0";

  // Color each bar by relative spend: top 25% → emerald, bottom 25% → red, rest → blue
  const investments = sorted.map((r) => r.investment);
  const maxInv = Math.max(...investments, 1);
  const minInv = Math.min(...investments.filter(v => v > 0), maxInv);
  const range = maxInv - minInv || 1;
  const barColor = (v: number) => {
    const pct = (v - minInv) / range;
    if (pct >= 0.75) return "#059669";
    if (pct <= 0.25) return "#ef4444";
    return "#3b82f6";
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Evolução Diária</p>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-lg" title={campaignName}>
              {campaignName}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{sorted.length} dias de dados</p>
        </div>

        {/* Summary KPIs */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Total Investido", value: formatCurrency(totalInvestment), color: "text-slate-900 dark:text-slate-100" },
            { label: "Receita",         value: formatCurrency(totalRevenue),    color: "text-emerald-700 dark:text-emerald-400" },
            { label: "Cliques",         value: formatNumber(totalClicks),       color: "text-blue-700 dark:text-blue-400" },
            { label: "ROAS Médio",      value: `${avgRoas.toFixed(2)}x`,        color: avgRoas >= 1 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{kpi.label}</p>
              <p className={`mt-0.5 text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily investment chart */}
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Gasto por dia
        </p>
        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} barCategoryGap="15%" margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: tickFill }}
                tickLine={false}
                axisLine={false}
                tickFormatter={shortDate}
                interval={Math.ceil(sorted.length / 7) - 1}
                height={20}
              />
              <YAxis
                tick={{ fontSize: 10, fill: tickFill }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10, border: `1px solid ${tooltipBorder}`,
                  background: tooltipBg, fontSize: 11,
                }}
                labelFormatter={(v) => formatDatePtBr(String(v))}
                formatter={(v) => [formatCurrency(Number(v)), "Investimento"]}
                cursor={{ fill: dark ? "#334155" : "#f8fafc" }}
              />
              <Bar dataKey="investment" radius={[3, 3, 0, 0]}>
                {sorted.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={barColor(entry.investment)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Color legend */}
        <div className="mt-1 flex gap-4 text-[10px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Maior gasto</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" />Médio</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-400" />Menor gasto</span>
        </div>
      </div>

      {/* Daily data table */}
      <div className="overflow-x-auto">
        <table className="min-w-[720px] text-sm">
          <thead>
            <tr className="bg-slate-50 text-left dark:bg-slate-700/50">
              {[
                { label: "Data",         cls: "w-28" },
                { label: "Investimento", cls: "text-right" },
                { label: "Receita",      cls: "text-right" },
                { label: "Cliques",      cls: "text-right" },
                { label: "Conversões",   cls: "text-right" },
                { label: "CTR",          cls: "text-center" },
                { label: "CPC",          cls: "text-right" },
                { label: "ROAS",         cls: "text-center" },
              ].map(({ label, cls }) => (
                <th key={label} className={`border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:text-slate-500 ${cls}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {visibleRows.map((row, i) => (
              <tr key={row.id} className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-700/50 ${i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/30 dark:bg-slate-700/20"}`}>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {formatDatePtBr(row.date)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(row.investment)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-slate-600 dark:text-slate-400">
                  {formatNumber(row.clicks)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {formatNumber(row.conversions)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-center">
                  <CtrBadge value={row.ctr} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-slate-600 dark:text-slate-400">
                  {formatCurrency(row.cpc)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-center">
                  <RoasBadge value={row.roas} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-700/30">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Total — {sorted.length} dias
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">Investimento</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatCurrency(totalInvestment)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">Conversões</span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{formatNumber(totalConversions)}</span>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
                <ChevronLeft size={12} />
              </button>
              <span className="text-[11px] font-semibold text-slate-500">{currentPage}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Multi‑campaign aggregate view ───────────────────────────────────────────

function MultiCampaignView({ campaigns }: { campaigns: CampaignData[] }) {
  const [page, setPage] = useState(1);
  const totalPages   = Math.max(1, Math.ceil(campaigns.length / ITEMS_PER_PAGE));
  const currentPage  = Math.min(page, totalPages);

  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return campaigns.slice(start, start + ITEMS_PER_PAGE);
  }, [campaigns, currentPage]);

  const firstIdx = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastIdx  = Math.min(currentPage * ITEMS_PER_PAGE, campaigns.length);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Performance por Campanha</h3>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            {firstIdx}–{lastIdx} de {campaigns.length} registros
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-[52px] text-center text-xs font-semibold text-slate-600 dark:text-slate-400">
            {currentPage} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[980px] text-sm">
          <thead>
            <tr className="bg-slate-50 text-left dark:bg-slate-700/50">
              {[
                { label: "Data",         cls: "w-24" },
                { label: "Campanha",     cls: "min-w-[180px]" },
                { label: "Investimento", cls: "text-right" },
                { label: "Receita",      cls: "text-right" },
                { label: "Cliques",      cls: "text-right" },
                { label: "Conversões",   cls: "text-right" },
                { label: "CTR",          cls: "text-center" },
                { label: "CPC",          cls: "text-right" },
                { label: "CPA",          cls: "text-right" },
                { label: "ROAS",         cls: "text-center" },
              ].map(({ label, cls }) => (
                <th key={label} className={`border-b border-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:text-slate-500 ${cls ?? ""}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {visibleRows.map((row, i) => (
              <tr key={row.id} className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-700/50 ${i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/30 dark:bg-slate-700/20"}`}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400 dark:text-slate-500">{formatDatePtBr(row.date)}</td>
                <td className="px-4 py-3">
                  <span className="block max-w-[200px] truncate text-xs font-semibold text-slate-800 dark:text-slate-200" title={row.campaignName}>
                    {row.campaignName}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-700 dark:text-slate-300">{formatCurrency(row.investment)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(row.revenue)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{formatNumber(row.clicks)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-400">{formatNumber(row.conversions)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-center"><CtrBadge value={row.ctr} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{formatCurrency(row.cpc)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{formatCurrency(row.cpa)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-center"><RoasBadge value={row.roas} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer total row */}
      {campaigns.length > 0 && (
        <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:px-5 dark:border-slate-700 dark:bg-slate-700/30">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total período ({campaigns.length} registros)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:gap-6">
            <span className="text-slate-500 dark:text-slate-400">
              Invest.: <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(campaigns.reduce((s, r) => s + r.investment, 0))}</span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Receita: <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(campaigns.reduce((s, r) => s + r.revenue, 0))}</span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Conversões: <span className="font-bold text-blue-700 dark:text-blue-400">{formatNumber(campaigns.reduce((s, r) => s + r.conversions, 0))}</span>
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function CampaignTable({ campaigns }: CampaignTableProps) {
  // Detect single-campaign mode: all rows share the same campaignName
  const uniqueNames = useMemo(
    () => new Set(campaigns.map((c) => c.campaignName)),
    [campaigns],
  );

  if (uniqueNames.size === 1) {
    return <SingleCampaignView campaigns={campaigns} />;
  }

  return <MultiCampaignView campaigns={campaigns} />;
}
