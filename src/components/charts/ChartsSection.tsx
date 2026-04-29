"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Area,
  AreaChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import {
  BudgetDistributionPoint,
  CampaignComparisonPoint,
  DailyTrendPoint,
} from "@/types/campaign";
import { formatCurrency, formatDatePtBr } from "@/utils/metrics";

interface ChartsSectionProps {
  dailyTrend: DailyTrendPoint[];
  campaignComparison: CampaignComparisonPoint[];
  budgetDistribution: BudgetDistributionPoint[];
}

const PIE_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
];

const MAX_PIE_ITEMS = 8;

export function ChartsSection({
  dailyTrend,
  campaignComparison,
  budgetDistribution,
}: ChartsSectionProps) {
  const [trendMode, setTrendMode] = useState<"line" | "area">("line");
  const [comparisonMode, setComparisonMode] = useState<"vertical" | "horizontal">(
    "vertical",
  );
  const [budgetMode, setBudgetMode] = useState<"pie" | "bar">("pie");

  const pieData = useMemo(() => {
    if (budgetDistribution.length <= MAX_PIE_ITEMS) {
      return budgetDistribution;
    }

    const sorted = [...budgetDistribution].sort(
      (a, b) => b.investment - a.investment,
    );
    const topItems = sorted.slice(0, MAX_PIE_ITEMS);
    const othersTotal = sorted
      .slice(MAX_PIE_ITEMS)
      .reduce((acc, item) => acc + item.investment, 0);

    return [...topItems, { campaignName: "Outros", investment: othersTotal }];
  }, [budgetDistribution]);

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            Evolução diária: Cliques vs Conversões
          </h3>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTrendMode("line")}
              className={`rounded px-2 py-1 text-xs font-medium ${
                trendMode === "line"
                  ? "bg-white text-blue-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Linha
            </button>
            <button
              type="button"
              onClick={() => setTrendMode("area")}
              className={`rounded px-2 py-1 text-xs font-medium ${
                trendMode === "area"
                  ? "bg-white text-blue-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Área
            </button>
          </div>
        </div>
        <div className="mt-4 h-80 w-full">
          {trendMode === "line" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tickFormatter={(value) => formatDatePtBr(String(value))}
                />
                <YAxis stroke="#64748b" />
                <Tooltip labelFormatter={(value) => formatDatePtBr(String(value))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Cliques"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  name="Conversões"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tickFormatter={(value) => formatDatePtBr(String(value))}
                />
                <YAxis stroke="#64748b" />
                <Tooltip labelFormatter={(value) => formatDatePtBr(String(value))} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  name="Cliques"
                  stroke="#2563eb"
                  fill="#93c5fd"
                  fillOpacity={0.45}
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  name="Conversões"
                  stroke="#0f766e"
                  fill="#5eead4"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            Distribuição de orçamento
          </h3>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setBudgetMode("pie")}
              className={`rounded px-2 py-1 text-xs font-medium ${
                budgetMode === "pie"
                  ? "bg-white text-blue-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Rosca
            </button>
            <button
              type="button"
              onClick={() => setBudgetMode("bar")}
              className={`rounded px-2 py-1 text-xs font-medium ${
                budgetMode === "bar"
                  ? "bg-white text-blue-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Barras
            </button>
          </div>
        </div>
        <div className="mt-4 h-72 w-full">
          {budgetMode === "pie" ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="investment"
                  nameKey="campaignName"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`${entry.campaignName}-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis
                  type="category"
                  dataKey="campaignName"
                  width={90}
                  tick={{ fontSize: 10 }}
                  stroke="#64748b"
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="investment" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto pr-1">
          {pieData.map((item, index) => (
            <div
              key={`${item.campaignName}-legend-${index}`}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <span className="max-w-[180px] truncate text-slate-700">
                  {item.campaignName}
                </span>
              </div>
              <span className="font-medium text-slate-900">
                {formatCurrency(item.investment)}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            Investimento vs Receita por Campanha
          </h3>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setComparisonMode("vertical")}
              className={`rounded px-2 py-1 text-xs font-medium ${
                comparisonMode === "vertical"
                  ? "bg-white text-blue-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vertical
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode("horizontal")}
              className={`rounded px-2 py-1 text-xs font-medium ${
                comparisonMode === "horizontal"
                  ? "bg-white text-blue-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Horizontal
            </button>
          </div>
        </div>
        <div className="mt-4 h-96 w-full">
          {comparisonMode === "vertical" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="campaignName" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="investment" name="Investimento" fill="#2563eb" />
                <Bar dataKey="revenue" name="Receita" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={campaignComparison}
                layout="vertical"
                margin={{ left: 20, right: 14 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis
                  type="category"
                  dataKey="campaignName"
                  width={120}
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="investment" name="Investimento" fill="#2563eb" />
                <Bar dataKey="revenue" name="Receita" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>
    </section>
  );
}
