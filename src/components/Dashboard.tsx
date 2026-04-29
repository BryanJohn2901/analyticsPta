 "use client";

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CircleDollarSign,
  Filter,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { CampaignData } from "@/types/campaign";
import {
  aggregateTotals,
  buildBudgetDistribution,
  buildCampaignComparison,
  buildDailyTrend,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/utils/metrics";
import { KpiCard } from "@/components/KpiCard";
import { ChartsSection } from "@/components/charts/ChartsSection";
import { CampaignTable } from "@/components/CampaignTable";

interface DashboardProps {
  campaigns: CampaignData[];
}

type DashboardTab = "active" | "history";
type LaunchTabId =
  | "all"
  | "biomecanica"
  | "musculacao"
  | "fisiologia"
  | "bodybuilding"
  | "feminino"
  | "funcional";

const getMonthKey = (date: string): string => date.slice(0, 7);

const LAUNCH_TABS: Array<{ id: LaunchTabId; label: string }> = [
  { id: "all", label: "Todos os lançamentos" },
  { id: "biomecanica", label: "Biomecânica" },
  { id: "musculacao", label: "Musculação Periodia" },
  { id: "fisiologia", label: "Fisiologia" },
  { id: "bodybuilding", label: "Bodybuilding" },
  { id: "feminino", label: "Treinamento Feminino" },
  { id: "funcional", label: "Treinamento Funcional" },
];

const normalizeText = (value: string): string => {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const getLaunchGroupFromCampaign = (campaignName: string): LaunchTabId => {
  const normalized = normalizeText(campaignName);

  if (normalized.includes("biomecan")) return "biomecanica";
  if (normalized.includes("muscula") || normalized.includes("periodia")) {
    return "musculacao";
  }
  if (normalized.includes("fisiologia")) return "fisiologia";
  if (normalized.includes("bodybuilding")) return "bodybuilding";
  if (normalized.includes("femin")) return "feminino";
  if (normalized.includes("funcional")) return "funcional";
  return "all";
};

export function Dashboard({ campaigns }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("active");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLaunchTab, setSelectedLaunchTab] = useState<LaunchTabId>("all");
  const [selectedSubLaunch, setSelectedSubLaunch] = useState("all");
  const [searchCampaign, setSearchCampaign] = useState("");

  const latestMonth = useMemo(() => {
    return campaigns
      .map((item) => getMonthKey(item.date))
      .sort()
      .at(-1);
  }, [campaigns]);

  const scopedByTab = useMemo(() => {
    if (!latestMonth) {
      return campaigns;
    }

    if (activeTab === "active") {
      return campaigns.filter((item) => getMonthKey(item.date) === latestMonth);
    }

    return campaigns.filter((item) => getMonthKey(item.date) !== latestMonth);
  }, [activeTab, campaigns, latestMonth]);

  const getSubLaunchCode = (campaignName: string): string => {
    const match = campaignName.match(/\b([A-Za-z]{1,4}\s?-?\d{1,2})\b/);
    if (!match?.[1]) {
      return "SEM_CODIGO";
    }
    return match[1].replace(/[\s-]/g, "").toUpperCase();
  };

  const subLaunchOptions = useMemo(() => {
    const base = scopedByTab.filter((item) => {
      if (selectedLaunchTab === "all") {
        return true;
      }
      return getLaunchGroupFromCampaign(item.campaignName) === selectedLaunchTab;
    });

    return Array.from(
      new Set(
        base
          .map((item) => getSubLaunchCode(item.campaignName))
          .filter((item) => item !== "SEM_CODIGO"),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [scopedByTab, selectedLaunchTab]);

  const effectiveSubLaunch = subLaunchOptions.includes(selectedSubLaunch)
    ? selectedSubLaunch
    : "all";

  const filteredCampaigns = useMemo(() => {
    return scopedByTab.filter((item) => {
      if (dateFrom && item.date < dateFrom) {
        return false;
      }
      if (dateTo && item.date > dateTo) {
        return false;
      }
      if (
        selectedLaunchTab !== "all" &&
        getLaunchGroupFromCampaign(item.campaignName) !== selectedLaunchTab
      ) {
        return false;
      }
      if (
        effectiveSubLaunch !== "all" &&
        getSubLaunchCode(item.campaignName) !== effectiveSubLaunch
      ) {
        return false;
      }
      if (
        searchCampaign &&
        !item.campaignName.toLowerCase().includes(searchCampaign.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    dateFrom,
    dateTo,
    effectiveSubLaunch,
    scopedByTab,
    searchCampaign,
    selectedLaunchTab,
  ]);

  const totals = aggregateTotals(filteredCampaigns);
  const dailyTrend = buildDailyTrend(filteredCampaigns);
  const campaignComparison = buildCampaignComparison(filteredCampaigns);
  const budgetDistribution = buildBudgetDistribution(filteredCampaigns);

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm animate-fade-in sm:p-6">
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("active")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                activeTab === "active"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Campanha Ativa
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                activeTab === "history"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Histórico
            </button>
          </div>

          <p className="text-xs text-slate-500">
            {activeTab === "active"
              ? `Recorte do mês mais recente (${latestMonth ?? "-"})`
              : "Recorte histórico (meses anteriores)"}
          </p>
        </div>

        <div className="mb-3 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max items-center gap-2">
            {LAUNCH_TABS.map((launchTab) => (
              <button
                key={launchTab.id}
                type="button"
                onClick={() => setSelectedLaunchTab(launchTab.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  selectedLaunchTab === launchTab.id
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {launchTab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Data inicial
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Data final
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Sub-lançamento
            <select
              value={effectiveSubLaunch}
              onChange={(event) => setSelectedSubLaunch(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Todos (TF1, TF2...)</option>
              {subLaunchOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Filtro de dados (campanha)
            <input
              type="text"
              value={searchCampaign}
              onChange={(event) => setSearchCampaign(event.target.value)}
              placeholder="Digite parte do nome"
              className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      </article>

      {filteredCampaigns.length === 0 ? (
        <article className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <Filter size={16} />
          <p className="text-sm">
            Nenhum dado encontrado para os filtros aplicados. Ajuste o período ou
            o lançamento.
          </p>
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Total Investido"
          value={formatCurrency(totals.totalInvestment)}
          subtitle={`CTR médio: ${formatPercent(totals.averageCtr)}`}
          icon={Wallet}
        />
        <KpiCard
          title="Total de Receita"
          value={formatCurrency(totals.totalRevenue)}
          subtitle={`ROAS: ${totals.roas.toFixed(2)}x`}
          icon={CircleDollarSign}
        />
        <KpiCard
          title="Total de Conversões"
          value={formatNumber(totals.totalConversions)}
          subtitle={`Tx. Conversão: ${formatPercent(totals.averageConversionRate)}`}
          icon={Target}
        />
        <KpiCard
          title="ROI Geral"
          value={formatPercent(totals.roi)}
          subtitle="Retorno sobre investimento"
          icon={TrendingUp}
        />
        <KpiCard
          title="CPA Médio"
          value={formatCurrency(totals.averageCpa)}
          subtitle="Custo por aquisição"
          icon={BadgeDollarSign}
        />
      </div>

      <ChartsSection
        dailyTrend={dailyTrend}
        campaignComparison={campaignComparison}
        budgetDistribution={budgetDistribution}
      />

      <CampaignTable campaigns={filteredCampaigns} />
    </section>
  );
}
