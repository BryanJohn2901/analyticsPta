"use client";

import { useMemo } from "react";
import { AlertTriangle, XCircle } from "lucide-react";
import { AggregatedCampaign } from "@/types/campaign";
import { formatCurrency, formatPercent } from "@/utils/metrics";

interface CriticalPointsProps {
  campaigns: AggregatedCampaign[];
}

interface Issue {
  label: string;
  severity: "critical" | "warning";
}

function getIssues(c: AggregatedCampaign): Issue[] {
  const issues: Issue[] = [];

  if (c.roas < 1) {
    issues.push({ label: `ROAS negativo: ${c.roas.toFixed(2)}x — perde dinheiro`, severity: "critical" });
  } else if (c.roas < 2) {
    issues.push({ label: `ROAS baixo: ${c.roas.toFixed(2)}x (ideal ≥ 2x)`, severity: "warning" });
  }

  if (c.conversions === 0 && c.investment > 100) {
    issues.push({ label: `Sem conversões com ${formatCurrency(c.investment)} investidos`, severity: "critical" });
  } else if (c.conversionRate < 1 && c.clicks > 200) {
    issues.push({ label: `Tx. conversão baixa: ${formatPercent(c.conversionRate)} (ideal ≥ 1%)`, severity: "warning" });
  }

  if (c.ctr < 0.3 && c.impressions > 1000) {
    issues.push({ label: `CTR crítico: ${formatPercent(c.ctr)} (ideal ≥ 0.5%)`, severity: "critical" });
  } else if (c.ctr < 0.5 && c.impressions > 1000) {
    issues.push({ label: `CTR baixo: ${formatPercent(c.ctr)} (ideal ≥ 0.5%)`, severity: "warning" });
  }

  return issues;
}

export function CriticalPoints({ campaigns }: CriticalPointsProps) {
  const withIssues = useMemo(() => {
    return campaigns
      .map((c) => ({ ...c, issues: getIssues(c) }))
      .filter((c) => c.issues.length > 0)
      .sort((a, b) => {
        const aCritical = a.issues.filter((i) => i.severity === "critical").length;
        const bCritical = b.issues.filter((i) => i.severity === "critical").length;
        return bCritical - aCritical || b.investment - a.investment;
      });
  }, [campaigns]);

  const criticalCount = withIssues.filter((c) =>
    c.issues.some((i) => i.severity === "critical"),
  ).length;
  const warningCount = withIssues.filter(
    (c) => !c.issues.some((i) => i.severity === "critical"),
  ).length;

  if (withIssues.length === 0) {
    return (
      <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-emerald-700">
          Nenhum ponto crítico identificado nos dados filtrados.
        </p>
      </article>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
          <XCircle size={16} className="text-red-600" />
          <span className="text-sm font-semibold text-red-700">
            {criticalCount} {criticalCount === 1 ? "campanha crítica" : "campanhas críticas"}
          </span>
        </div>
        {warningCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              {warningCount} {warningCount === 1 ? "alerta" : "alertas"}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {withIssues.map((c) => {
          const hasCritical = c.issues.some((i) => i.severity === "critical");
          return (
            <article
              key={c.campaignName}
              className={`rounded-xl border p-4 shadow-sm ${hasCritical ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
            >
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <p className={`text-sm font-semibold ${hasCritical ? "text-red-900" : "text-amber-900"}`}>
                  {c.campaignName}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                  <span>Invest.: {formatCurrency(c.investment)}</span>
                  <span>Receita: {formatCurrency(c.revenue)}</span>
                  <span>ROAS: {c.roas.toFixed(2)}x</span>
                </div>
              </div>
              <ul className="space-y-1">
                {c.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    {issue.severity === "critical" ? (
                      <XCircle size={13} className="shrink-0 text-red-500" />
                    ) : (
                      <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                    )}
                    <span className={issue.severity === "critical" ? "text-red-700" : "text-amber-700"}>
                      {issue.label}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
