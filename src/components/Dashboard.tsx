"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, BadgeDollarSign, BarChart2, BookMarked, BookOpen, CalendarDays,
  CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign, Dumbbell, FileText,
  FileUp, Filter, Flag, GraduationCap, Home, ImageIcon, Link2, Loader2, Menu, Moon,
  MousePointerClick, Package, Plus, Repeat, RotateCcw, SlidersHorizontal, Sun,
  Target, Trash2, TrendingUp, Trophy, Upload, Users, Wallet, X, XCircle, Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { CampaignData, ProductCategory } from "@/types/campaign";
import { CampaignConfig, CampaignSummary, CustomGroup, GroupSection, useCampaignStore } from "@/hooks/useCampaignStore";
import { classifyCampaign, classifyCourse } from "@/utils/campaignClassifier";
import {
  fetchMetaAdAccounts, fetchMetaCampaigns, loadMetaCredentials, saveMetaCredentials,
} from "@/utils/metaApi";
import type { MetaAdAccount, MetaCampaign } from "@/utils/metaApi";
import { CategoryGate, CATEGORY_LABEL, CATEGORY_ICON, CATEGORY_DOT } from "@/components/CategoryGate";
import {
  aggregateByCampaign, aggregateTotals, buildBudgetDistribution,
  buildCampaignComparison, buildDailyTrend, formatCurrency, formatNumber, formatPercent,
} from "@/utils/metrics";
import { KpiCard } from "@/components/KpiCard";
import { FunnelCard } from "@/components/FunnelCard";
import { ChartsSection } from "@/components/charts/ChartsSection";
import { CampaignTable } from "@/components/CampaignTable";
import { useGoalsStore, type Goals } from "@/hooks/useGoalsStore";
import { CampaignAnalysis } from "@/components/CampaignAnalysis";
import { HistoricalView } from "@/components/HistoricalView";
import { BestCreatives } from "@/components/BestCreatives";
import { ProfileAnalysis } from "@/components/ProfileAnalysis";
import { ProductBase } from "@/components/products/ProductBase";
import { DashMonsterLogo } from "@/components/DashMonsterLogo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataSource {
  type: "google_sheets" | "csv" | "meta";
  label: string;
}

interface DashboardProps {
  campaigns: CampaignData[];
  error?: string | null;
  dataSource?: DataSource | null;
  onImportCsv: (file: File) => Promise<void>;
  onImportUrl: (url: string) => Promise<void>;
  onImportMeta?: (accounts: Record<string, string>, dateFrom: string, dateTo: string, campaignFilter?: Record<string, string[]>) => Promise<void>;
  onDisconnect?: () => Promise<void>;
}

type MainTab = "overview" | "history" | "analysis" | "creatives" | "profiles" | "products";

type SortBy = "date-desc" | "date-asc" | "invest-desc" | "invest-asc" | "roas-desc" | "ctr-desc";

const SORT_LABELS: Record<SortBy, string> = {
  "date-desc":   "Mais recente",
  "date-asc":    "Mais antigo",
  "invest-desc": "Maior investimento",
  "invest-asc":  "Menor investimento",
  "roas-desc":   "Maior ROAS",
  "ctr-desc":    "Maior CTR",
};

// ─── Nav config ───────────────────────────────────────────────────────────────

const MAIN_TABS: Array<{ id: MainTab; label: string; shortLabel: string; icon: React.ElementType }> = [
  { id: "overview",  label: "Visão Geral",      shortLabel: "Visão Geral",  icon: TrendingUp },
  { id: "history",   label: "Histórico",         shortLabel: "Histórico",    icon: Wallet },
  { id: "analysis",  label: "Análise",           shortLabel: "Análise",      icon: BarChart2 },
  { id: "creatives", label: "Criativos",         shortLabel: "Criativos",    icon: ImageIcon },
  { id: "profiles",  label: "Perfil de Anúncio", shortLabel: "Perfil",       icon: Users },
  { id: "products",  label: "Base de Produtos",  shortLabel: "Produtos",     icon: Package },
];

// ─── Campaign groups ──────────────────────────────────────────────────────────

interface GroupConfig {
  id: string; label: string; icon: React.ElementType;
  section: GroupSection;
  iconBg: string; iconColor: string;
  activeDot: string; activePulse: string;
  selectedBg: string; selectedText: string; selectedBorder: string;
}

const CAMPAIGN_GROUPS: GroupConfig[] = [
  // ── Pós Graduação ──────────────────────────────────────────────────────────
  { section: "pos", id: "biomecanica",  label: "Biomecânica (BM)",           icon: BookOpen,    iconBg: "bg-blue-100",    iconColor: "text-blue-600",    activeDot: "bg-blue-500",    activePulse: "bg-blue-400",    selectedBg: "bg-blue-50",    selectedText: "text-blue-700",    selectedBorder: "border-blue-200" },
  { section: "pos", id: "musculacao",   label: "Musculação (MPA)",            icon: Dumbbell,    iconBg: "bg-purple-100",  iconColor: "text-purple-600",  activeDot: "bg-purple-500",  activePulse: "bg-purple-400",  selectedBg: "bg-purple-50",  selectedText: "text-purple-700",  selectedBorder: "border-purple-200" },
  { section: "pos", id: "fisiologia",   label: "Fisiologia (FE)",             icon: Activity,    iconBg: "bg-emerald-100", iconColor: "text-emerald-600", activeDot: "bg-emerald-500", activePulse: "bg-emerald-400", selectedBg: "bg-emerald-50", selectedText: "text-emerald-700", selectedBorder: "border-emerald-200" },
  { section: "pos", id: "bodybuilding", label: "Bodybuilding (BB)",           icon: Trophy,      iconBg: "bg-orange-100",  iconColor: "text-orange-600",  activeDot: "bg-orange-500",  activePulse: "bg-orange-400",  selectedBg: "bg-orange-50",  selectedText: "text-orange-700",  selectedBorder: "border-orange-200" },
  { section: "pos", id: "feminino",     label: "Trein. Feminino (SM)",        icon: Users,       iconBg: "bg-pink-100",    iconColor: "text-pink-600",    activeDot: "bg-pink-500",    activePulse: "bg-pink-400",    selectedBg: "bg-pink-50",    selectedText: "text-pink-700",    selectedBorder: "border-pink-200" },
  { section: "pos", id: "funcional",    label: "Trein. Funcional (TF)",       icon: Zap,         iconBg: "bg-teal-100",    iconColor: "text-teal-600",    activeDot: "bg-teal-500",    activePulse: "bg-teal-400",    selectedBg: "bg-teal-50",    selectedText: "text-teal-700",    selectedBorder: "border-teal-200" },
  // ── Livros ─────────────────────────────────────────────────────────────────
  { section: "livros",   id: "livros",       label: "Livro de Biomecânica",   icon: BookMarked,  iconBg: "bg-green-100",   iconColor: "text-green-600",   activeDot: "bg-green-500",   activePulse: "bg-green-400",   selectedBg: "bg-green-50",   selectedText: "text-green-700",   selectedBorder: "border-green-200" },
  { section: "livros",   id: "livroMarketing", label: "Livro de Marketing",   icon: BookMarked,  iconBg: "bg-green-100",   iconColor: "text-green-600",   activeDot: "bg-green-500",   activePulse: "bg-green-400",   selectedBg: "bg-green-50",   selectedText: "text-green-700",   selectedBorder: "border-green-200" },
  // ── Ebooks ─────────────────────────────────────────────────────────────────
  { section: "ebooks",   id: "ebookJoelho",  label: "Ebook Bio Joelho",       icon: FileText,    iconBg: "bg-violet-100",  iconColor: "text-violet-600",  activeDot: "bg-violet-500",  activePulse: "bg-violet-400",  selectedBg: "bg-violet-50",  selectedText: "text-violet-700",  selectedBorder: "border-violet-200" },
  { section: "ebooks",   id: "ebookColuna",  label: "Ebook Bio Coluna",       icon: FileText,    iconBg: "bg-violet-100",  iconColor: "text-violet-600",  activeDot: "bg-violet-500",  activePulse: "bg-violet-400",  selectedBg: "bg-violet-50",  selectedText: "text-violet-700",  selectedBorder: "border-violet-200" },
  // ── Perpétuo ───────────────────────────────────────────────────────────────
  { section: "perpetuo", id: "perpetuo",     label: "Notável Play",           icon: Repeat,      iconBg: "bg-amber-100",   iconColor: "text-amber-600",   activeDot: "bg-amber-500",   activePulse: "bg-amber-400",   selectedBg: "bg-amber-50",   selectedText: "text-amber-700",   selectedBorder: "border-amber-200" },
  // ── Eventos ────────────────────────────────────────────────────────────────
  { section: "eventos",  id: "bs",           label: "Biomechanic Specialist", icon: CalendarDays,iconBg: "bg-rose-100",    iconColor: "text-rose-600",    activeDot: "bg-rose-500",    activePulse: "bg-rose-400",    selectedBg: "bg-rose-50",    selectedText: "text-rose-700",    selectedBorder: "border-rose-200" },
  { section: "eventos",  id: "mentoria",     label: "Mentoria Scala",         icon: CalendarDays,iconBg: "bg-red-100",     iconColor: "text-red-600",     activeDot: "bg-red-500",     activePulse: "bg-red-400",     selectedBg: "bg-red-50",     selectedText: "text-red-700",     selectedBorder: "border-red-200" },
  { section: "eventos",  id: "next",         label: "Next",                   icon: CalendarDays,iconBg: "bg-rose-100",    iconColor: "text-rose-600",    activeDot: "bg-rose-500",    activePulse: "bg-rose-400",    selectedBg: "bg-rose-50",    selectedText: "text-rose-700",    selectedBorder: "border-rose-200" },
  { section: "eventos",  id: "powertrainer", label: "Power Trainer",          icon: CalendarDays,iconBg: "bg-red-100",     iconColor: "text-red-600",     activeDot: "bg-red-500",     activePulse: "bg-red-400",     selectedBg: "bg-red-50",     selectedText: "text-red-700",     selectedBorder: "border-red-200" },
];

// Default styles for custom-created groups (keyed by section)
const SECTION_DEFAULTS: Record<GroupSection, Omit<GroupConfig, "id" | "label" | "section">> = {
  pos:      { icon: GraduationCap, iconBg: "bg-blue-100",   iconColor: "text-blue-600",   activeDot: "bg-blue-500",   activePulse: "bg-blue-400",   selectedBg: "bg-blue-50",   selectedText: "text-blue-700",   selectedBorder: "border-blue-200" },
  livros:   { icon: BookMarked,    iconBg: "bg-green-100",  iconColor: "text-green-600",  activeDot: "bg-green-500",  activePulse: "bg-green-400",  selectedBg: "bg-green-50",  selectedText: "text-green-700",  selectedBorder: "border-green-200" },
  ebooks:   { icon: FileText,      iconBg: "bg-violet-100", iconColor: "text-violet-600", activeDot: "bg-violet-500", activePulse: "bg-violet-400", selectedBg: "bg-violet-50", selectedText: "text-violet-700", selectedBorder: "border-violet-200" },
  perpetuo: { icon: Repeat,        iconBg: "bg-amber-100",  iconColor: "text-amber-600",  activeDot: "bg-amber-500",  activePulse: "bg-amber-400",  selectedBg: "bg-amber-50",  selectedText: "text-amber-700",  selectedBorder: "border-amber-200" },
  eventos:  { icon: CalendarDays,  iconBg: "bg-rose-100",   iconColor: "text-rose-600",   activeDot: "bg-rose-500",   activePulse: "bg-rose-400",   selectedBg: "bg-rose-50",   selectedText: "text-rose-700",   selectedBorder: "border-rose-200" },
};

const SECTION_LABELS: Record<GroupSection, string> = {
  pos:      "Pós Graduação",
  livros:   "Livros",
  ebooks:   "Ebooks",
  perpetuo: "Perpétuo",
  eventos:  "Eventos",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// classifyCourse lives in campaignClassifier.ts — re-exported here as alias
// for backwards-compatibility with local call sites.
const getLaunchGroup = classifyCourse;

const getSubLaunchCode = (name: string): string => {
  const match = name.match(/\b([A-Za-z]{1,4}\s?-?\d{1,2})\b/);
  if (!match?.[1]) return "";
  return match[1].replace(/[\s-]/g, "").toUpperCase();
};

// ─── Goals Panel ─────────────────────────────────────────────────────────────

interface GoalField {
  key: keyof Goals;
  label: string;
  placeholder: string;
  prefix?: string;
  suffix?: string;
}

const GOAL_FIELDS: GoalField[] = [
  { key: "ctr",         label: "CTR",         placeholder: "Ex: 2.0",  suffix: "%" },
  { key: "roas",        label: "ROAS",        placeholder: "Ex: 3.0",  suffix: "x" },
  { key: "roi",         label: "ROI",         placeholder: "Ex: 200",  suffix: "%" },
  { key: "cpa",         label: "CPA",         placeholder: "Ex: 50",   prefix: "R$" },
  { key: "cpc",         label: "CPC",         placeholder: "Ex: 1.50", prefix: "R$" },
  { key: "cpm",         label: "CPM",         placeholder: "Ex: 15",   prefix: "R$" },
  { key: "conversions", label: "Conversões",  placeholder: "Ex: 100"  },
  { key: "investment",  label: "Orçamento",   placeholder: "Ex: 5000", prefix: "R$" },
];

function GoalsPanel({
  goals, groupLabel, onSetGoal, onReset, onClose,
}: {
  goals: Goals;
  groupLabel: string;
  onSetGoal: <K extends keyof Goals>(key: K, value: Goals[K]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Flag size={14} className="text-brand" />
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Metas de Performance</p>
            </div>
            <p className="pl-[22px] text-[10px] text-slate-400 dark:text-slate-500">
              {groupLabel}
            </p>
          </div>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={14} />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-4 text-[11px] text-slate-400 dark:text-slate-500">
            Defina metas para cada métrica. Os KPIs mostrarão progresso em tempo real.
          </p>
          <div className="space-y-3">
            {GOAL_FIELDS.map(({ key, label, placeholder, prefix, suffix }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-24 flex-shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                <div className="relative flex-1">
                  {prefix && (
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">{prefix}</span>
                  )}
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={goals[key] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      onSetGoal(key, v as Goals[typeof key]);
                    }}
                    placeholder={placeholder}
                    className={`h-8 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-400 ${prefix ? "pl-7 pr-3" : suffix ? "pl-3 pr-7" : "px-3"}`}
                  />
                  {suffix && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">{suffix}</span>
                  )}
                </div>
                {goals[key] != null && (
                  <button type="button" onClick={() => onSetGoal(key, null as Goals[typeof key])}
                    className="flex-shrink-0 text-slate-300 transition hover:text-red-400 dark:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={onReset}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400">
            <RotateCcw size={11} /> Limpar todas as metas
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
      title="Alternar tema"
    >
      <Sun size={15} className="hidden dark:block" />
      <Moon size={15} className="block dark:hidden" />
    </button>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked, onChange, activeBg,
}: { checked: boolean; onChange: (v: boolean) => void; activeBg: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? activeBg : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-200 ${
          checked ? "left-[14px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

// ─── Import popover ───────────────────────────────────────────────────────────

type ImportTab = "sheets" | "csv" | "meta";

type DatePreset = "7d" | "14d" | "30d" | "90d" | "max";

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  "7d":  "7 dias",
  "14d": "14 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  "max": "Todo período",
};

function dateRangeFromPreset(preset: DatePreset): { from: string; to: string } {
  const fmt  = (d: Date) => d.toISOString().slice(0, 10);
  const to   = new Date();
  const from = new Date();
  if (preset === "max") {
    from.setFullYear(to.getFullYear() - 3); // Meta supports ~37 months max
  } else {
    const days = preset === "7d" ? 7 : preset === "14d" ? 14 : preset === "30d" ? 30 : 90;
    from.setDate(to.getDate() - days + 1);
  }
  return { from: fmt(from), to: fmt(to) };
}

interface ImportPopoverProps {
  onImportCsv: (file: File) => Promise<void>;
  onImportUrl: (url: string) => Promise<void>;
  onImportMeta?: (accounts: Record<string, string>, dateFrom: string, dateTo: string, campaignFilter?: Record<string, string[]>) => Promise<void>;
  campaignConfigs: Record<string, CampaignConfig>;
  onSaveCampaignConfig: (group: string, config: CampaignConfig) => void;
  onClose: () => void;
  onCampaignsVerified: (groupId: string, campaigns: CampaignSummary[]) => void;
  savedCampaignsByGroup: Record<string, CampaignSummary[]>;
  savedSelectedCampaigns: Record<string, string[]>;
  onSaveCampaignSelection: (groupId: string, ids: string[]) => void;
  customGroups: CustomGroup[];
  onAddCustomGroup: (group: CustomGroup) => void;
}

// ─── Account row (dynamic "add what you need" UX) ─────────────────────────────
interface AccountRow { rowId: string; groupId: string; accountId: string }

function ImportPopover({
  onImportCsv, onImportUrl, onImportMeta, campaignConfigs, onSaveCampaignConfig, onClose,
  onCampaignsVerified, savedCampaignsByGroup, savedSelectedCampaigns, onSaveCampaignSelection,
  customGroups, onAddCustomGroup, initialTab,
}: ImportPopoverProps & { initialTab?: ImportTab }) {
  const [tab, setTab]                     = useState<ImportTab>(initialTab ?? "sheets");
  const [url, setUrl]                     = useState("");
  const [loading, setLoading]             = useState<"url" | "csv" | null>(null);
  const [accessToken, setAccessToken]     = useState(() => loadMetaCredentials().accessToken);

  // Rows: only groups that already have a saved account appear on open;
  // user adds/removes rows freely with the + / × buttons.
  const [accountRows, setAccountRows]     = useState<AccountRow[]>(() =>
    Object.entries(campaignConfigs)
      .filter(([, cfg]) => cfg?.adAccountId?.trim())
      .map(([groupId, cfg]) => ({ rowId: groupId, groupId, accountId: cfg.adAccountId })),
  );

  // Derived lookup — compatible with all handlers that key by groupId
  const adAccountIds = Object.fromEntries(accountRows.map((r) => [r.groupId, r.accountId]));

  const [metaSaved, setMetaSaved]         = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [metaAccounts, setMetaAccounts]   = useState<MetaAdAccount[]>([]);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [openDropdownRow, setOpenDropdownRow] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect]   = useState<{ top: number; left: number; width: number } | null>(null);
  const inputWrapperRefs                  = useRef<Map<string, HTMLDivElement>>(new Map());
  const [datePreset, setDatePreset]       = useState<DatePreset>("30d");
  const dateRange = dateRangeFromPreset(datePreset);
  // Show the full accounts section only after "Conectar" or if accounts were previously saved
  const showAccountsSection = metaAccounts.length > 0 || accountRows.some((r) => r.accountId.trim());
  const [importingMeta, setImportingMeta] = useState(false);
  const [metaImportError, setMetaImportError] = useState<string | null>(null);
  const fileRef                           = useRef<HTMLInputElement>(null);

  // Open account dropdown anchored to the input wrapper via fixed positioning
  const openAccountDropdown = useCallback((rowId: string) => {
    if (openDropdownRow === rowId) { setOpenDropdownRow(null); setDropdownRect(null); return; }
    const el = inputWrapperRefs.current.get(rowId);
    if (el) {
      const r = el.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 2, left: r.left, width: r.width });
    }
    setOpenDropdownRow(rowId);
  }, [openDropdownRow]);

  // ── All groups (static + custom) ────────────────────────────────────────────
  const allGroupsInPopover = useMemo<GroupConfig[]>(() => [
    ...CAMPAIGN_GROUPS,
    ...customGroups.map((cg): GroupConfig => ({
      ...SECTION_DEFAULTS[cg.section as GroupSection],
      id: cg.id,
      label: cg.label,
      section: cg.section as GroupSection,
    })),
  ], [customGroups]);

  // ── Add-campaign multi-step wizard ──────────────────────────────────────────
  type WizardStep = "idle" | "section" | "group" | "new-name";
  const [wizardStep, setWizardStep]         = useState<WizardStep>("idle");
  const [wizardSection, setWizardSection]   = useState<GroupSection | null>(null);
  const [wizardNewName, setWizardNewName]   = useState("");

  const wizardGroupsForSection = useMemo(
    () => allGroupsInPopover.filter((g) => g.section === wizardSection),
    [allGroupsInPopover, wizardSection],
  );

  const usedGroupIds = new Set(accountRows.map((r) => r.groupId));

  const handleWizardSelectGroup = (groupId: string) => {
    setAccountRows((p) => [...p, { rowId: `row-${Date.now()}`, groupId, accountId: "" }]);
    setWizardStep("idle"); setWizardSection(null); setWizardNewName("");
  };

  const handleWizardCreateNew = () => {
    const name = wizardNewName.trim();
    if (!name || !wizardSection) return;
    const id = `custom-${wizardSection}-${Date.now()}`;
    onAddCustomGroup({ id, label: name, section: wizardSection });
    setAccountRows((p) => [...p, { rowId: `row-${Date.now()}`, groupId: id, accountId: "" }]);
    setWizardStep("idle"); setWizardSection(null); setWizardNewName("");
  };

  const cancelWizard = () => { setWizardStep("idle"); setWizardSection(null); setWizardNewName(""); };

  // ── Campaign picker state ────────────────────────────────────────────────────
  // campaigns fetched per ad-account ID (shared across groups using the same account)
  const [campaignsByAccount, setCampaignsByAccount] = useState<Record<string, MetaCampaign[]>>({});
  // per-group: which campaign IDs are selected — init from persisted store
  const [selectedCampaigns, setSelectedCampaigns]   = useState<Record<string, string[]>>(() => ({ ...savedSelectedCampaigns }));
  // per-group: expand/collapse campaign list
  const [expandedGroup, setExpandedGroup]           = useState<string | null>(null);
  // per-group: loading / ok / error status for verification
  type VerifyStatus = "idle" | "loading" | "ok" | "error";
  const [verifyStatus, setVerifyStatus]             = useState<Record<string, VerifyStatus>>({});
  const [verifyError, setVerifyError]               = useState<Record<string, string>>({});

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

  const handleSaveMeta = async (e: FormEvent) => {
    e.preventDefault();
    setMetaImportError(null);

    // 1. Persist credentials + account configs
    saveMetaCredentials({ accessToken });
    accountRows.forEach((r) => {
      if (r.accountId.trim()) onSaveCampaignConfig(r.groupId, { adAccountId: r.accountId.trim() });
    });

    // 2. Build campaign filter (only for groups with a strict subset selected)
    const campaignFilter: Record<string, string[]> = {};
    accountRows.forEach((r) => {
      const accountId = r.accountId.trim();
      if (!accountId) return;
      const allCamps  = campaignsByAccount[accountId] ?? [];
      const selected  = selectedCampaigns[r.groupId];
      if (allCamps.length > 0 && selected && selected.length < allCamps.length) {
        campaignFilter[r.groupId] = selected;
      }
    });

    // 3. Auto-fetch insights if handler is available
    if (onImportMeta) {
      setImportingMeta(true);
      try {
        await onImportMeta(
          adAccountIds,
          dateRange.from,
          dateRange.to,
          Object.keys(campaignFilter).length > 0 ? campaignFilter : undefined,
        );
        onClose(); // close popover on success
      } catch (err) {
        setMetaImportError(err instanceof Error ? err.message : "Falha ao buscar dados da Meta.");
        setImportingMeta(false);
      }
    } else {
      setMetaSaved(true);
      setTimeout(() => setMetaSaved(false), 2000);
    }
  };

  const handleFetchAccounts = async () => {
    setAccountsError(null);
    setFetchingAccounts(true);
    try {
      const accounts = await fetchMetaAdAccounts(accessToken);
      setMetaAccounts(accounts);
      if (accounts.length === 0) setAccountsError("Nenhuma conta encontrada para este token.");
    } catch (e) {
      setAccountsError(e instanceof Error ? e.message : "Falha ao buscar contas.");
      setMetaAccounts([]);
    } finally {
      setFetchingAccounts(false);
    }
  };

  /** Verify + fetch campaigns for a single group. Shows green/red status. */
  const handleVerifyGroup = async (groupId: string) => {
    const accountId = adAccountIds[groupId]?.trim();
    if (!accountId || !accessToken) return;

    // Toggle collapse if already expanded and OK
    if (expandedGroup === groupId && verifyStatus[groupId] === "ok") {
      setExpandedGroup(null);
      return;
    }

    setExpandedGroup(groupId);
    setVerifyStatus((p) => ({ ...p, [groupId]: "loading" }));
    setVerifyError((p) => { const c = { ...p }; delete c[groupId]; return c; });

    // Reuse cached data if already fetched for this account
    if (campaignsByAccount[accountId]) {
      setVerifyStatus((p) => ({ ...p, [groupId]: "ok" }));
      return;
    }

    try {
      const campaigns = await fetchMetaCampaigns(accountId, accessToken);
      setCampaignsByAccount((p) => ({ ...p, [accountId]: campaigns }));
      // Restore previous selection if it exists; otherwise default to all selected
      setSelectedCampaigns((p) => {
        const existing = savedSelectedCampaigns[groupId];
        return {
          ...p,
          [groupId]: existing?.length ? existing : campaigns.map((c) => c.id),
        };
      });
      setVerifyStatus((p) => ({ ...p, [groupId]: "ok" }));
      if (campaigns.length === 0) {
        setVerifyError((p) => ({ ...p, [groupId]: "Nenhuma campanha ativa/pausada encontrada." }));
        setVerifyStatus((p) => ({ ...p, [groupId]: "error" }));
      } else {
        onCampaignsVerified(groupId, campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status })));
      }
    } catch (e) {
      setVerifyStatus((p) => ({ ...p, [groupId]: "error" }));
      setVerifyError((p) => ({
        ...p,
        [groupId]: e instanceof Error ? e.message : "Erro ao verificar conta.",
      }));
    }
  };

  /** Verify all configured rows in parallel. */
  const handleVerifyAll = async () => {
    const rowsWithAccount = accountRows.filter((r) => r.accountId.trim());
    if (rowsWithAccount.length === 0) return;
    await Promise.allSettled(rowsWithAccount.map((r) => handleVerifyGroup(r.groupId)));
  };

  /** Change which group a row maps to. */
  const handleChangeRowGroup = (rowId: string, newGroupId: string) => {
    const old = accountRows.find((r) => r.rowId === rowId);
    setAccountRows((p) => p.map((r) => r.rowId === rowId ? { ...r, groupId: newGroupId, accountId: "" } : r));
    if (old) {
      setVerifyStatus((p) => { const c = { ...p }; delete c[old.groupId]; return c; });
      setVerifyError((p)  => { const c = { ...p }; delete c[old.groupId]; return c; });
      setSelectedCampaigns((p) => { const c = { ...p }; delete c[old.groupId]; return c; });
    }
    if (expandedGroup === old?.groupId) setExpandedGroup(null);
  };

  /** Update the account ID on a row (resets verify state). */
  const handleChangeRowAccount = (rowId: string, newAccountId: string) => {
    const row = accountRows.find((r) => r.rowId === rowId);
    if (!row) return;
    setAccountRows((p) => p.map((r) => r.rowId === rowId ? { ...r, accountId: newAccountId } : r));
    setVerifyStatus((p) => { const c = { ...p }; delete c[row.groupId]; return c; });
    setVerifyError((p)  => { const c = { ...p }; delete c[row.groupId]; return c; });
    setSelectedCampaigns((p) => { const c = { ...p }; delete c[row.groupId]; return c; });
    if (expandedGroup === row.groupId) setExpandedGroup(null);
  };

  /** Remove a row entirely. */
  const handleRemoveRow = (rowId: string) => {
    const row = accountRows.find((r) => r.rowId === rowId);
    setAccountRows((p) => p.filter((r) => r.rowId !== rowId));
    if (row) {
      setVerifyStatus((p) => { const c = { ...p }; delete c[row.groupId]; return c; });
      setVerifyError((p)  => { const c = { ...p }; delete c[row.groupId]; return c; });
      setSelectedCampaigns((p) => { const c = { ...p }; delete c[row.groupId]; return c; });
      if (expandedGroup === row.groupId) setExpandedGroup(null);
    }
  };

  /** Add a new empty row using the first unconfigured group. */
  const handleAddRow = (forcedGroupId?: string) => {
    const usedIds = new Set(accountRows.map((r) => r.groupId));
    const targetId = forcedGroupId ?? allGroupsInPopover.find((g) => !usedIds.has(g.id))?.id;
    if (!targetId) return;
    setAccountRows((p) => [...p, { rowId: `row-${Date.now()}`, groupId: targetId, accountId: "" }]);
  };

  /** Toggle a single campaign selection within a group. */
  const handleToggleCampaign = (groupId: string, campaignId: string, allForAccount: Array<{ id: string }>) => {
    const current = selectedCampaigns[groupId] ?? allForAccount.map((c) => c.id);
    const next    = current.includes(campaignId)
      ? current.filter((id) => id !== campaignId)
      : [...current, campaignId];
    setSelectedCampaigns((p) => ({ ...p, [groupId]: next }));
    onSaveCampaignSelection(groupId, next);
  };

  /** Select or deselect all campaigns for a group. */
  const handleSelectAllCampaigns = (groupId: string, allForAccount: Array<{ id: string }>, selectAll: boolean) => {
    const next = selectAll ? allForAccount.map((c) => c.id) : [];
    setSelectedCampaigns((p) => ({ ...p, [groupId]: next }));
    onSaveCampaignSelection(groupId, next);
  };

  const tabCls = (t: ImportTab) =>
    `flex-1 rounded-md py-1.5 text-xs font-medium transition ${
      tab === t ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
    }`;

  const inputCls = "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-600";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 top-full z-50 mt-2 flex w-[380px] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:w-[440px]" style={{ maxHeight: "calc(100vh - 80px)" }}>

        {/* Fixed header */}
        <div className="flex-shrink-0 border-b border-slate-100 p-5 pb-4 dark:border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Importar dados</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Conecte sua fonte de dados</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <X size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
            <button className={tabCls("sheets")} onClick={() => setTab("sheets")}>Google Sheets</button>
            <button className={tabCls("csv")}    onClick={() => setTab("csv")}>CSV</button>
            <button className={tabCls("meta")}   onClick={() => setTab("meta")}>Meta Ads</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">

        {tab === "sheets" && (
          <form onSubmit={handleUrl} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">URL da planilha pública</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none dark:text-slate-500" />
                  <input
                    type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-600"
                  />
                </div>
                <button type="submit" disabled={!!loading}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60">
                  {loading === "url" ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                  {loading === "url" ? "Carregando…" : "Carregar"}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">A planilha precisa estar com acesso público (Qualquer pessoa com o link)</p>
            </div>
          </form>
        )}

        {tab === "csv" && (
          <div className="space-y-3">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Arquivo CSV exportado</label>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={!!loading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60 dark:border-slate-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20">
              {loading === "csv"
                ? <Loader2 size={20} className="animate-spin text-blue-500" />
                : <Upload size={20} className="text-slate-400 dark:text-slate-500" />}
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {loading === "csv" ? "Importando arquivo…" : "Clique para selecionar"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Somente arquivos .csv</p>
              </div>
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {tab === "meta" && (
          <form onSubmit={handleSaveMeta} className="space-y-4">


            {/* Token + fetch button */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Access Token
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => { setAccessToken(e.target.value); setMetaAccounts([]); setAccountsError(null); }}
                  placeholder="EAAxxxxx…"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  disabled={!accessToken || fetchingAccounts}
                  onClick={handleFetchAccounts}
                  title="Buscar contas de anúncio disponíveis"
                  className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fetchingAccounts
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Zap size={12} />
                  }
                  {fetchingAccounts ? "Buscando…" : "Conectar"}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                Obtenha em{" "}
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Meta for Developers → Graph API Explorer
                </span>
              </p>
            </div>

            {/* Error from account fetch */}
            {accountsError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <X size={12} className="mt-0.5 flex-shrink-0" />
                {accountsError}
              </div>
            )}

            {/* Accounts found banner */}
            {metaAccounts.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium"
                style={{ backgroundColor: "var(--dm-success-bg)", borderColor: "var(--dm-success-border)", color: "var(--dm-success-text)" }}
              >
                <Activity size={12} className="flex-shrink-0" />
                {metaAccounts.length} conta{metaAccounts.length > 1 ? "s" : ""} encontrada{metaAccounts.length > 1 ? "s" : ""} — selecione abaixo ou digite manualmente
              </div>
            )}

            {/* ── Separator — only show the rest after token connected ──── */}
            {!showAccountsSection && (
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                Conecte o token acima para configurar período e contas.
              </p>
            )}

            {/* Date range preset */}
            {showAccountsSection && (<div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Período de dados
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(["7d", "14d", "30d", "90d", "max"] as DatePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDatePreset(p)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      datePreset === p
                        ? "border-brand bg-brand text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    }`}
                  >
                    {DATE_PRESET_LABELS[p]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                {datePreset === "max"
                  ? `De ${dateRange.from} até hoje (máx. ~3 anos)`
                  : `De ${dateRange.from} até ${dateRange.to}`
                }
              </p>
            </div>)}

            {/* ── Ad account rows ──────────────────────────────────────────── */}
            {showAccountsSection && <div>
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ad Accounts configurados
                  </label>
                  {accountRows.length > 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {accountRows.length} conta{accountRows.length > 1 ? "s" : ""} salva{accountRows.length > 1 ? "s" : ""} — edite ou remova conforme necessário
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {accountRows.some((r) => r.accountId.trim()) && (
                    <button
                      type="button"
                      onClick={() => void handleVerifyAll()}
                      disabled={!accessToken}
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                    >
                      <Activity size={10} /> Verificar todas
                    </button>
                  )}
                  {accountRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAccountRows([])}
                      className="flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-semibold text-red-500 transition hover:border-red-400 hover:bg-red-50 dark:border-red-800 dark:bg-slate-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <X size={10} /> Limpar tudo
                    </button>
                  )}
                </div>
              </div>

              {/* Empty state */}
              {accountRows.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-5 text-center dark:border-slate-600">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Nenhuma conta configurada.<br />
                    Clique em <strong className="text-slate-600 dark:text-slate-300">+ Adicionar campanha</strong> para começar.
                  </p>
                </div>
              )}

              {/* Row list */}
              {accountRows.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  {accountRows.map((row) => {
                    const g          = allGroupsInPopover.find((x) => x.id === row.groupId) ?? CAMPAIGN_GROUPS[0];
                    const accountId  = row.accountId.trim();
                    // Use live-fetched campaigns first; fall back to saved data from previous session
                    const liveCampaigns  = accountId ? (campaignsByAccount[accountId] ?? []) : [];
                    const savedCamps     = savedCampaignsByGroup[row.groupId] ?? [];
                    const campaigns: (MetaCampaign | CampaignSummary)[] = liveCampaigns.length > 0 ? liveCampaigns : savedCamps;
                    const isRestored = liveCampaigns.length === 0 && savedCamps.length > 0;
                    const isExpanded = expandedGroup === row.groupId;
                    const status     = isRestored && verifyStatus[row.groupId] === undefined ? "ok" : (verifyStatus[row.groupId] ?? "idle");
                    const errMsg     = verifyError[row.groupId];
                    const selected   = selectedCampaigns[row.groupId] ?? campaigns.map((c) => c.id);
                    const allSelected = selected.length === campaigns.length;

                    return (
                      <div key={row.rowId} className="border-b border-slate-100 last:border-b-0 dark:border-slate-700">
                        {/* Main row */}
                        <div className="flex items-center gap-1.5 px-2 py-2">

                          {/* Group picker — grouped by section */}
                          <select
                            value={row.groupId}
                            onChange={(e) => handleChangeRowGroup(row.rowId, e.target.value)}
                            className="h-7 w-[140px] flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10px] text-slate-800 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                          >
                            {(["pos","livros","ebooks","perpetuo","eventos"] as GroupSection[]).map((sec) => (
                              <optgroup key={sec} label={SECTION_LABELS[sec]}>
                                {allGroupsInPopover.filter((grp) => grp.section === sec).map((grp) => {
                                  const usedByOther = accountRows.some((r) => r.rowId !== row.rowId && r.groupId === grp.id);
                                  return (
                                    <option key={grp.id} value={grp.id} disabled={usedByOther}>
                                      {grp.label}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            ))}
                          </select>

                          {/* Account field: combobox — type manually OR click arrow to pick */}
                          <div
                            className="relative min-w-0 flex-1"
                            ref={(el) => { if (el) inputWrapperRefs.current.set(row.rowId, el); else inputWrapperRefs.current.delete(row.rowId); }}
                          >
                            <input
                              value={row.accountId}
                              onChange={(e) => handleChangeRowAccount(row.rowId, e.target.value)}
                              placeholder="act_123456789"
                              className="h-7 w-full rounded-md border border-slate-200 bg-slate-50 pl-2 pr-6 text-[10px] text-slate-800 placeholder-slate-300 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-600"
                            />
                            {metaAccounts.length > 0 && (
                              <button
                                type="button"
                                title="Ver contas disponíveis"
                                onClick={() => openAccountDropdown(row.rowId)}
                                className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                              >
                                <ChevronDown size={11} className={`transition-transform ${openDropdownRow === row.rowId ? "rotate-180" : ""}`} />
                              </button>
                            )}
                          </div>

                          {/* Verify status badge */}
                          {status === "loading" && (
                            <Loader2 size={13} className="flex-shrink-0 animate-spin text-blue-500" />
                          )}
                          {status === "ok" && campaigns.length > 0 && (
                            <button
                              type="button"
                              onClick={() => void handleVerifyGroup(row.groupId)}
                              title={`${campaigns.length} campanhas${isRestored ? " (salvas)" : ""} — clique para ${isExpanded ? "fechar" : "filtrar"}`}
                              className={`flex flex-shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold transition ${
                                isRestored
                                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }`}
                            >
                              <CheckCircle2 size={10} />
                              {selected.length}/{campaigns.length}
                              {isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                            </button>
                          )}
                          {status === "error" && (
                            <span title={errMsg} className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              <XCircle size={10} /> Erro
                            </span>
                          )}
                          {status === "idle" && accountId && (
                            <button
                              type="button"
                              onClick={() => void handleVerifyGroup(row.groupId)}
                              className="flex flex-shrink-0 items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400"
                            >
                              <Activity size={9} /> Verificar
                            </button>
                          )}

                          {/* Remove row */}
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.rowId)}
                            title="Remover esta conta"
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </div>

                        {/* Inline error */}
                        {status === "error" && errMsg && (
                          <p className="px-3 pb-1.5 text-[9px] text-red-500 dark:text-red-400">{errMsg}</p>
                        )}

                        {/* Campaign picker (expanded) */}
                        {isExpanded && campaigns.length > 0 && (
                          <div className="mx-2 mb-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50">
                            <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1 dark:border-slate-600">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Campanhas ({selected.length}/{campaigns.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSelectAllCampaigns(row.groupId, campaigns, !allSelected)}
                                className="text-[9px] font-semibold text-blue-500 transition hover:text-blue-700 dark:text-blue-400"
                              >
                                {allSelected ? "Desmarcar todas" : "Marcar todas"}
                              </button>
                            </div>
                            <div className="max-h-36 overflow-y-auto p-1">
                              {campaigns.map((camp) => {
                                const checked = selected.includes(camp.id);
                                return (
                                  <label key={camp.id} className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 hover:bg-white dark:hover:bg-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleCampaign(row.groupId, camp.id, campaigns)}
                                      className="h-3 w-3 flex-shrink-0 rounded accent-blue-600"
                                    />
                                    <span className="flex-1 truncate text-[10px] text-slate-700 dark:text-slate-300" title={camp.name}>
                                      {camp.name}
                                    </span>
                                    <span className={`flex-shrink-0 text-[9px] font-bold ${camp.status === "ACTIVE" ? "text-emerald-500" : "text-amber-400"}`} title={camp.status}>
                                      {camp.status === "ACTIVE" ? "●" : "◐"}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add campaign — multi-step wizard */}
              {accountRows.length < allGroupsInPopover.length && wizardStep === "idle" && (
                <button type="button" onClick={() => setWizardStep("section")}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-[11px] font-semibold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/10 dark:hover:text-blue-400">
                  <Plus size={13} /> Adicionar campanha
                </button>
              )}

              {/* Step 1 — choose section */}
              {wizardStep === "section" && (
                <div className="mt-2 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-800 dark:bg-blue-900/10">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Tipo de produto:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["pos","livros","ebooks","perpetuo","eventos"] as GroupSection[]).map((sec) => (
                      <button key={sec} type="button" onClick={() => { setWizardSection(sec); setWizardStep("group"); }}
                        className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600">
                        {SECTION_LABELS[sec]}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={cancelWizard}
                    className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                    ✕ Cancelar
                  </button>
                </div>
              )}

              {/* Step 2 — choose existing or create new */}
              {wizardStep === "group" && wizardSection && (
                <div className="mt-2 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-800 dark:bg-blue-900/10">
                  <button type="button" onClick={() => setWizardStep("section")}
                    className="mb-2 flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400">
                    ← {SECTION_LABELS[wizardSection]}
                  </button>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Selecione ou crie:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {wizardGroupsForSection.map((g) => {
                      const isUsed = usedGroupIds.has(g.id);
                      return (
                        <button key={g.id} type="button" disabled={isUsed}
                          onClick={() => handleWizardSelectGroup(g.id)}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            isUsed
                              ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-700 dark:text-slate-600"
                              : "border-blue-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-700 dark:text-blue-300"
                          }`}>
                          {g.label}{isUsed ? " ✓" : ""}
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => setWizardStep("new-name")}
                      className="rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <Plus size={10} className="mr-0.5 inline" /> Criar novo
                    </button>
                  </div>
                  <button type="button" onClick={cancelWizard}
                    className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                    ✕ Cancelar
                  </button>
                </div>
              )}

              {/* Step 3 — new name input */}
              {wizardStep === "new-name" && wizardSection && (
                <div className="mt-2 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-900/10">
                  <button type="button" onClick={() => setWizardStep("group")}
                    className="mb-2 flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-800 dark:text-emerald-400">
                    ← {SECTION_LABELS[wizardSection]}
                  </button>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Nome do novo produto:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={wizardNewName}
                      onChange={(e) => setWizardNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleWizardCreateNew()}
                      placeholder={`Ex: Pós em ${SECTION_LABELS[wizardSection]}…`}
                      autoFocus
                      className="h-8 flex-1 rounded-lg border border-emerald-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 dark:border-emerald-700 dark:bg-slate-700 dark:text-slate-200"
                    />
                    <button type="button" onClick={handleWizardCreateNew}
                      disabled={!wizardNewName.trim()}
                      className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                      Criar
                    </button>
                  </div>
                  <button type="button" onClick={cancelWizard}
                    className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                    ✕ Cancelar
                  </button>
                </div>
              )}
            </div>}

            {/* Import error */}
            {metaImportError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <X size={12} className="mt-0.5 flex-shrink-0" />
                {metaImportError}
              </div>
            )}

            <button
              type="submit"
              disabled={importingMeta}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
                metaSaved ? "bg-emerald-600" : "bg-brand hover:bg-brand-hover"
              }`}
            >
              {importingMeta ? (
                <><Loader2 size={13} className="animate-spin" /> Buscando dados da Meta…</>
              ) : metaSaved ? (
                "✓ Salvo!"
              ) : (
                <><Zap size={13} /> Salvar e importar dados</>
              )}
            </button>

            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
              💡 Use um <span className="font-medium">System User Token</span> para não expirar.{" "}
              Tokens do Graph API Explorer expiram em ~1h.
            </p>
          </form>
        )}
        </div>{/* end scrollable */}
      </div>

      {/* ── Fixed account dropdown — rendered outside overflow containers ── */}
      {openDropdownRow && dropdownRect && metaAccounts.length > 0 && (
        <>
          {/* click-outside backdrop */}
          <div className="fixed inset-0 z-[70]" onClick={() => { setOpenDropdownRow(null); setDropdownRect(null); }} />
          <div
            className="fixed z-[80] max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
            style={{ top: dropdownRect.top, left: dropdownRect.left, minWidth: Math.max(dropdownRect.width, 240) }}
          >
            {metaAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  handleChangeRowAccount(openDropdownRow, acc.id);
                  setOpenDropdownRow(null);
                  setDropdownRect(null);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[11px] transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                  acc.id === accountRows.find((r) => r.rowId === openDropdownRow)?.accountId
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : ""
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-semibold text-slate-800 dark:text-slate-200">{acc.name}</span>
                  <span className="block font-mono text-[9px] text-slate-400 dark:text-slate-500">{acc.id}</span>
                </span>
                {acc.account_status !== 1 && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                    Inativa
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ─── Campaign sidebar content ─────────────────────────────────────────────────

interface CampaignPanelProps {
  selectedGroup: string;
  selectedTurma: string;
  activeCampaigns: Record<string, boolean>;
  turmasByGroup: Record<string, string[]>;
  dateFrom: string;
  dateTo: string;
  searchCampaign: string;
  showCourseGroups: boolean;
  groups: GroupConfig[];
  selectedCampaign: string;
  campaignsByGroup: Record<string, CampaignSummary[]>;
  checkedCampaignIds: string[];
  sortBy: SortBy;
  onSelectGroup: (id: string) => void;
  onSelectTurma: (t: string) => void;
  onSelectCampaign: (id: string) => void;
  onToggleActive: (id: string, v: boolean) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onSearch: (v: string) => void;
  onClearFilters: () => void;
  onSortBy: (v: SortBy) => void;
  onCheckedCampaignIds: (ids: string[]) => void;
  onClearCampaignFilter: () => void;
  isFilterExplicit: boolean;
  hasActiveFilters: boolean;
}

function CampaignPanel({
  selectedGroup, selectedTurma, activeCampaigns, turmasByGroup,
  dateFrom, dateTo, searchCampaign, showCourseGroups,
  groups, selectedCampaign, campaignsByGroup, checkedCampaignIds, sortBy,
  onSelectGroup, onSelectTurma, onSelectCampaign, onToggleActive,
  onDateFrom, onDateTo, onSearch, onClearFilters, onSortBy, onCheckedCampaignIds,
  onClearCampaignFilter, isFilterExplicit, hasActiveFilters,
}: CampaignPanelProps) {
  const activeCount = Object.values(activeCampaigns).filter(Boolean).length;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [campSearch, setCampSearch] = useState("");

  // Flatten all campaign names across all groups for search suggestions
  const allCampaignNames = useMemo(() => {
    const seen = new Set<string>();
    Object.values(campaignsByGroup).forEach((camps) =>
      camps.forEach((c) => seen.add(c.name)),
    );
    return Array.from(seen).sort();
  }, [campaignsByGroup]);

  const searchSuggestions = useMemo(() => {
    if (!searchCampaign || searchCampaign.length < 2) return [];
    const q = searchCampaign.toLowerCase();
    return allCampaignNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 7);
  }, [searchCampaign, allCampaignNames]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {showCourseGroups ? "Cursos" : "Filtros"}
        </p>
        {activeCount > 0 && showCourseGroups && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            {activeCount} ativa{activeCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Campaign course list — only for Pós Graduação */}
      {showCourseGroups && (
      <div className="flex-1 overflow-y-auto py-1">
        {/* "All" option */}
        <button
          onClick={() => onSelectGroup("all")}
          className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition ${
            selectedGroup === "all" ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
          }`}
        >
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-500" />
          <span className={`text-xs font-semibold ${selectedGroup === "all" ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
            Todos os cursos
          </span>
        </button>

        <div className="mx-4 my-1 h-px bg-slate-100 dark:bg-slate-700" />

        {groups.map((group, idx) => {
          const isSelected  = selectedGroup === group.id;
          const isActive    = activeCampaigns[group.id] ?? false;
          const turmaList   = turmasByGroup[group.id] ?? [];
          const prevSection = idx > 0 ? groups[idx - 1].section : null;
          const isNewSection = group.section !== prevSection;

          return (
            <div key={group.id}>
              {/* Section divider — shown at the start of each new section */}
              {isNewSection && (
                <div className={`${idx > 0 ? "mt-1 border-t border-slate-100 dark:border-slate-700/60" : ""} px-4 pb-0.5 pt-2`}>
                  <p className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--dm-text-tertiary)" }}>
                    {SECTION_LABELS[group.section]}
                  </p>
                </div>
              )}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectGroup(isSelected ? "all" : group.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelectGroup(isSelected ? "all" : group.id)}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left transition ${
                  isSelected
                    ? `${group.selectedBg} border-r-2 ${group.selectedBorder} dark:bg-slate-700/50 dark:border-slate-500`
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <span className="relative flex h-2 w-2 flex-shrink-0 items-center justify-center">
                  {isActive && (
                    <span className={`absolute h-3 w-3 animate-ping rounded-full opacity-40 ${group.activePulse}`} />
                  )}
                  <span className={`relative h-2 w-2 rounded-full ${isActive ? group.activeDot : "bg-slate-200 dark:bg-slate-600"}`} />
                </span>

                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${group.iconBg} dark:opacity-80`}>
                  <group.icon size={12} className={group.iconColor} />
                </div>

                <span className={`flex-1 truncate text-xs font-medium ${isSelected ? group.selectedText : "text-slate-700 dark:text-slate-300"}`}>
                  {group.label}
                </span>

                <ToggleSwitch
                  checked={isActive}
                  onChange={(v) => onToggleActive(group.id, v)}
                  activeBg={group.activeDot}
                />
              </div>

              {isSelected && (
                <div className={`${group.selectedBg} px-4 pb-2.5 pt-1 dark:bg-slate-700/30`}>
                  <p className="mb-1.5 ml-[38px] text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Turmas</p>
                  <div className="ml-[38px] flex flex-wrap gap-1.5">
                    <button
                      onClick={() => onSelectTurma("all")}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                        selectedTurma === "all"
                          ? "bg-brand text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      Todas
                    </button>
                    {turmaList.map((t) => (
                      <button
                        key={t}
                        onClick={() => onSelectTurma(t)}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                          selectedTurma === t
                            ? "bg-brand text-white shadow-sm"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                    {turmaList.length === 0 && (
                      <span className="text-[11px] italic text-slate-400 dark:text-slate-500">Sem turmas carregadas</span>
                    )}
                  </div>

                  {/* Campaign selector — checkbox list with search */}
                  {(campaignsByGroup[group.id] ?? []).length > 0 && (() => {
                    const camps = campaignsByGroup[group.id] ?? [];
                    const allIds = camps.map((c) => c.id);
                    const visibleCamps = campSearch
                      ? camps.filter((c) => c.name.toLowerCase().includes(campSearch.toLowerCase()))
                      : camps;
                    // isFilterExplicit = key exists in store (even if empty = deselect-all)
                    const activeChecked = isFilterExplicit ? checkedCampaignIds.length : allIds.length;
                    const allExplicit = isFilterExplicit && checkedCampaignIds.length === allIds.length;
                    const noneExplicit = isFilterExplicit && checkedCampaignIds.length === 0;
                    return (
                      <div className="ml-[38px] mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                        {/* Header row */}
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Campanha{" "}
                            <span className={`rounded px-1 text-[9px] font-bold ${isFilterExplicit ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                              {activeChecked}/{allIds.length}
                            </span>
                          </p>
                          <div className="flex items-center gap-1.5">
                            {isFilterExplicit ? (
                              <>
                                {!allExplicit && (
                                  <button type="button" onClick={() => onCheckedCampaignIds([...allIds])}
                                    className="text-[9px] font-semibold text-blue-500 transition hover:text-blue-700 dark:text-blue-400">
                                    Sel. tudo
                                  </button>
                                )}
                                {!noneExplicit && (
                                  <button type="button" onClick={() => onCheckedCampaignIds([])}
                                    className="text-[9px] font-semibold text-slate-400 transition hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
                                    Desmarcar
                                  </button>
                                )}
                                <button type="button" onClick={onClearCampaignFilter}
                                  className="text-[9px] font-semibold text-slate-300 transition hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400">
                                  Limpar
                                </button>
                              </>
                            ) : (
                              <button type="button" onClick={() => onCheckedCampaignIds([...allIds])}
                                className="text-[9px] font-semibold text-slate-400 transition hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400">
                                Filtrar
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Search inside campaign list */}
                        <div className="relative mb-1.5">
                          <input
                            type="text"
                            value={campSearch}
                            onChange={(e) => setCampSearch(e.target.value)}
                            placeholder={`Buscar entre ${allIds.length} campanhas…`}
                            className="h-6 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-500"
                          />
                          {campSearch && (
                            <button onClick={() => setCampSearch("")}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              <X size={9} />
                            </button>
                          )}
                        </div>
                        <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800/50">
                          {visibleCamps.length === 0 && (
                            <p className="px-2 py-2 text-[10px] italic text-slate-400 dark:text-slate-500">
                              Nenhuma campanha encontrada.
                            </p>
                          )}
                          {visibleCamps.map((camp) => {
                            const isChecked = !isFilterExplicit || checkedCampaignIds.includes(camp.id);
                            return (
                              <label key={camp.id}
                                className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const base = isFilterExplicit ? checkedCampaignIds : [...allIds];
                                    const next = isChecked
                                      ? base.filter((id) => id !== camp.id)
                                      : [...base, camp.id];
                                    onCheckedCampaignIds(next);
                                  }}
                                  className="h-3 w-3 flex-shrink-0 rounded accent-blue-600"
                                />
                                <span className="flex-1 truncate text-[10px] text-slate-700 dark:text-slate-300" title={camp.name}>
                                  {camp.status !== "ACTIVE" && <span className="mr-0.5 text-amber-400">◐</span>}
                                  {camp.name.length > 26 ? camp.name.slice(0, 26) + "…" : camp.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )} {/* end showCourseGroups */}

      {/* Filters — always visible */}
      <div className={`flex-shrink-0 border-t border-slate-100 p-4 space-y-3 dark:border-slate-700 ${showCourseGroups ? "" : "flex-1"}`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            <SlidersHorizontal size={10} /> Filtros
          </p>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-[10px] font-semibold text-red-500 transition hover:text-red-700 dark:text-red-400"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">De</span>
            <input
              type="date" value={dateFrom} onChange={(e) => onDateFrom(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-600"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Até</span>
            <input
              type="date" value={dateTo} onChange={(e) => onDateTo(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-600"
            />
          </label>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchCampaign}
            onChange={(e) => { onSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Buscar campanha…"
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-600"
          />
          {searchCampaign && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
          {/* Search suggestions dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
              {searchSuggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onSearch(name); setShowSuggestions(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                >
                  <Filter size={9} className="flex-shrink-0 text-slate-300 dark:text-slate-600" />
                  <span className="truncate">{name}</span>
                </button>
              ))}
              {allCampaignNames.filter((n) => n.toLowerCase().includes(searchCampaign.toLowerCase())).length > 7 && (
                <p className="px-3 py-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  +{allCampaignNames.filter((n) => n.toLowerCase().includes(searchCampaign.toLowerCase())).length - 7} mais resultados
                </p>
              )}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Ordenar por</span>
          <select
            value={sortBy}
            onChange={(e) => onSortBy(e.target.value as SortBy)}
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-800 outline-none transition focus:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-500"
          >
            {(Object.entries(SORT_LABELS) as [SortBy, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Dashboard({ campaigns, error, dataSource, onImportCsv, onImportUrl, onImportMeta, onDisconnect }: DashboardProps) {
  const [mainTab, setMainTab]               = useState<MainTab>("overview");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");
  const [searchCampaign, setSearchCampaign] = useState("");
  const [showImport, setShowImport]         = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<ImportTab>("meta");

  const openImport = (tab: ImportTab = "meta") => {
    setImportInitialTab(tab);
    setShowImport(true);
  };
  const [showMobileNav, setShowMobileNav]   = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  const [sortBy, setSortBy] = useState<SortBy>("date-desc");
  const [checkedCampaignIds, setCheckedCampaignIds] = useState<string[]>([]);
  const [showGoals, setShowGoals] = useState(false);

  const { getGoals, setGoal, resetGoals } = useGoalsStore();

  const {
    selectedGroup, selectedTurma, activeCampaigns, campaignConfigs,
    selectedCategory, campaignsByGroup, selectedCampaign, selectedCampaignsByGroup, enabledSections,
    customGroups, addCustomGroup,
    setSelectedGroup, setSelectedTurma, toggleActive, setCampaignConfig,
    setSelectedCategory, setCampaignsForGroup, setSelectedCampaign, setEnabledSections,
    setCampaignSelectionForGroup, clearCampaignSelectionForGroup,
  } = useCampaignStore();

  // Goals are per-group; "all" uses the "global" bucket
  const goalsGroupKey = selectedGroup === "all" ? "global" : selectedGroup;
  const goals = getGoals(goalsGroupKey);

  // Sync sidebar checkboxes from persisted selections whenever the selected group changes.
  // This makes import selections propagate automatically to the analysis filter.
  useEffect(() => {
    if (selectedGroup === "all") {
      setCheckedCampaignIds([]);
    } else {
      const saved = selectedCampaignsByGroup[selectedGroup];
      setCheckedCampaignIds(saved?.length ? saved : []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  // Persist sidebar checkbox changes back to the store so they survive remounts.
  const handleCheckedCampaignIds = useCallback((ids: string[]) => {
    setCheckedCampaignIds(ids);
    if (selectedGroup !== "all") {
      setCampaignSelectionForGroup(selectedGroup, ids);
    }
  }, [selectedGroup, setCampaignSelectionForGroup]);

  // Clear the filter entirely (removes the key from the store → back to "show all" with no filter active)
  const handleClearCampaignFilter = useCallback(() => {
    setCheckedCampaignIds([]);
    if (selectedGroup !== "all") clearCampaignSelectionForGroup(selectedGroup);
  }, [selectedGroup, clearCampaignSelectionForGroup]);

  // Whether an explicit filter is active for the current group
  // (key exists in store even if empty = "deselect all" mode where nothing should show)
  const isFilterExplicit = selectedGroup !== "all" && selectedGroup in selectedCampaignsByGroup;

  // Merge static groups with custom-created ones
  const allGroups = useMemo<GroupConfig[]>(() => [
    ...CAMPAIGN_GROUPS,
    ...customGroups.map((cg): GroupConfig => ({
      ...SECTION_DEFAULTS[cg.section as GroupSection],
      id: cg.id,
      label: cg.label,
      section: cg.section as GroupSection,
    })),
  ], [customGroups]);

  // ── Account → section map for Meta data ──────────────────────────────────────
  const accountSectionMap = useMemo<Record<string, ProductCategory>>(() => {
    const map: Record<string, ProductCategory> = {};
    allGroups.forEach((g) => {
      const rawId = campaignConfigs[g.id]?.adAccountId ?? "";
      if (rawId) {
        const bare = rawId.replace(/^act_/, "");
        map[bare] = g.section as ProductCategory;
        map[rawId] = g.section as ProductCategory;
      }
    });
    return map;
  }, [campaignConfigs]);

  // ── Category filtering (first pass) ─────────────────────────────────────────
  const categorizedCampaigns = useMemo(() => {
    if (!selectedCategory) return campaigns;
    return campaigns.filter((c) => {
      if (c.id.startsWith("meta-")) {
        // "meta-act_123456789-2026-04-01-campaignId"
        const accountId = c.id.split("-")[1]; // "act_123456789"
        return (
          accountSectionMap[accountId] === selectedCategory ||
          accountSectionMap[accountId.replace(/^act_/, "")] === selectedCategory
        );
      }
      return classifyCampaign(c.campaignName) === selectedCategory;
    });
  }, [campaigns, selectedCategory, accountSectionMap]);

  const turmasByGroup = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, Set<string>> = {};
    categorizedCampaigns.forEach((item) => {
      let group = "";
      if (item.id.startsWith("meta-")) {
        const itemAccountId = item.id.split("-")[1];
        const bare = itemAccountId.replace(/^act_/, "");
        group = allGroups.find((g) => {
          const a = campaignConfigs[g.id]?.adAccountId ?? "";
          return a === itemAccountId || a.replace(/^act_/, "") === bare;
        })?.id ?? "";
      } else {
        group = getLaunchGroup(item.campaignName);
      }
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
  }, [categorizedCampaigns, campaignConfigs]);

  const filteredCampaigns = useMemo(() => {
    return categorizedCampaigns.filter((item) => {
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      if (selectedGroup !== "all") {
        const adAccountId = campaignConfigs[selectedGroup]?.adAccountId ?? "";
        if (item.id.startsWith("meta-") && adAccountId) {
          const itemAccountId = item.id.split("-")[1];
          const bare = adAccountId.replace(/^act_/, "");
          if (itemAccountId !== adAccountId && itemAccountId.replace(/^act_/, "") !== bare) return false;
        } else if (!item.id.startsWith("meta-")) {
          if (getLaunchGroup(item.campaignName) !== selectedGroup) return false;
        }
      }
      if (selectedTurma !== "all" && getSubLaunchCode(item.campaignName) !== selectedTurma) return false;
      if (selectedCampaign !== "all") {
        const groupCamps = campaignsByGroup[selectedGroup] ?? [];
        const campName = groupCamps.find((c) => c.id === selectedCampaign)?.name;
        if (campName && item.campaignName !== campName) return false;
      }
      if (isFilterExplicit && selectedGroup !== "all") {
        if (checkedCampaignIds.length === 0) return false; // deselect-all mode
        const groupCamps = campaignsByGroup[selectedGroup] ?? [];
        const checkedNames = new Set(
          groupCamps.filter((c) => checkedCampaignIds.includes(c.id)).map((c) => c.name),
        );
        if (checkedNames.size > 0 && !checkedNames.has(item.campaignName)) return false;
      }
      if (searchCampaign && !item.campaignName.toLowerCase().includes(searchCampaign.toLowerCase())) return false;
      return true;
    });
  }, [categorizedCampaigns, dateFrom, dateTo, selectedGroup, selectedTurma, selectedCampaign, checkedCampaignIds, isFilterExplicit, searchCampaign, campaignConfigs, campaignsByGroup]);

  const sortedCampaigns = useMemo(() => {
    const s = [...filteredCampaigns];
    switch (sortBy) {
      case "date-asc":    return s.sort((a, b) => a.date.localeCompare(b.date));
      case "invest-desc": return s.sort((a, b) => b.investment - a.investment);
      case "invest-asc":  return s.sort((a, b) => a.investment - b.investment);
      case "roas-desc":   return s.sort((a, b) => b.roas - a.roas);
      case "ctr-desc":    return s.sort((a, b) => b.ctr - a.ctr);
      default:            return s.sort((a, b) => b.date.localeCompare(a.date));
    }
  }, [filteredCampaigns, sortBy]);

  const totals             = aggregateTotals(filteredCampaigns);
  const dailyTrend         = buildDailyTrend(filteredCampaigns);
  const campaignComparison = buildCampaignComparison(filteredCampaigns);
  const budgetDistribution = buildBudgetDistribution(filteredCampaigns);
  const aggregated         = useMemo(() => aggregateByCampaign(filteredCampaigns), [filteredCampaigns]);

  const showRightPanel     = mainTab !== "history" && mainTab !== "profiles" && mainTab !== "products";
  const showCourseGroups   = selectedCategory !== null;
  const sidebarGroups      = selectedCategory
    ? allGroups.filter((g) => g.section === (selectedCategory as string))
    : allGroups;
  const currentTab         = MAIN_TABS.find((t) => t.id === mainTab)!;
  const hasActiveFilters   = !!(dateFrom || dateTo || searchCampaign || selectedGroup !== "all" || selectedCampaign !== "all" || isFilterExplicit);

  // Whether the current tab needs a category to be meaningful
  const needsCategory = mainTab !== "history" && mainTab !== "profiles" && mainTab !== "products";

  const handleClearFilters = () => {
    setDateFrom(""); setDateTo(""); setSearchCampaign(""); setSelectedGroup("all"); setSelectedCampaign("all"); setCheckedCampaignIds([]);
  };

  const handleSelectGroup = (id: string) => {
    setSelectedGroup(id);
    setCheckedCampaignIds([]);
    setShowMobilePanel(false);
  };

  const handleSelectCampaign = (id: string) => {
    setSelectedCampaign(id);
    setShowMobilePanel(false);
  };

  const navContent = (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Menu</p>
      <ul className="space-y-0.5">
        {MAIN_TABS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              onClick={() => { setMainTab(id); setShowMobileNav(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              style={mainTab === id
                ? {
                    backgroundColor: "var(--dm-nav-active-bg)",
                    color: "var(--dm-nav-active-text)",
                  }
                : {
                    color: "var(--dm-nav-default-text)",
                  }
              }
              onMouseEnter={(e) => {
                if (mainTab !== id) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--dm-nav-hover-bg)";
                  (e.currentTarget as HTMLElement).style.color = "var(--dm-nav-hover-text)";
                }
              }}
              onMouseLeave={(e) => {
                if (mainTab !== id) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "";
                  (e.currentTarget as HTMLElement).style.color = "var(--dm-nav-default-text)";
                }
              }}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  const campaignPanelProps: CampaignPanelProps = {
    selectedGroup, selectedTurma, activeCampaigns, turmasByGroup,
    dateFrom, dateTo, searchCampaign,
    showCourseGroups,
    groups: sidebarGroups,
    selectedCampaign,
    campaignsByGroup,
    checkedCampaignIds,
    sortBy,
    onSelectGroup: handleSelectGroup,
    onSelectTurma: (t) => { setSelectedTurma(t); setShowMobilePanel(false); },
    onSelectCampaign: handleSelectCampaign,
    onToggleActive: toggleActive,
    onDateFrom: setDateFrom,
    onDateTo: setDateTo,
    onSearch: setSearchCampaign,
    onClearFilters: handleClearFilters,
    onSortBy: setSortBy,
    onCheckedCampaignIds: handleCheckedCampaignIds,
    onClearCampaignFilter: handleClearCampaignFilter,
    isFilterExplicit,
    hasActiveFilters,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--dm-bg-page)]">

      {/* ── Mobile nav overlay ── */}
      {showMobileNav && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMobileNav(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60" />
        </div>
      )}

      {/* ── Mobile campaign panel overlay ── */}
      {showMobilePanel && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMobilePanel(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60" />
        </div>
      )}

      {/* ── Left sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-auto ${
          showMobileNav ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        } lg:flex lg:w-[220px] lg:flex-shrink-0`}
        style={{ backgroundColor: "var(--dm-bg-sidebar)", borderColor: "var(--dm-border-default)" }}
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => { setMainTab("overview"); setSelectedCategory(null); setShowMobileNav(false); }}
            className="flex items-center gap-2.5 transition hover:opacity-80"
            title="Voltar ao início"
          >
            <DashMonsterLogo size={32} />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">DashMonster</span>
          </button>
          <button
            onClick={() => setShowMobileNav(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
          >
            <X size={14} />
          </button>
        </div>

        {navContent}

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-700">
          <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${campaigns.length > 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-slate-50 dark:bg-slate-700/50"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${campaigns.length > 0 ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-500"}`} />
            <p className={`text-[11px] font-medium ${campaigns.length > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
              {campaigns.length > 0
                ? `${campaigns.length} registros carregados`
                : "Nenhum dado importado"}
            </p>
          </div>
        </div>
      </aside>

      {/* ── Center ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b px-4 md:px-6" style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}>
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile) */}
            <button
              onClick={() => setShowMobileNav(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 lg:hidden"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb + category chip */}
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <button
                type="button"
                onClick={() => { setMainTab("overview"); setSelectedCategory(null); }}
                className="flex items-center gap-1 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                title="Voltar ao início"
              >
                <Home size={13} />
                <span className="hidden md:inline">Dashboard</span>
              </button>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{currentTab.label}</span>

              {/* Category chip — click to change */}
              {selectedCategory && needsCategory && (() => {
                const CatIcon = CATEGORY_ICON[selectedCategory];
                const dot     = CATEGORY_DOT[selectedCategory];
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    title="Trocar categoria"
                    className="ml-1 flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
                    <CatIcon size={11} />
                    <span className="hidden sm:inline">{CATEGORY_LABEL[selectedCategory]}</span>
                    <X size={10} className="text-slate-400 dark:text-slate-500" />
                  </button>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Mobile campaign panel button */}
            {showRightPanel && (
              <button
                onClick={() => setShowMobilePanel(true)}
                className="relative flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 lg:hidden"
              >
                <Filter size={13} />
                Filtros
                {hasActiveFilters && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand" />
                )}
              </button>
            )}

            {/* Active data source badge — shown when data is loaded */}
            {dataSource && (
              <div className="flex h-8 items-center gap-1.5 rounded-lg border pl-2.5 pr-1 text-xs font-medium"
                style={{
                  backgroundColor: "var(--dm-success-bg)",
                  borderColor: "var(--dm-success-border)",
                  color: "var(--dm-success-text)",
                }}
              >
                {dataSource.type === "google_sheets"
                  ? <Link2   size={12} className="flex-shrink-0" />
                  : dataSource.type === "meta"
                  ? <Zap     size={12} className="flex-shrink-0" />
                  : <FileUp  size={12} className="flex-shrink-0" />
                }
                <span className="hidden max-w-[140px] truncate sm:block" title={dataSource.label}>
                  {dataSource.type === "google_sheets"
                    ? (() => { try { return new URL(dataSource.label).pathname.split("/")[3]?.slice(0, 12) + "…"; } catch { return dataSource.label; } })()
                    : dataSource.label
                  }
                </span>
                <button
                  type="button"
                  onClick={() => onDisconnect?.()}
                  title="Desconectar fonte de dados"
                  className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  <X size={11} />
                </button>
              </div>
            )}

            {/* Goals button */}
            <div className="relative">
              <button
                onClick={() => setShowGoals((v) => !v)}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
                  showGoals
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <Flag size={13} />
                <span className="hidden sm:inline">Metas</span>
              </button>
              {showGoals && (
                <GoalsPanel
                  goals={goals}
                  groupLabel={selectedGroup === "all" ? "Global" : (allGroups.find(g => g.id === selectedGroup)?.label ?? selectedGroup)}
                  onSetGoal={(key, value) => setGoal(goalsGroupKey, key, value)}
                  onReset={() => resetGoals(goalsGroupKey)}
                  onClose={() => setShowGoals(false)}
                />
              )}
            </div>

            {/* Limpar dados — only shown when a source is active */}
            {dataSource && onDisconnect && (
              <button
                onClick={() => void onDisconnect()}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-500 transition hover:border-red-400 hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Zerar os dados importados"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Limpar dados</span>
              </button>
            )}

            {/* Import button */}
            <div className="relative">
              <button
                onClick={() => showImport ? setShowImport(false) : openImport("meta")}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
                  showImport
                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <FileUp size={13} />
                <span className="hidden sm:inline">
                  {dataSource ? "Trocar fonte" : "Importar dados"}
                </span>
                <span className="sm:hidden">Importar</span>
              </button>
              {showImport && (
                <ImportPopover
                  onImportCsv={onImportCsv}
                  onImportUrl={onImportUrl}
                  onImportMeta={onImportMeta}
                  campaignConfigs={campaignConfigs}
                  onSaveCampaignConfig={setCampaignConfig}
                  onClose={() => setShowImport(false)}
                  onCampaignsVerified={setCampaignsForGroup}
                  savedCampaignsByGroup={campaignsByGroup}
                  savedSelectedCampaigns={selectedCampaignsByGroup}
                  onSaveCampaignSelection={setCampaignSelectionForGroup}
                  customGroups={customGroups}
                  onAddCustomGroup={addCustomGroup}
                  initialTab={importInitialTab}
                />
              )}
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 md:mx-6">
            <span className="font-bold">Erro:</span> {error}
          </div>
        )}

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">

          {/* ── Category gate (shown when no category chosen on relevant tabs) ── */}
          {needsCategory && !selectedCategory && (
            <CategoryGate onSelect={setSelectedCategory} />
          )}

          {mainTab === "overview" && selectedCategory && (
            campaigns.length === 0 ? (
              /* ── Welcome screen ─────────────────────────────────────────────── */
              <div className="mx-auto max-w-2xl space-y-6 py-6">
                {/* Hero */}
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
                    <TrendingUp size={26} className="text-brand" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bem-vindo ao DashMonster</h1>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    Conecte sua fonte de dados para começar a analisar suas campanhas
                  </p>
                </div>

                {/* Connection options */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Meta Ads */}
                  <button
                    type="button"
                    onClick={() => openImport("meta")}
                    className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50 hover:shadow-md dark:border-blue-800 dark:bg-blue-900/10 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 transition group-hover:bg-blue-200 dark:bg-blue-900/40">
                      <Zap size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Meta Ads</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Conecte via Access Token</p>
                    </div>
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white">
                      Conectar →
                    </span>
                  </button>

                  {/* Google Sheets */}
                  <button
                    type="button"
                    onClick={() => openImport("sheets")}
                    className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-md dark:border-emerald-800 dark:bg-emerald-900/10 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 transition group-hover:bg-emerald-200 dark:bg-emerald-900/40">
                      <Link2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Google Sheets</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Cole a URL da planilha</p>
                    </div>
                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white">
                      Importar →
                    </span>
                  </button>

                  {/* CSV */}
                  <button
                    type="button"
                    onClick={() => openImport("csv")}
                    className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-6 text-center transition hover:border-violet-400 hover:bg-violet-50 hover:shadow-md dark:border-violet-800 dark:bg-violet-900/10 dark:hover:border-violet-600 dark:hover:bg-violet-900/20"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 transition group-hover:bg-violet-200 dark:bg-violet-900/40">
                      <Upload size={20} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Arquivo CSV</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Faça upload do seu CSV</p>
                    </div>
                    <span className="rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white">
                      Upload →
                    </span>
                  </button>
                </div>

                {/* Tip */}
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                  Dica: use <strong className="text-slate-600 dark:text-slate-300">Meta Ads</strong> para dados em tempo real direto da sua conta de anúncios
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredCampaigns.length === 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                    <Filter size={15} className="flex-shrink-0" />
                    Nenhuma campanha encontrada com os filtros aplicados.
                    <button onClick={handleClearFilters} className="ml-auto text-xs font-semibold underline">
                      Limpar filtros
                    </button>
                  </div>
                )}
                {/* Primary KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  <KpiCard
                    title="Total Investido"  value={formatCurrency(totals.totalInvestment)}
                    subtitle={`CTR médio: ${formatPercent(totals.averageCtr)}`}
                    icon={Wallet} accentColor="blue"
                    goalValue={goals.investment} goalLabel={goals.investment != null ? formatCurrency(goals.investment) : undefined}
                    goalPct={goals.investment != null ? (totals.totalInvestment / goals.investment) * 100 : null}
                  />
                  <KpiCard
                    title="Receita Total" value={formatCurrency(totals.totalRevenue)}
                    subtitle={`ROAS: ${totals.roas.toFixed(2)}x`}
                    icon={CircleDollarSign} accentColor="emerald"
                    goalValue={goals.roas} goalLabel={goals.roas != null ? `ROAS ${goals.roas.toFixed(1)}x` : undefined}
                    goalPct={goals.roas != null ? (totals.roas / goals.roas) * 100 : null}
                  />
                  <KpiCard
                    title="Conversões" value={formatNumber(totals.totalConversions)}
                    subtitle={`Tx.: ${formatPercent(totals.averageConversionRate)}`}
                    icon={Target} accentColor="violet"
                    goalValue={goals.conversions} goalLabel={goals.conversions != null ? formatNumber(goals.conversions) : undefined}
                    goalPct={goals.conversions != null ? (totals.totalConversions / goals.conversions) * 100 : null}
                  />
                  <KpiCard
                    title="ROI" value={formatPercent(totals.roi)}
                    subtitle="Retorno sobre investimento"
                    icon={TrendingUp} accentColor="amber"
                    goalValue={goals.roi} goalLabel={goals.roi != null ? `${goals.roi.toFixed(0)}%` : undefined}
                    goalPct={goals.roi != null ? (totals.roi / goals.roi) * 100 : null}
                  />
                  <KpiCard
                    title="CPA Médio" value={formatCurrency(totals.averageCpa)}
                    subtitle="Custo por aquisição"
                    icon={BadgeDollarSign} accentColor="rose" invertTrend
                    goalValue={goals.cpa} goalLabel={goals.cpa != null ? formatCurrency(goals.cpa) : undefined}
                    goalPct={goals.cpa != null && totals.averageCpa > 0 ? (goals.cpa / totals.averageCpa) * 100 : null}
                    goalInvert
                  />
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  <KpiCard
                    title="CTR Médio" value={formatPercent(totals.averageCtr)}
                    subtitle="Taxa de cliques"
                    icon={MousePointerClick} accentColor="blue"
                    goalValue={goals.ctr} goalLabel={goals.ctr != null ? `${goals.ctr.toFixed(1)}%` : undefined}
                    goalPct={goals.ctr != null ? (totals.averageCtr / goals.ctr) * 100 : null}
                  />
                  <KpiCard
                    title="CPC Médio" value={formatCurrency(totals.averageCpc)}
                    subtitle="Custo por clique"
                    icon={BadgeDollarSign} accentColor="amber" invertTrend
                    goalValue={goals.cpc} goalLabel={goals.cpc != null ? formatCurrency(goals.cpc) : undefined}
                    goalPct={goals.cpc != null && totals.averageCpc > 0 ? (goals.cpc / totals.averageCpc) * 100 : null}
                    goalInvert
                  />
                  <KpiCard
                    title="CPM Médio" value={formatCurrency(totals.averageCpm)}
                    subtitle="Custo por mil impressões"
                    icon={Zap} accentColor="violet" invertTrend
                    goalValue={goals.cpm} goalLabel={goals.cpm != null ? formatCurrency(goals.cpm) : undefined}
                    goalPct={goals.cpm != null && totals.averageCpm > 0 ? (goals.cpm / totals.averageCpm) * 100 : null}
                    goalInvert
                  />
                  <KpiCard
                    title="Cliques" value={formatNumber(totals.totalClicks)}
                    subtitle={`${formatNumber(totals.totalImpressions)} impressões`}
                    icon={MousePointerClick} accentColor="emerald"
                  />
                  <KpiCard
                    title="Impressões" value={formatNumber(totals.totalImpressions)}
                    subtitle="Total de visualizações"
                    icon={Activity} accentColor="rose"
                  />
                </div>

                {/* Funnel */}
                <FunnelCard
                  impressions={totals.totalImpressions}
                  clicks={totals.totalClicks}
                  conversions={totals.totalConversions}
                />

                <ChartsSection dailyTrend={dailyTrend} campaignComparison={campaignComparison} budgetDistribution={budgetDistribution} />
                <CampaignTable campaigns={sortedCampaigns} />
              </div>
            )
          )}

          {mainTab === "history"   && <HistoricalView />}
          {mainTab === "analysis"  && selectedCategory && <CampaignAnalysis campaigns={aggregated} />}
          {mainTab === "creatives" && selectedCategory && (
            <BestCreatives
              campaigns={aggregated}
              adAccountId={selectedGroup !== "all" ? campaignConfigs[selectedGroup]?.adAccountId : undefined}
            />
          )}
          {mainTab === "products"  && <ProductBase />}
          {mainTab === "profiles" && (
            <ProfileAnalysis
              campaignGroupOptions={allGroups.map((g) => ({ id: g.id, label: g.label, section: g.section }))}
              campaignConfigs={campaignConfigs}
            />
          )}

        </main>
      </div>

      {/* ── Right sidebar — desktop ── */}
      {showRightPanel && (
        <aside className="hidden w-[260px] flex-shrink-0 border-l lg:flex lg:flex-col" style={{ backgroundColor: "var(--dm-bg-sidebar)", borderColor: "var(--dm-border-default)" }}>
          <CampaignPanel {...campaignPanelProps} />
        </aside>
      )}

      {/* ── Right panel — mobile drawer ── */}
      {showRightPanel && showMobilePanel && (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-[280px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 lg:hidden">
          <CampaignPanel {...campaignPanelProps} />
        </aside>
      )}

    </div>
  );
}
