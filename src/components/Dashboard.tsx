"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import {
  Activity, BadgeDollarSign, BarChart2, BookOpen, CircleDollarSign,
  Dumbbell, FileUp, Filter, ImageIcon, Link2, Loader2, Target,
  TrendingUp, Trophy, Upload, Users, Wallet, X, Zap,
} from "lucide-react";
import { CampaignData } from "@/types/campaign";
import { CampaignConfig, useCampaignStore } from "@/hooks/useCampaignStore";
import { loadMetaCredentials, saveMetaCredentials } from "@/utils/metaApi";
import {
  aggregateByCampaign, aggregateTotals, buildBudgetDistribution,
  buildCampaignComparison, buildDailyTrend, formatCurrency, formatNumber, formatPercent,
} from "@/utils/metrics";
import { KpiCard } from "@/components/KpiCard";
import { ChartsSection } from "@/components/charts/ChartsSection";
import { CampaignTable } from "@/components/CampaignTable";
import { CampaignAnalysis } from "@/components/CampaignAnalysis";
import { HistoricalView } from "@/components/HistoricalView";
import { BestCreatives } from "@/components/BestCreatives";
import { ProfileAnalysis } from "@/components/ProfileAnalysis";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardProps {
  campaigns: CampaignData[];
  error?: string | null;
  onImportCsv: (file: File) => Promise<void>;
  onImportUrl: (url: string) => Promise<void>;
}

type MainTab = "overview" | "history" | "analysis" | "creatives" | "profiles";

// ─── Nav config ───────────────────────────────────────────────────────────────

const MAIN_TABS: Array<{ id: MainTab; label: string; icon: React.ElementType }> = [
  { id: "overview",  label: "Visão Geral",             icon: TrendingUp },
  { id: "history",   label: "Histórico de Lançamento", icon: Wallet },
  { id: "analysis",  label: "Análise da Campanha",     icon: BarChart2 },
  { id: "creatives", label: "Melhores Criativos",      icon: ImageIcon },
  { id: "profiles",  label: "Análise por Perfil",      icon: Users },
];

// ─── Campaign groups ──────────────────────────────────────────────────────────

interface GroupConfig {
  id: string; label: string; icon: React.ElementType;
  iconBg: string; iconColor: string; dotActive: string; selectedBg: string; selectedText: string;
}

const CAMPAIGN_GROUPS: GroupConfig[] = [
  { id: "biomecanica",  label: "Biomecânica",        icon: BookOpen,  iconBg: "bg-blue-100",    iconColor: "text-blue-600",    dotActive: "bg-blue-500",    selectedBg: "bg-blue-50",    selectedText: "text-blue-700" },
  { id: "musculacao",   label: "Musculação",          icon: Dumbbell,  iconBg: "bg-purple-100",  iconColor: "text-purple-600",  dotActive: "bg-purple-500",  selectedBg: "bg-purple-50",  selectedText: "text-purple-700" },
  { id: "fisiologia",   label: "Fisiologia",          icon: Activity,  iconBg: "bg-emerald-100", iconColor: "text-emerald-600", dotActive: "bg-emerald-500", selectedBg: "bg-emerald-50", selectedText: "text-emerald-700" },
  { id: "bodybuilding", label: "Bodybuilding",        icon: Trophy,    iconBg: "bg-orange-100",  iconColor: "text-orange-600",  dotActive: "bg-orange-500",  selectedBg: "bg-orange-50",  selectedText: "text-orange-700" },
  { id: "feminino",     label: "Trein. Feminino",     icon: Users,     iconBg: "bg-pink-100",    iconColor: "text-pink-600",    dotActive: "bg-pink-500",    selectedBg: "bg-pink-50",    selectedText: "text-pink-700" },
  { id: "funcional",    label: "Trein. Funcional",    icon: Zap,       iconBg: "bg-teal-100",    iconColor: "text-teal-600",    dotActive: "bg-teal-500",    selectedBg: "bg-teal-50",    selectedText: "text-teal-700" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeText = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const getLaunchGroup = (name: string): string => {
  const n = normalizeText(name);
  if (n.includes("biomecan")) return "biomecanica";
  if (n.includes("muscula") || n.includes("periodia")) return "musculacao";
  if (n.includes("fisiologia")) return "fisiologia";
  if (n.includes("bodybuilding")) return "bodybuilding";
  if (n.includes("femin")) return "feminino";
  if (n.includes("funcional")) return "funcional";
  return "";
};

const getSubLaunchCode = (name: string): string => {
  const match = name.match(/\b([A-Za-z]{1,4}\s?-?\d{1,2})\b/);
  if (!match?.[1]) return "";
  return match[1].replace(/[\s-]/g, "").toUpperCase();
};

// ─── Import popover ───────────────────────────────────────────────────────────

type ImportTab = "sheets" | "csv" | "meta";

interface ImportPopoverProps {
  onImportCsv: (file: File) => Promise<void>;
  onImportUrl: (url: string) => Promise<void>;
  campaignConfigs: Record<string, CampaignConfig>;
  onSaveCampaignConfig: (group: string, config: CampaignConfig) => void;
  onClose: () => void;
}

function ImportPopover({
  onImportCsv, onImportUrl, campaignConfigs, onSaveCampaignConfig, onClose,
}: ImportPopoverProps) {
  const [tab, setTab]           = useState<ImportTab>("sheets");
  const [url, setUrl]           = useState("");
  const [loading, setLoading]   = useState<"url" | "csv" | null>(null);
  const [accessToken, setAccessToken] = useState(() => loadMetaCredentials().accessToken);
  const [adAccountIds, setAdAccountIds] = useState<Record<string, string>>(() =>
    Object.fromEntries(CAMPAIGN_GROUPS.map((g) => [g.id, campaignConfigs[g.id]?.adAccountId ?? ""])),
  );
  const [metaSaved, setMetaSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrl = async (e: FormEvent) => {
    e.preventDefault();
    setLoading("url");
    try { await onImportUrl(url); onClose(); } finally { setLoading(null); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading("csv");
    try { await onImportCsv(file); onClose(); } finally { setLoading(null); e.target.value = ""; }
  };

  const handleSaveMeta = (e: FormEvent) => {
    e.preventDefault();
    saveMetaCredentials({ accessToken });
    CAMPAIGN_GROUPS.forEach((g) => {
      const id = adAccountIds[g.id]?.trim();
      if (id) onSaveCampaignConfig(g.id, { adAccountId: id });
    });
    setMetaSaved(true);
    setTimeout(() => setMetaSaved(false), 2000);
  };

  const tabCls = (t: ImportTab) =>
    `flex-1 rounded-md py-1.5 text-xs font-medium transition ${
      tab === t ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
    }`;

  const inputCls = "h-8 w-full rounded-md border border-slate-300 px-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200";

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Importar dados</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-0.5">
        <button className={tabCls("sheets")} onClick={() => setTab("sheets")}>Google Sheets</button>
        <button className={tabCls("csv")}    onClick={() => setTab("csv")}>CSV</button>
        <button className={tabCls("meta")}   onClick={() => setTab("meta")}>Meta Ads API</button>
      </div>

      {tab === "sheets" && (
        <form onSubmit={handleUrl}>
          <p className="mb-1.5 text-xs font-medium text-slate-600">URL da planilha</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/..."
                className="h-8 w-full rounded-md border border-slate-300 pl-7 pr-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <button type="submit" disabled={!!loading}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60">
              {loading === "url" ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
            </button>
          </div>
        </form>
      )}

      {tab === "csv" && (
        <>
          <p className="mb-1.5 text-xs font-medium text-slate-600">Arquivo CSV de campanhas</p>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!loading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 py-3 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-60">
            {loading === "csv" ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {loading === "csv" ? "Importando…" : "Escolher arquivo .csv"}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </>
      )}

      {tab === "meta" && (
        <form onSubmit={handleSaveMeta} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Access Token
            </label>
            <input
              type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAxxxxx…" className={inputCls}
            />
            <p className="mt-0.5 text-[10px] text-slate-400">
              Gere em Meta for Developers → Graph API Explorer
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">Ad Account ID por campanha</p>
            <div className="space-y-1.5">
              {CAMPAIGN_GROUPS.map((g) => (
                <label key={g.id} className="flex items-center gap-2">
                  <span className="w-32 truncate text-xs text-slate-500">{g.label}</span>
                  <input
                    value={adAccountIds[g.id] ?? ""}
                    onChange={(e) => setAdAccountIds((p) => ({ ...p, [g.id]: e.target.value }))}
                    placeholder="act_123456789"
                    className={`${inputCls} flex-1`}
                  />
                </label>
              ))}
            </div>
          </div>
          <button type="submit"
            className={`flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold text-white transition ${metaSaved ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"}`}>
            {metaSaved ? "Salvo!" : "Salvar credenciais"}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Dashboard({ campaigns, error, onImportCsv, onImportUrl }: DashboardProps) {
  const [mainTab, setMainTab]           = useState<MainTab>("overview");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [searchCampaign, setSearchCampaign] = useState("");
  const [showImport, setShowImport]     = useState(false);

  const {
    selectedGroup, selectedTurma, activeCampaigns, campaignConfigs,
    setSelectedGroup, setSelectedTurma, toggleActive, setCampaignConfig,
  } = useCampaignStore();

  // Turmas per group derived from loaded data
  const turmasByGroup = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, Set<string>> = {};
    campaigns.forEach((item) => {
      const group = getLaunchGroup(item.campaignName);
      if (!group) return;
      const code = getSubLaunchCode(item.campaignName);
      if (!code) return;
      (map[group] ??= new Set()).add(code);
    });
    return Object.fromEntries(
      Object.entries(map).map(([g, s]) => [
        g,
        Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
      ]),
    );
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((item) => {
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo   && item.date > dateTo)   return false;
      if (selectedGroup !== "all" && getLaunchGroup(item.campaignName) !== selectedGroup) return false;
      if (selectedTurma !== "all" && getSubLaunchCode(item.campaignName) !== selectedTurma) return false;
      if (searchCampaign && !item.campaignName.toLowerCase().includes(searchCampaign.toLowerCase())) return false;
      return true;
    });
  }, [campaigns, dateFrom, dateTo, selectedGroup, selectedTurma, searchCampaign]);

  const totals             = aggregateTotals(filteredCampaigns);
  const dailyTrend         = buildDailyTrend(filteredCampaigns);
  const campaignComparison = buildCampaignComparison(filteredCampaigns);
  const budgetDistribution = buildBudgetDistribution(filteredCampaigns);
  const aggregated         = useMemo(() => aggregateByCampaign(filteredCampaigns), [filteredCampaigns]);

  // Right panel is only shown on tabs where campaign filter is relevant
  const showRightPanel = mainTab !== "history" && mainTab !== "profiles";

  const currentTabLabel = MAIN_TABS.find((t) => t.id === mainTab)?.label ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">

      {/* ── Left sidebar ── */}
      <aside className="flex w-[220px] flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <TrendingUp size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900">Analytics PTA</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Menu</p>
          <ul className="space-y-0.5">
            {MAIN_TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => setMainTab(id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    mainTab === id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-slate-200 p-4">
          <p className="text-xs text-slate-400">
            {campaigns.length > 0
              ? `${campaigns.length} registros carregados`
              : "Nenhum dado importado"}
          </p>
        </div>
      </aside>

      {/* ── Center: header + content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-400">Dashboard</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">{currentTabLabel}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowImport((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FileUp size={13} />
              Importar dados
            </button>
            {showImport && (
              <ImportPopover
                onImportCsv={onImportCsv}
                onImportUrl={onImportUrl}
                campaignConfigs={campaignConfigs}
                onSaveCampaignConfig={setCampaignConfig}
                onClose={() => setShowImport(false)}
              />
            )}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <span className="font-semibold">Erro:</span> {error}
          </div>
        )}

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">

          {mainTab === "overview" && (
            campaigns.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <TrendingUp size={24} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Nenhum dado de campanha carregado</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Clique em <strong>Importar dados</strong> no canto superior direito para começar.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {campaigns.length > 0 && filteredCampaigns.length === 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
                    <Filter size={15} />
                    <p className="text-sm">Nenhum dado para os filtros aplicados.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <KpiCard title="Total Investido"     value={formatCurrency(totals.totalInvestment)} subtitle={`CTR médio: ${formatPercent(totals.averageCtr)}`}               icon={Wallet} />
                  <KpiCard title="Total de Receita"    value={formatCurrency(totals.totalRevenue)}    subtitle={`ROAS: ${totals.roas.toFixed(2)}x`}                              icon={CircleDollarSign} />
                  <KpiCard title="Total de Conversões" value={formatNumber(totals.totalConversions)}  subtitle={`Tx. Conversão: ${formatPercent(totals.averageConversionRate)}`} icon={Target} />
                  <KpiCard title="ROI Geral"           value={formatPercent(totals.roi)}             subtitle="Retorno sobre investimento"                                       icon={TrendingUp} />
                  <KpiCard title="CPA Médio"           value={formatCurrency(totals.averageCpa)}     subtitle="Custo por aquisição"                                              icon={BadgeDollarSign} />
                </div>
                <ChartsSection dailyTrend={dailyTrend} campaignComparison={campaignComparison} budgetDistribution={budgetDistribution} />
                <CampaignTable campaigns={filteredCampaigns} />
              </div>
            )
          )}

          {mainTab === "history"   && <HistoricalView />}
          {mainTab === "analysis"  && <CampaignAnalysis campaigns={aggregated} />}
          {mainTab === "creatives" && <BestCreatives campaigns={aggregated} />}
          {mainTab === "profiles"  && (
            <ProfileAnalysis
              selectedGroup={selectedGroup}
              adAccountId={campaignConfigs[selectedGroup]?.adAccountId ?? ""}
              groupLabel={CAMPAIGN_GROUPS.find((g) => g.id === selectedGroup)?.label ?? selectedGroup}
            />
          )}

        </main>
      </div>

      {/* ── Right sidebar: campaign panel ── */}
      {showRightPanel && (
        <aside className="flex w-[264px] flex-shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">

          {/* Panel header */}
          <div className="flex h-14 flex-shrink-0 items-center border-b border-slate-200 px-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Campanhas</p>
          </div>

          {/* Campaign list */}
          <div className="flex-1 overflow-y-auto py-2">
            {CAMPAIGN_GROUPS.map((group) => {
              const Icon = group.icon;
              const isSelected = selectedGroup === group.id;
              const isActive   = activeCampaigns[group.id] ?? false;
              const turmaList  = turmasByGroup[group.id] ?? [];

              return (
                <div key={group.id}>
                  <button
                    onClick={() => setSelectedGroup(isSelected ? "all" : group.id)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition ${
                      isSelected ? group.selectedBg : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Active status dot */}
                    <span
                      title={isActive ? "Ativa" : "Inativa"}
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isActive ? group.dotActive : "bg-slate-300"}`}
                    />

                    {/* Icon */}
                    <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${group.iconBg}`}>
                      <Icon size={12} className={group.iconColor} />
                    </div>

                    {/* Label */}
                    <span className={`flex-1 text-xs font-medium ${isSelected ? group.selectedText : "text-slate-700"}`}>
                      {group.label}
                    </span>

                    {/* Active checkbox */}
                    <label
                      className="flex items-center"
                      onClick={(e) => e.stopPropagation()}
                      title="Marcar como ativa"
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => toggleActive(group.id, e.target.checked)}
                        className="h-3 w-3 rounded accent-blue-600"
                      />
                    </label>
                  </button>

                  {/* Turma sub-items (only when this campaign is selected) */}
                  {isSelected && (
                    <div className={`${group.selectedBg} border-b border-slate-100 px-4 pb-2.5`}>
                      <div className="ml-[26px] flex flex-wrap gap-1.5 pt-1">
                        <button
                          onClick={() => setSelectedTurma("all")}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                            selectedTurma === "all"
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Todas
                        </button>
                        {turmaList.map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTurma(t)}
                            className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                              selectedTurma === t
                                ? "bg-blue-600 text-white"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                        {turmaList.length === 0 && (
                          <span className="text-[11px] italic text-slate-400">Sem turmas nos dados</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filters section */}
          <div className="border-t border-slate-200 p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Filtros</p>

            <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
              Data inicial
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
              Data final
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
              Buscar campanha
              <input
                type="text"
                value={searchCampaign}
                onChange={(e) => setSearchCampaign(e.target.value)}
                placeholder="Nome da campanha…"
                className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </label>

            {(dateFrom || dateTo || searchCampaign || selectedGroup !== "all") && (
              <button
                onClick={() => {
                  setDateFrom(""); setDateTo("");
                  setSearchCampaign(""); setSelectedGroup("all");
                }}
                className="w-full rounded-md border border-slate-200 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </aside>
      )}

    </div>
  );
}
