import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  accentColor?: "blue" | "emerald" | "violet" | "amber" | "rose";
  invertTrend?: boolean;
  // Goals
  goalValue?: number | null;
  goalLabel?: string;
  goalPct?: number | null;      // 0–100+, pre-computed
  goalInvert?: boolean;         // lower = better (CPA, CPC, CPM)
}

const ACCENT = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    bar: "bg-blue-500",    ring: "ring-blue-100",    dark: "dark:bg-blue-900/20" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", bar: "bg-emerald-500", ring: "ring-emerald-100", dark: "dark:bg-emerald-900/20" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  bar: "bg-violet-500",  ring: "ring-violet-100",  dark: "dark:bg-violet-900/20" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   bar: "bg-amber-500",   ring: "ring-amber-100",   dark: "dark:bg-amber-900/20" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    bar: "bg-rose-500",    ring: "ring-rose-100",    dark: "dark:bg-rose-900/20" },
};

function goalColor(pct: number, invert: boolean): { bar: string; text: string; bg: string } {
  const good = invert ? pct <= 100 : pct >= 100;
  const mid  = invert ? pct <= 130 : pct >= 70;
  if (good) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" };
  if (mid)  return { bar: "bg-amber-400",   text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-900/20" };
  return      { bar: "bg-red-400",      text: "text-red-500 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-900/20" };
}

export function KpiCard({
  title, value, subtitle, icon: Icon,
  trend, trendLabel = "vs período anterior",
  accentColor = "blue",
  invertTrend = false,
  goalValue, goalLabel, goalPct, goalInvert = false,
}: KpiCardProps) {
  const a = ACCENT[accentColor];

  const isPositiveTrend = trend !== undefined
    ? (invertTrend ? trend < 0 : trend > 0)
    : null;

  const hasGoal = goalValue != null && goalPct != null;
  const gc = hasGoal ? goalColor(goalPct!, goalInvert) : null;
  const barWidth = hasGoal ? Math.min(goalPct!, 100) : 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      {/* Accent bar top */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${a.bar}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</p>
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.bg} ring-1 ${a.ring} ${a.dark}`}>
            <Icon size={17} className={a.icon} />
          </span>
        </div>

        {/* Value */}
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>

        {/* Trend + subtitle */}
        <div className="mt-2 flex items-center gap-2">
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
              isPositiveTrend
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {isPositiveTrend ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {trend !== undefined ? trendLabel : subtitle}
            </p>
          )}
        </div>
        {trend !== undefined && subtitle && (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
        )}
      </div>

      {/* Goal section */}
      {hasGoal && gc && (
        <div className="border-t border-slate-100 px-5 pb-4 pt-3 dark:border-slate-700/60">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              Meta: <span className="text-slate-600 dark:text-slate-300">{goalLabel}</span>
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${gc.bg} ${gc.text}`}>
              {goalInvert
                ? goalPct! <= 100 ? `✓ ${goalPct!.toFixed(0)}%` : `+${(goalPct! - 100).toFixed(0)}% acima`
                : goalPct! >= 100 ? `✓ ${goalPct!.toFixed(0)}%` : `${goalPct!.toFixed(0)}%`
              }
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${gc.bar}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      )}
    </article>
  );
}
