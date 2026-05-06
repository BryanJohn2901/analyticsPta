"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Legend, Pie, PieChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";
import {
  BudgetDistributionPoint, CampaignComparisonPoint, DailyTrendPoint,
} from "@/types/campaign";
import { formatCurrency, formatDatePtBr, formatNumber } from "@/utils/metrics";

interface ChartsSectionProps {
  dailyTrend: DailyTrendPoint[];
  campaignComparison: CampaignComparisonPoint[];
  budgetDistribution: BudgetDistributionPoint[];
}

const PIE_COLORS = [
  "#2563eb", "#7c3aed", "#0891b2", "#059669",
  "#d97706", "#dc2626", "#db2777", "#0d9488",
];
const MAX_PIE_ITEMS = 8;

// ─── Shared chart theme ────────────────────────────────────────────────────────

function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return {
    gridStroke:  dark ? "#334155" : "#f1f5f9",
    tickFill:    dark ? "#64748b" : "#94a3b8",
    tooltipStyle: {
      contentStyle: {
        borderRadius: 12,
        border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
        background: dark ? "#1e293b" : "#ffffff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        fontSize: 12,
        padding: "8px 12px",
        color: dark ? "#f1f5f9" : "#0f172a",
      },
      cursor: { fill: dark ? "#334155" : "#f8fafc" },
    },
  };
}

// Smart interval so labels never overlap. Target ≤ 7 visible ticks.
function xInterval(length: number): number {
  if (length <= 7)  return 0;
  if (length <= 14) return 1;
  if (length <= 30) return Math.ceil(length / 6) - 1;
  if (length <= 90) return Math.ceil(length / 5) - 1;
  return Math.ceil(length / 4) - 1;
}

// Tall enough to hold rotated labels without clipping.
function xHeight(length: number): number {
  return length > 7 ? 52 : 28;
}

// ─── Toggle group ─────────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-xl bg-slate-100 p-0.5 dark:bg-slate-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
            value === o.value
              ? "bg-white text-blue-700 shadow-sm dark:bg-slate-600 dark:text-blue-300"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function ChartCard({
  title, subtitle, children, action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

// ─── Custom dot‑legend ────────────────────────────────────────────────────────

function DotLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3 sm:gap-4">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.color }} />
          <span className="text-xs text-slate-500 dark:text-slate-400">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChartsSection({
  dailyTrend, campaignComparison, budgetDistribution,
}: ChartsSectionProps) {
  const [trendMode, setTrendMode]           = useState<"area" | "bar">("area");
  const [comparisonMode, setComparisonMode] = useState<"grouped" | "horizontal">("grouped");
  const [budgetMode, setBudgetMode]         = useState<"donut" | "bar">("donut");
  const { gridStroke, tickFill, tooltipStyle } = useChartTheme();

  const GRID_PROPS = { strokeDasharray: "3 3", stroke: gridStroke, vertical: false as const };
  const AXIS_STYLE = { stroke: "none", tick: { fontSize: 11, fill: tickFill }, tickLine: false as const, axisLine: false as const };

  const pieData = useMemo(() => {
    if (budgetDistribution.length <= MAX_PIE_ITEMS) return budgetDistribution;
    const sorted  = [...budgetDistribution].sort((a, b) => b.investment - a.investment);
    const topItems = sorted.slice(0, MAX_PIE_ITEMS);
    const rest     = sorted.slice(MAX_PIE_ITEMS).reduce((s, i) => s + i.investment, 0);
    return [...topItems, { campaignName: "Outros", investment: rest }];
  }, [budgetDistribution]);

  const interval = xInterval(dailyTrend.length);

  // ── Trend chart ──────────────────────────────────────────────────────────────

  const trendChart = trendMode === "area" ? (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={dailyTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#059669" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="date"
          {...AXIS_STYLE}
          tickFormatter={(v) => formatDatePtBr(String(v))}
          interval={interval}
          angle={interval > 0 ? -40 : 0}
          textAnchor={interval > 0 ? "end" : "middle"}
          height={xHeight(dailyTrend.length)}
        />
        <YAxis
          {...AXIS_STYLE}
          tickFormatter={(v) => formatNumber(Number(v))}
          width={48}
        />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(v) => formatDatePtBr(String(v))}
          formatter={(v, name) => [formatNumber(Number(v)), name]}
        />
        <Area type="monotone" dataKey="clicks"      name="Cliques"     stroke="#2563eb" strokeWidth={2} fill="url(#gradClicks)" />
        <Area type="monotone" dataKey="conversions" name="Conversões"  stroke="#059669" strokeWidth={2} fill="url(#gradConv)" />
      </AreaChart>
    </ResponsiveContainer>
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dailyTrend} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="date"
          {...AXIS_STYLE}
          tickFormatter={(v) => formatDatePtBr(String(v))}
          interval={interval}
          angle={interval > 0 ? -40 : 0}
          textAnchor={interval > 0 ? "end" : "middle"}
          height={xHeight(dailyTrend.length)}
        />
        <YAxis {...AXIS_STYLE} tickFormatter={(v) => formatNumber(Number(v))} width={48} />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(v) => formatDatePtBr(String(v))}
          formatter={(v, name) => [formatNumber(Number(v)), name]}
        />
        <Bar dataKey="clicks"      name="Cliques"    fill="#2563eb" radius={[3, 3, 0, 0]} />
        <Bar dataKey="conversions" name="Conversões" fill="#059669" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  // ── Budget chart ──────────────────────────────────────────────────────────────

  const budgetChart = budgetMode === "donut" ? (
    <div className="flex flex-col items-center">
      <div className="h-48 w-full sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="investment"
              nameKey="campaignName"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              formatter={(v) => [formatCurrency(Number(v)), "Investimento"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 max-h-[140px] w-full space-y-1.5 overflow-y-auto">
        {pieData.map((item, i) => (
          <div key={`leg-${i}`} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="truncate text-xs text-slate-600 dark:text-slate-400">{item.campaignName}</span>
            </div>
            <span className="flex-shrink-0 text-xs font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.investment)}</span>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pieData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} horizontal={false} />
          <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <YAxis
            type="category"
            dataKey="campaignName"
            {...AXIS_STYLE}
            width={100}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v}
          />
          <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), "Investimento"]} />
          <Bar dataKey="investment" name="Investimento" radius={[0, 4, 4, 0]}>
            {pieData.map((_, i) => (
              <Cell key={`bar-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // ── Comparison chart ─────────────────────────────────────────────────────────

  const comparisonChart = comparisonMode === "grouped" ? (
    <div className="h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={campaignComparison} barCategoryGap="25%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="campaignName"
            {...AXIS_STYLE}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={52}
            tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 16)}…` : v}
          />
          <YAxis {...AXIS_STYLE} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={52} />
          <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), ""]} />
          <Bar dataKey="investment" name="Investimento" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="revenue"    name="Receita"      fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <div className="h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={campaignComparison} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} horizontal={false} />
          <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <YAxis
            type="category"
            dataKey="campaignName"
            {...AXIS_STYLE}
            width={130}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v: string) => v.length > 18 ? `${v.slice(0, 18)}…` : v}
          />
          <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), ""]} />
          <Bar dataKey="investment" name="Investimento" fill="#2563eb" radius={[0, 4, 4, 0]} />
          <Bar dataKey="revenue"    name="Receita"      fill="#059669" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">

      {/* ── Trend chart — 8/12 cols ── */}
      <div className="xl:col-span-8">
        <ChartCard
          title="Evolução Diária"
          subtitle="Cliques e conversões ao longo do tempo"
          action={
            <ToggleGroup
              options={[{ value: "area", label: "Área" }, { value: "bar", label: "Barras" }]}
              value={trendMode}
              onChange={setTrendMode}
            />
          }
        >
          <div className="h-64 sm:h-72">{trendChart}</div>
          <DotLegend items={[
            { color: "#2563eb", label: "Cliques" },
            { color: "#059669", label: "Conversões" },
          ]} />
        </ChartCard>
      </div>

      {/* ── Budget chart — 4/12 cols ── */}
      <div className="xl:col-span-4">
        <ChartCard
          title="Distribuição de Orçamento"
          subtitle="Investimento por campanha"
          action={
            <ToggleGroup
              options={[{ value: "donut", label: "Rosca" }, { value: "bar", label: "Barras" }]}
              value={budgetMode}
              onChange={setBudgetMode}
            />
          }
        >
          {budgetChart}
        </ChartCard>
      </div>

      {/* ── Comparison chart — 12/12 cols ── */}
      <div className="xl:col-span-12">
        <ChartCard
          title="Investimento vs Receita"
          subtitle="Comparativo por campanha no período"
          action={
            <ToggleGroup
              options={[{ value: "grouped", label: "Agrupado" }, { value: "horizontal", label: "Horizontal" }]}
              value={comparisonMode}
              onChange={setComparisonMode}
            />
          }
        >
          {comparisonChart}
          <DotLegend items={[
            { color: "#2563eb", label: "Investimento" },
            { color: "#059669", label: "Receita" },
          ]} />
        </ChartCard>
      </div>

    </section>
  );
}
