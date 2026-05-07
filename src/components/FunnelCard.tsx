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
    <article
      className="rounded-xl border bg-white p-5 shadow-sm dark:bg-[var(--dm-bg-surface)]"
      style={{ borderColor: "var(--dm-border-default)" }}
    >
      <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>Funil de Conversão</h3>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const widthPct = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
          return (
            <div key={step.label}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-medium" style={{ color: "var(--dm-text-secondary)" }}>{step.label}</span>
                <span className="font-semibold" style={{ color: "var(--dm-text-primary)" }}>{formatNumber(step.value)}</span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-lg bg-[var(--dm-bg-elevated)]">
                <div
                  className={`flex h-full items-center justify-end px-2 transition-all duration-700 ${step.color}`}
                  style={{ width: `${Math.max(widthPct, step.value > 0 ? 4 : 0)}%` }}
                />
              </div>
              {i < rates.length && (
                <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>
                  <span className="h-px flex-1 bg-[var(--dm-border-default)]" />
                  <span className="font-medium">
                    {formatPercent(rates[i])} de conversão
                  </span>
                  <span className="h-px flex-1 bg-[var(--dm-border-default)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
