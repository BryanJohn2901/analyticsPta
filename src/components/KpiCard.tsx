import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;          // % change vs period (positive = good)
  trendLabel?: string;     // e.g. "vs mês anterior"
  accentColor?: "blue" | "emerald" | "violet" | "amber" | "rose";
  invertTrend?: boolean;   // for metrics where lower = better (CPA, CPC)
}

const ACCENT = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    bar: "bg-blue-500",    ring: "ring-blue-100" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", bar: "bg-emerald-500", ring: "ring-emerald-100" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  bar: "bg-violet-500",  ring: "ring-violet-100" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   bar: "bg-amber-500",   ring: "ring-amber-100" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    bar: "bg-rose-500",    ring: "ring-rose-100" },
};

export function KpiCard({
  title, value, subtitle, icon: Icon,
  trend, trendLabel = "vs período anterior",
  accentColor = "blue",
  invertTrend = false,
}: KpiCardProps) {
  const a = ACCENT[accentColor];

  const isPositiveTrend = trend !== undefined
    ? (invertTrend ? trend < 0 : trend > 0)
    : null;

  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md`}>
      {/* Accent bar top */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${a.bar}`} />

      {/* Header row */}
      <div className="mb-4 flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.bg} ring-1 ${a.ring}`}>
          <Icon size={17} className={a.icon} />
        </span>
      </div>

      {/* Value */}
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>

      {/* Trend + subtitle row */}
      <div className="mt-2 flex items-center gap-2">
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
            isPositiveTrend
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}>
            {isPositiveTrend
              ? <TrendingUp size={10} />
              : <TrendingDown size={10} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <p className="text-xs text-slate-400">
            {trend !== undefined ? trendLabel : subtitle}
          </p>
        )}
        {trend === undefined && !subtitle && null}
      </div>

      {/* Bottom subtitle when trend is shown */}
      {trend !== undefined && subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </article>
  );
}
