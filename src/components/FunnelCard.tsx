"use client";

import { formatCurrency, formatNumber, formatPercent } from "@/utils/metrics";

interface FunnelCardProps {
  impressions: number;
  clicks: number;
  conversions: number;
  investment?: number;
  // Optional extended metrics (when available from Meta or manual entry)
  pageViews?: number;
  leads?: number;
}

interface FunnelStep {
  label: string;
  value: number;
  rate?: number;          // conversion rate from previous step
  rateLabel?: string;     // label for the rate (e.g. "CTR")
  color: string;
  cost?: number;          // cost per unit (investment / value)
  costLabel?: string;
  widthPct: number;       // visual funnel width %
}

export function FunnelCard({ impressions, clicks, conversions, investment, pageViews, leads }: FunnelCardProps) {

  // Build steps dynamically based on available data
  const rawSteps: Array<{ label: string; value: number; rateLabel?: string; color: string; costLabel?: string }> = [
    { label: "Impressões",  value: impressions, color: "#3b82f6",                                            costLabel: "CPM" },
    { label: "Cliques",     value: clicks,      color: "#8b5cf6", rateLabel: "CTR",                          costLabel: "CPC" },
    ...(pageViews && pageViews > 0
      ? [{ label: "Vis. Página", value: pageViews, color: "#0891b2", rateLabel: "Connect Rate", costLabel: "CPV" }]
      : []),
    ...(leads && leads > 0
      ? [{ label: "Leads",      value: leads,     color: "#f59e0b", rateLabel: "Tx. Captura",   costLabel: "CPL" }]
      : []),
    { label: "Conversões",  value: conversions, color: "#10b981", rateLabel: conversions > 0 && clicks > 0 ? "Tx. Conv." : undefined, costLabel: "CPA" },
  ];

  const maxVal = Math.max(...rawSteps.map((s) => s.value), 1);

  // Funnel widths: 100% at top → narrowing down
  const steps: FunnelStep[] = rawSteps.map((s, i) => {
    const prev = i > 0 ? rawSteps[i - 1].value : null;
    const rate = prev && prev > 0 ? (s.value / prev) * 100 : undefined;
    const cost = investment && investment > 0 && s.value > 0 ? investment / s.value : undefined;
    const minWidth = 18;
    const widthPct = s.value > 0
      ? Math.max(minWidth, (s.value / maxVal) * 100)
      : minWidth;
    return { ...s, rate, cost, widthPct };
  });

  const getCostValue = (step: FunnelStep) => {
    if (!step.cost) return null;
    if (step.label === "Impressões") return formatCurrency((step.cost ?? 0) * 1000); // CPM
    return formatCurrency(step.cost);
  };

  return (
    <article
      className="rounded-xl border p-5 shadow-sm"
      style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
    >
      <h3 className="mb-5 text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>
        Funil de Conversão
      </h3>

      <div className="flex flex-col items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="w-full">

            {/* Rate badge between steps */}
            {i > 0 && step.rateLabel && (
              <div className="flex items-center justify-center gap-2 py-1">
                <span className="h-px w-8 flex-shrink-0" style={{ backgroundColor: "var(--dm-border-default)" }} />
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-secondary)" }}
                >
                  {step.rateLabel}: {step.rate !== undefined ? formatPercent(step.rate) : "—"}
                </span>
                <span className="h-px w-8 flex-shrink-0" style={{ backgroundColor: "var(--dm-border-default)" }} />
              </div>
            )}

            {/* Funnel bar row */}
            <div className="flex items-center gap-3">
              {/* Label + value (left) */}
              <div className="w-24 flex-shrink-0 text-right">
                <p className="text-[11px] font-medium" style={{ color: "var(--dm-text-secondary)" }}>{step.label}</p>
                <p className="text-sm font-bold" style={{ color: "var(--dm-text-primary)" }}>{formatNumber(step.value)}</p>
              </div>

              {/* Centered trapezoid bar */}
              <div className="flex flex-1 justify-center">
                <div
                  className="flex h-9 items-center justify-center rounded-lg transition-all duration-700"
                  style={{
                    width: `${step.widthPct}%`,
                    backgroundColor: step.color,
                    opacity: step.value > 0 ? 1 : 0.2,
                  }}
                >
                  {step.widthPct > 25 && step.value > 0 && (
                    <span className="text-[10px] font-bold text-white/90">
                      {formatNumber(step.value)}
                    </span>
                  )}
                </div>
              </div>

              {/* Cost (right) */}
              <div className="w-24 flex-shrink-0 text-left">
                {investment && step.costLabel && getCostValue(step) ? (
                  <>
                    <p className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>{step.costLabel}</p>
                    <p className="text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>{getCostValue(step)}</p>
                  </>
                ) : null}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Summary row */}
      {investment && investment > 0 && (
        <div
          className="mt-5 flex flex-wrap justify-around gap-3 rounded-lg border p-3"
          style={{ borderColor: "var(--dm-border-subtle)", backgroundColor: "var(--dm-bg-elevated)" }}
        >
          <div className="text-center">
            <p className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>Investimento</p>
            <p className="text-xs font-bold" style={{ color: "var(--dm-text-primary)" }}>{formatCurrency(investment)}</p>
          </div>
          {clicks > 0 && (
            <div className="text-center">
              <p className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>CTR</p>
              <p className="text-xs font-bold" style={{ color: "var(--dm-text-primary)" }}>{formatPercent(impressions > 0 ? (clicks / impressions) * 100 : 0)}</p>
            </div>
          )}
          {conversions > 0 && (
            <div className="text-center">
              <p className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>Tx. Conversão</p>
              <p className="text-xs font-bold" style={{ color: "var(--dm-text-primary)" }}>{formatPercent(clicks > 0 ? (conversions / clicks) * 100 : 0)}</p>
            </div>
          )}
          {conversions > 0 && (
            <div className="text-center">
              <p className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>CPA</p>
              <p className="text-xs font-bold" style={{ color: "var(--dm-text-primary)" }}>{formatCurrency(investment / conversions)}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
