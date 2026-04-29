"use client";

import { useMemo, useState } from "react";
import { CampaignData } from "@/types/campaign";
import {
  formatCurrency,
  formatDatePtBr,
  formatNumber,
  formatPercent,
} from "@/utils/metrics";

interface CampaignTableProps {
  campaigns: CampaignData[];
}

const ITEMS_PER_PAGE = 8;

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(campaigns.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return campaigns.slice(start, start + ITEMS_PER_PAGE);
  }, [campaigns, currentPage]);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          Performance por campanha
        </h3>
        <p className="text-xs text-slate-500">
          Página {currentPage} de {totalPages}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Campanha</th>
              <th className="px-3 py-3">Investimento</th>
              <th className="px-3 py-3">Receita</th>
              <th className="px-3 py-3">Cliques</th>
              <th className="px-3 py-3">Conversões</th>
              <th className="px-3 py-3">CTR</th>
              <th className="px-3 py-3">CPC</th>
              <th className="px-3 py-3">CPA</th>
              <th className="px-3 py-3">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <tr key={row.id} className="text-slate-700">
                <td className="whitespace-nowrap px-3 py-3">
                  {formatDatePtBr(row.date)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                  {row.campaignName}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatCurrency(row.investment)}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatNumber(row.clicks)}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatNumber(row.conversions)}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatPercent(row.ctr)}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatCurrency(row.cpc)}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatCurrency(row.cpa)}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {row.roas.toFixed(2)}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </article>
  );
}
