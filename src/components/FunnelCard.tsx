"use client";

import { formatNumber, formatPercent } from "@/utils/metrics";

interface FunnelStep {
  label: string;
  value: number;
  color: string;
  bg: string;
}

interface FunnelCardProps {
  impressions: number;
  clicks: number;
  conversions: number;
}

export function FunnelCard({ impressions, clicks, conversions }: FunnelCardProps) {
  const steps: FunnelStep[] = [
    { label: "Impressões",  value: impressions,  color: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Cliques",     value: clicks,       color: "bg-violet-500",  bg: "bg-violet-50 dark:bg-violet-900/20" },
    { label: "Conversões",  value: conversions,  color: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  ];

  const rates = [
    impressions > 0 ? (clicks / impressions) * 100 : 0,
    clicks > 0 ? (conversions / clicks) * 100 : 0,
  ];

  const maxVal = Math.max(...steps.map((s) => s.value), 1);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Funil de Conversão</h3>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const widthPct = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
          return (
            <div key={step.label}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600 dark:text-slate-400">{step.label}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatNumber(step.value)}</span>
              </div>
              <div className="h-7 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <div
                  className={`flex h-full items-center justify-end px-2 transition-all duration-700 ${step.color}`}
                  style={{ width: `${Math.max(widthPct, step.value > 0 ? 4 : 0)}%` }}
                />
              </div>
              {i < rates.length && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="font-semibold">
                    {formatPercent(rates[i])} de conversão
                  </span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
