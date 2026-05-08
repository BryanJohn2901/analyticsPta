"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart, ComposedChart,
  Pie, PieChart, ResponsiveContainer, Tooltip,
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
  "#6366f1", "#84cc16", "#f97316", "#14b8a6",
];
const MAX_PIE_ITEMS = 10;

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

// Short "DD/MM" date label — no rotation needed
function shortDate(v: string): string {
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Smart interval: target ≤ 8 visible ticks
function xInterval(length: number): number {
  if (length <= 8)  return 0;
  if (length <= 16) return 1;
  if (length <= 32) return Math.ceil(length / 7) - 1;
  if (length <= 90) return Math.ceil(length / 6) - 1;
  return Math.ceil(length / 5) - 1;
}

// "YYYY-MM" → "Mês/Ano" in pt-BR
function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const m = parseInt(month, 10) - 1;
  return `${monthNames[m] ?? month}/${(year ?? "").slice(2)}`;
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
  const [trendMode, setTrendMode]           = useState<"area" | "bar" | "invest">("area");
  const [comparisonMode, setComparisonMode] = useState<"grouped" | "horizontal">("grouped");
  const [budgetMode, setBudgetMode]         = useState<"donut" | "mensal" | "bar">("donut");
  const { gridStroke, tickFill, tooltipStyle } = useChartTheme();

  const GRID_PROPS = { strokeDasharray: "3 3", stroke: gridStroke, vertical: false as const };
  const AXIS_STYLE = { stroke: "none", tick: { fontSize: 11, fill: tickFill }, tickLine: false as const, axisLine: false as const };

  // ── Pie / budget data ─────────────────────────────────────────────────────
  const pieData = useMemo(() => {
    if (budgetDistribution.length <= MAX_PIE_ITEMS) return budgetDistribution;
    const sorted   = [...budgetDistribution].sort((a, b) => b.investment - a.investment);
    const topItems = sorted.slice(0, MAX_PIE_ITEMS);
    const rest     = sorted.slice(MAX_PIE_ITEMS).reduce((s, i) => s + i.investment, 0);
    return [...topItems, { campaignName: "Outros", investment: rest }];
  }, [budgetDistribution]);

  // ── Monthly investment aggregated from dailyTrend ─────────────────────────
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    dailyTrend.forEach((d) => {
      const key = d.date.slice(0, 7); // "YYYY-MM"
      map.set(key, (map.get(key) ?? 0) + (d.investment ?? 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, investment], i, arr) => {
        const prev = i > 0 ? arr[i - 1][1] : null;
        const delta = prev !== null && prev > 0 ? ((investment - prev) / prev) * 100 : null;
        return { key, label: monthLabel(key), investment, delta };
      });
  }, [dailyTrend]);

  const interval = xInterval(dailyTrend.length);

  // ── Trend chart ──────────────────────────────────────────────────────────────

  const trendChart = trendMode === "invest" ? (
    // Investment per day view
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dailyTrend} margin={{ top: 4, right: 52, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradInvest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#d97706" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="date" {...AXIS_STYLE} tickFormatter={shortDate} interval={interval} angle={0} textAnchor="middle" height={24} />
        <YAxis yAxisId="inv" {...AXIS_STYLE} tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} width={52} />
        <YAxis yAxisId="clicks" orientation="right" {...AXIS_STYLE} tickFormatter={(v) => formatNumber(Number(v))} width={44} />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(v) => formatDatePtBr(String(v))}
          formatter={(v, name) => name === "Investimento" ? [formatCurrency(Number(v)), name] : [formatNumber(Number(v)), name]}
        />
        <Area yAxisId="inv" type="monotone" dataKey="investment" name="Investimento" stroke="#d97706" strokeWidth={2} fill="url(#gradInvest)" />
        <Line yAxisId="clicks" type="monotone" dataKey="clicks" name="Cliques" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
      </ComposedChart>
    </ResponsiveContainer>
  ) : trendMode === "area" ? (
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
        <XAxis dataKey="date" {...AXIS_STYLE} tickFormatter={shortDate} interval={interval} angle={0} textAnchor="middle" height={24} />
        <YAxis {...AXIS_STYLE} tickFormatter={(v) => formatNumber(Number(v))} width={48} />
        <Tooltip {...tooltipStyle} labelFormatter={(v) => formatDatePtBr(String(v))} formatter={(v, name) => [formatNumber(Number(v)), name]} />
        <Area type="monotone" dataKey="clicks"      name="Cliques"    stroke="#2563eb" strokeWidth={2} fill="url(#gradClicks)" />
        <Area type="monotone" dataKey="conversions" name="Conversões" stroke="#059669" strokeWidth={2} fill="url(#gradConv)" />
      </AreaChart>
    </ResponsiveContainer>
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dailyTrend} barCategoryGap="20%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="date" {...AXIS_STYLE} tickFormatter={shortDate} interval={interval} angle={0} textAnchor="middle" height={24} />
        <YAxis {...AXIS_STYLE} tickFormatter={(v) => formatNumber(Number(v))} width={48} />
        <Tooltip {...tooltipStyle} labelFormatter={(v) => formatDatePtBr(String(v))} formatter={(v, name) => [formatNumber(Number(v)), name]} />
        <Bar dataKey="clicks"      name="Cliques"    fill="#2563eb" radius={[3, 3, 0, 0]} />
        <Bar dataKey="conversions" name="Conversões" fill="#059669" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  // ── Budget chart ──────────────────────────────────────────────────────────────

  // Monthly view: bar chart with investment per month + delta indicator
  const monthlySummaryChart = (
    <div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} barCategoryGap="20%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="label"
              {...AXIS_STYLE}
              angle={0}
              textAnchor="middle"
              height={24}
            />
            <YAxis
              {...AXIS_STYLE}
              tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
              width={52}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(v) => [formatCurrency(Number(v)), "Investimento"]}
            />
            <Bar dataKey="investment" name="Investimento" radius={[4, 4, 0, 0]}>
              {monthlyData.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Month-by-month delta badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        {monthlyData.map((m) => (
          <div key={m.key} className="flex flex-col items-center rounded-lg border px-3 py-1.5 text-center"
            style={{ borderColor: "var(--dm-border-subtle)", backgroundColor: "var(--dm-bg-elevated)" }}>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{m.label}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{formatCurrency(m.investment)}</span>
            {m.delta !== null && (
              <span className={`text-[10px] font-bold ${m.delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {m.delta >= 0 ? "▲" : "▼"} {Math.abs(m.delta).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
        {monthlyData.length === 0 && (
          <p className="text-xs text-slate-400">Sem dados no período.</p>
        )}
      </div>
    </div>
  );

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
  ) : budgetMode === "mensal" ? monthlySummaryChart : (
    // Horizontal bar chart with % of total
    <div className="h-56 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pieData} layout="vertical" margin={{ left: 0, right: 56, top: 4, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} horizontal={false} />
          <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <YAxis
            type="category"
            dataKey="campaignName"
            {...AXIS_STYLE}
            width={110}
            tick={{ fontSize: 10, fill: tickFill }}
            tickFormatter={(v: string) => v.length > 15 ? `${v.slice(0, 15)}…` : v}
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

  const comparisonDataWithRoas = useMemo(() =>
    campaignComparison.map((c) => ({
      ...c,
      roas: c.investment > 0 ? c.revenue / c.investment : 0,
    })),
  [campaignComparison]);

  const n = comparisonDataWithRoas.length;
  // For grouped: each campaign needs space. Few campaigns → wider bars.
  const groupedMinWidth = Math.max(n * 90, 500);
  const groupedBarSize  = n <= 2 ? 72 : n <= 4 ? 52 : n <= 8 ? 36 : 28;
  // For horizontal: 40px per row, min 200px
  const horizontalHeight = Math.max(n * 42 + 24, 200);
  const horizontalBarSize = n <= 4 ? 20 : n <= 8 ? 16 : 12;

  const comparisonTooltip = {
    ...tooltipStyle,
    formatter: (v: unknown, name: string) => [formatCurrency(Number(v)), name],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: (({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
      if (!active || !payload?.length) return null;
      const roas = comparisonDataWithRoas.find((c) => c.campaignName === label)?.roas ?? 0;
      return (
        <div style={{ ...tooltipStyle.contentStyle, padding: "10px 14px", minWidth: 190 }}>
          <p style={{ fontWeight: 700, marginBottom: 6, fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
          {payload.map((p: { name?: string; value?: number; fill?: string }) => (
            <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 2 }}>
              <span style={{ color: p.fill, fontWeight: 600, fontSize: 11 }}>{p.name}</span>
              <span style={{ fontWeight: 700, fontSize: 11 }}>{formatCurrency(p.value ?? 0)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>ROAS</span>
            <span style={{ fontWeight: 700, fontSize: 11, color: roas >= 1 ? "#059669" : "#dc2626" }}>{roas.toFixed(2)}x</span>
          </div>
        </div>
      );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  };

  const comparisonChart = comparisonMode === "grouped" ? (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: groupedMinWidth, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparisonDataWithRoas}
            barCategoryGap={n <= 3 ? "15%" : "25%"}
            margin={{ top: 4, right: 8, bottom: 8, left: 0 }}
          >
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="campaignName"
              {...AXIS_STYLE}
              interval={0}
              angle={0}
              textAnchor="middle"
              height={36}
              tick={{ fontSize: 10, fill: tickFill }}
              tickFormatter={(v: string) => v.length > 20 ? `${v.slice(0, 20)}…` : v}
            />
            <YAxis {...AXIS_STYLE} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={52} />
            <Tooltip content={comparisonTooltip.content} cursor={tooltipStyle.cursor} />
            <Bar dataKey="investment" name="Investimento" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={groupedBarSize} />
            <Bar dataKey="revenue"    name="Receita"      fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={groupedBarSize} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  ) : (
    <div style={{ height: horizontalHeight, overflowY: "auto" }}>
      <ResponsiveContainer width="100%" height={Math.max(horizontalHeight, 200)}>
        <BarChart data={comparisonDataWithRoas} layout="vertical" margin={{ left: 4, right: 60, top: 4, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} horizontal={false} />
          <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <YAxis
            type="category"
            dataKey="campaignName"
            {...AXIS_STYLE}
            width={170}
            tick={{ fontSize: 10, fill: tickFill }}
            tickFormatter={(v: string) => v.length > 24 ? `${v.slice(0, 24)}…` : v}
          />
          <Tooltip content={comparisonTooltip.content} cursor={tooltipStyle.cursor} />
          <Bar dataKey="investment" name="Investimento" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={horizontalBarSize} />
          <Bar dataKey="revenue"    name="Receita"      fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={horizontalBarSize} />
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
              options={[
                { value: "area",   label: "Área"        },
                { value: "bar",    label: "Barras"      },
                { value: "invest", label: "Investimento" },
              ]}
              value={trendMode}
              onChange={setTrendMode}
            />
          }
        >
          <div className="h-64 sm:h-72">{trendChart}</div>
          <DotLegend items={
            trendMode === "invest"
              ? [{ color: "#d97706", label: "Investimento" }, { color: "#3b82f6", label: "Cliques" }]
              : [{ color: "#2563eb", label: "Cliques" }, { color: "#059669", label: "Conversões" }]
          } />
        </ChartCard>
      </div>

      {/* ── Budget chart — 4/12 cols ── */}
      <div className="xl:col-span-4">
        <ChartCard
          title="Distribuição de Orçamento"
          subtitle={budgetMode === "mensal" ? "Investimento mês a mês" : "Investimento por campanha"}
          action={
            <ToggleGroup
              options={[
                { value: "donut",  label: "Rosca"  },
                { value: "mensal", label: "Mensal"  },
                { value: "bar",    label: "Barras"  },
              ]}
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
