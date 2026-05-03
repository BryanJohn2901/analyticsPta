"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignData } from "@/types/campaign";
import {
  formatCurrency, formatDatePtBr, formatNumber, formatPercent,
} from "@/utils/metrics";

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

// ─── Main component ───────────────────────────────────────────────────────────

export function CampaignTable({ campaigns }: CampaignTableProps) {
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
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Performance por Campanha</h3>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            {firstIdx}–{lastIdx} de {campaigns.length} registros
          </p>
        </div>
        {/* Pagination */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-[52px] text-center text-xs font-semibold text-slate-600 dark:text-slate-400">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
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
                <th
                  key={label}
                  className={`border-b border-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:text-slate-500 ${cls ?? ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {visibleRows.map((row, i) => (
              <tr
                key={row.id}
                className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-700/50 ${i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/30 dark:bg-slate-700/20"}`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                  {formatDatePtBr(row.date)}
                </td>
                <td className="px-4 py-3">
                  <span className="block max-w-[200px] truncate text-xs font-semibold text-slate-800 dark:text-slate-200" title={row.campaignName}>
                    {row.campaignName}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-700 dark:text-slate-300">
                  {formatCurrency(row.investment)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">
                  {formatNumber(row.clicks)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {formatNumber(row.conversions)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <CtrBadge value={row.ctr} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">
                  {formatCurrency(row.cpc)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">
                  {formatCurrency(row.cpa)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <RoasBadge value={row.roas} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer total row */}
      {campaigns.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-700 dark:bg-slate-700/30">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total período ({campaigns.length} registros)
          </p>
          <div className="flex gap-6 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Invest.: <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(campaigns.reduce((s, r) => s + r.investment, 0))}
              </span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Receita: <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(campaigns.reduce((s, r) => s + r.revenue, 0))}
              </span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Conversões: <span className="font-bold text-blue-700 dark:text-blue-400">
                {formatNumber(campaigns.reduce((s, r) => s + r.conversions, 0))}
              </span>
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
