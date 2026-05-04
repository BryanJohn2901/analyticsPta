"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import {
  Activity, BadgeDollarSign, BarChart2, BookMarked, BookOpen, CalendarDays,
  CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign, Dumbbell, FileText,
  FileUp, Filter, ImageIcon, Link2, Loader2, Menu, Moon, Package, Plus, Repeat,
  SlidersHorizontal, Sun, Target, TrendingUp, Trophy, Upload, Users, Wallet,
  X, XCircle, Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { CampaignData, ProductCategory } from "@/types/campaign";
import { CampaignConfig, CampaignSummary, useCampaignStore } from "@/hooks/useCampaignStore";
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
import { ChartsSection } from "@/components/charts/ChartsSection";
import { CampaignTable } from "@/components/CampaignTable";
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

type GroupSection = "pos" | "livros" | "ebooks" | "perpetuo" | "eventos";

const SECTION_LABELS: Record<GroupSection, string> = {
  pos:      "Pós Graduação",
  livros:   "Livros",
  ebooks:   "Ebooks",
  perpetuo: "Perpétuo",
  eventos:  "Eventos",
};

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
  { section: "eventos",  id: "bs",           label: "BS (Biomechanic Spec.)", icon: CalendarDays,iconBg: "bg-rose-100",    iconColor: "text-rose-600",    activeDot: "bg-rose-500",    activePulse: "bg-rose-400",    selectedBg: "bg-rose-50",    selectedText: "text-rose-700",    selectedBorder: "border-rose-200" },
  { section: "eventos",  id: "mentoria",     label: "Mentoria Scala",         icon: CalendarDays,iconBg: "bg-red-100",     iconColor: "text-red-600",     activeDot: "bg-red-500",     activePulse: "bg-red-400",     selectedBg: "bg-red-50",     selectedText: "text-red-700",     selectedBorder: "border-red-200" },
  { section: "eventos",  id: "next",         label: "Next",                   icon: CalendarDays,iconBg: "bg-rose-100",    iconColor: "text-rose-600",    activeDot: "bg-rose-500",    activePulse: "bg-rose-400",    selectedBg: "bg-rose-50",    selectedText: "text-rose-700",    selectedBorder: "border-rose-200" },
  { section: "eventos",  id: "powertrainer", label: "Power Trainer",          icon: CalendarDays,iconBg: "bg-red-100",     iconColor: "text-red-600",     activeDot: "bg-red-500",     activePulse: "bg-red-400",     selectedBg: "bg-red-50",     selectedText: "text-red-700",     selectedBorder: "border-red-200" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// classifyCourse lives in campaignClassifier.ts — re-exported here as alias
// for backwards-compatibility with local call sites.
const getLaunchGroup = classifyCourse;

const getSubLaunchCode = (name: string): string => {
  const match = name.match(/\b([A-Za-z]{1,4}\s?-?\d{1,2})\b/);
  if (!match?.[1]) return "";
  return match[1].replace(/[\s-]/g, "").toUpperCase();
};

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
}

// ─── Account row (dynamic "add what you need" UX) ─────────────────────────────
interface AccountRow { rowId: string; groupId: string; accountId: string }

function ImportPopover({
  onImportCsv, onImportUrl, onImportMeta, campaignConfigs, onSaveCampaignConfig, onClose,
  onCampaignsVerified,
}: ImportPopoverProps) {
  const [tab, setTab]                     = useState<ImportTab>("sheets");
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
  const [datePreset, setDatePreset]       = useState<DatePreset>("30d");
  const dateRange = dateRangeFromPreset(datePreset);
  const [importingMeta, setImportingMeta] = useState(false);
  const [metaImportError, setMetaImportError] = useState<string | null>(null);
  const fileRef                           = useRef<HTMLInputElement>(null);

  // ── Campaign picker state ────────────────────────────────────────────────────
  // campaigns fetched per ad-account ID (shared across groups using the same account)
  const [campaignsByAccount, setCampaignsByAccount] = useState<Record<string, MetaCampaign[]>>({});
  // per-group: which campaign IDs are selected (undefined → all)
  const [selectedCampaigns, setSelectedCampaigns]   = useState<Record<string, string[]>>({});
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
      // Default: all campaigns selected
      setSelectedCampaigns((p) => ({
        ...p,
        [groupId]: campaigns.map((c) => c.id),
      }));
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
  const handleAddRow = () => {
    const usedIds = new Set(accountRows.map((r) => r.groupId));
    const next = CAMPAIGN_GROUPS.find((g) => !usedIds.has(g.id));
    if (!next) return;
    setAccountRows((p) => [...p, { rowId: `row-${Date.now()}`, groupId: next.id, accountId: "" }]);
  };

  /** Toggle a single campaign selection within a group. */
  const handleToggleCampaign = (groupId: string, campaignId: string, allForAccount: MetaCampaign[]) => {
    setSelectedCampaigns((p) => {
      const current = p[groupId] ?? allForAccount.map((c) => c.id);
      const next    = current.includes(campaignId)
        ? current.filter((id) => id !== campaignId)
        : [...current, campaignId];
      return { ...p, [groupId]: next };
    });
  };

  /** Select or deselect all campaigns for a group. */
  const handleSelectAllCampaigns = (groupId: string, allForAccount: MetaCampaign[], selectAll: boolean) => {
    setSelectedCampaigns((p) => ({
      ...p,
      [groupId]: selectAll ? allForAccount.map((c) => c.id) : [],
    }));
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
                {metaAccounts.length} conta{metaAccounts.length > 1 ? "s" : ""} encontrada{metaAccounts.length > 1 ? "s" : ""} — selecione abaixo
              </div>
            )}

            {/* Date range preset */}
            <div>
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
            </div>

            {/* ── Ad account rows ──────────────────────────────────────────── */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ad Accounts configurados
                </label>
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
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  {accountRows.map((row) => {
                    const g          = CAMPAIGN_GROUPS.find((x) => x.id === row.groupId)!;
                    const accountId  = row.accountId.trim();
                    const campaigns  = accountId ? (campaignsByAccount[accountId] ?? []) : [];
                    const isExpanded = expandedGroup === row.groupId;
                    const status     = verifyStatus[row.groupId] ?? "idle";
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
                                {CAMPAIGN_GROUPS.filter((grp) => grp.section === sec).map((grp) => {
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

                          {/* Account field: dropdown (if Conectar used) or manual input */}
                          {metaAccounts.length > 0 ? (
                            <select
                              value={row.accountId}
                              onChange={(e) => handleChangeRowAccount(row.rowId, e.target.value)}
                              className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[10px] text-slate-800 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                            >
                              <option value="">— selecionar conta —</option>
                              {metaAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}{acc.account_status !== 1 ? " ⚠" : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={row.accountId}
                              onChange={(e) => handleChangeRowAccount(row.rowId, e.target.value)}
                              placeholder="act_123456789"
                              className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] text-slate-800 placeholder-slate-300 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-600"
                            />
                          )}

                          {/* Verify status badge */}
                          {status === "loading" && (
                            <Loader2 size={13} className="flex-shrink-0 animate-spin text-blue-500" />
                          )}
                          {status === "ok" && campaigns.length > 0 && (
                            <button
                              type="button"
                              onClick={() => void handleVerifyGroup(row.groupId)}
                              title={`${campaigns.length} campanhas — clique para ${isExpanded ? "fechar" : "filtrar"}`}
                              className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
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

              {/* Add row button */}
              {accountRows.length < CAMPAIGN_GROUPS.length && (
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-[11px] font-semibold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/10 dark:hover:text-blue-400"
                >
                  <Plus size={13} /> Adicionar campanha
                </button>
              )}
            </div>

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
  onSelectGroup: (id: string) => void;
  onSelectTurma: (t: string) => void;
  onSelectCampaign: (id: string) => void;
  onToggleActive: (id: string, v: boolean) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onSearch: (v: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

function CampaignPanel({
  selectedGroup, selectedTurma, activeCampaigns, turmasByGroup,
  dateFrom, dateTo, searchCampaign, showCourseGroups,
  groups, selectedCampaign, campaignsByGroup,
  onSelectGroup, onSelectTurma, onSelectCampaign, onToggleActive,
  onDateFrom, onDateTo, onSearch, onClearFilters, hasActiveFilters,
}: CampaignPanelProps) {
  const activeCount = Object.values(activeCampaigns).filter(Boolean).length;

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

                  {/* Campaign selector — shown when a group is selected and campaigns are known */}
                  {(campaignsByGroup[group.id] ?? []).length > 0 && (
                    <div className="ml-[38px] mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Campanha</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => onSelectCampaign("all")}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                            selectedCampaign === "all"
                              ? "bg-brand text-white shadow-sm"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          Todas
                        </button>
                        {(campaignsByGroup[group.id] ?? []).map((camp) => (
                          <button
                            key={camp.id}
                            onClick={() => onSelectCampaign(camp.id)}
                            title={camp.name}
                            className={`max-w-[160px] truncate rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                              selectedCampaign === camp.id
                                ? "bg-brand text-white shadow-sm"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            }`}
                          >
                            {camp.status !== "ACTIVE" && <span className="mr-1 text-amber-400">◐</span>}
                            {camp.name.length > 22 ? camp.name.slice(0, 22) + "…" : camp.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
            onChange={(e) => onSearch(e.target.value)}
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
        </div>
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
  const [showMobileNav, setShowMobileNav]   = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  const {
    selectedGroup, selectedTurma, activeCampaigns, campaignConfigs,
    selectedCategory, campaignsByGroup, selectedCampaign, enabledSections,
    setSelectedGroup, setSelectedTurma, toggleActive, setCampaignConfig,
    setSelectedCategory, setCampaignsForGroup, setSelectedCampaign, setEnabledSections,
  } = useCampaignStore();

  // ── Account → section map for Meta data ──────────────────────────────────────
  const accountSectionMap = useMemo<Record<string, ProductCategory>>(() => {
    const map: Record<string, ProductCategory> = {};
    CAMPAIGN_GROUPS.forEach((g) => {
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
        group = CAMPAIGN_GROUPS.find((g) => {
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
      if (searchCampaign && !item.campaignName.toLowerCase().includes(searchCampaign.toLowerCase())) return false;
      return true;
    });
  }, [categorizedCampaigns, dateFrom, dateTo, selectedGroup, selectedTurma, selectedCampaign, searchCampaign, campaignConfigs, campaignsByGroup]);

  const totals             = aggregateTotals(filteredCampaigns);
  const dailyTrend         = buildDailyTrend(filteredCampaigns);
  const campaignComparison = buildCampaignComparison(filteredCampaigns);
  const budgetDistribution = buildBudgetDistribution(filteredCampaigns);
  const aggregated         = useMemo(() => aggregateByCampaign(filteredCampaigns), [filteredCampaigns]);

  const showRightPanel     = mainTab !== "history" && mainTab !== "profiles" && mainTab !== "products";
  const showCourseGroups   = selectedCategory !== null;
  const sidebarGroups      = selectedCategory
    ? CAMPAIGN_GROUPS.filter((g) => g.section === (selectedCategory as string))
    : CAMPAIGN_GROUPS;
  const currentTab         = MAIN_TABS.find((t) => t.id === mainTab)!;
  const hasActiveFilters   = !!(dateFrom || dateTo || searchCampaign || selectedGroup !== "all" || selectedCampaign !== "all");

  // Whether the current tab needs a category to be meaningful
  const needsCategory = mainTab !== "history" && mainTab !== "profiles" && mainTab !== "products";

  const handleClearFilters = () => {
    setDateFrom(""); setDateTo(""); setSearchCampaign(""); setSelectedGroup("all"); setSelectedCampaign("all");
  };

  const handleSelectGroup = (id: string) => {
    setSelectedGroup(id);
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
    onSelectGroup: handleSelectGroup,
    onSelectTurma: (t) => { setSelectedTurma(t); setShowMobilePanel(false); },
    onSelectCampaign: handleSelectCampaign,
    onToggleActive: toggleActive,
    onDateFrom: setDateFrom,
    onDateTo: setDateTo,
    onSearch: setSearchCampaign,
    onClearFilters: handleClearFilters,
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
          <div className="flex items-center gap-2.5">
            <DashMonsterLogo size={32} />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">DashMonster</span>
          </div>
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
              <span className="hidden text-slate-400 dark:text-slate-500 md:inline">Dashboard</span>
              <span className="hidden text-slate-300 dark:text-slate-600 md:inline">/</span>
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

            {/* Import button */}
            <div className="relative">
              <button
                onClick={() => setShowImport((v) => !v)}
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
              /* Empty state */
              <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800 md:py-24">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
                  <TrendingUp size={28} className="text-slate-300 dark:text-slate-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-700 dark:text-slate-200">Nenhuma campanha carregada</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Clique em <span className="font-semibold text-blue-600">Importar dados</span> para começar
                  </p>
                </div>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
                >
                  <FileUp size={15} /> Importar dados
                </button>
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  <KpiCard title="Total Investido"  value={formatCurrency(totals.totalInvestment)} subtitle={`CTR médio: ${formatPercent(totals.averageCtr)}`}               icon={Wallet}           accentColor="blue" />
                  <KpiCard title="Receita Total"     value={formatCurrency(totals.totalRevenue)}    subtitle={`ROAS: ${totals.roas.toFixed(2)}x`}                              icon={CircleDollarSign} accentColor="emerald" />
                  <KpiCard title="Conversões"        value={formatNumber(totals.totalConversions)}  subtitle={`Tx.: ${formatPercent(totals.averageConversionRate)}`}            icon={Target}           accentColor="violet" />
                  <KpiCard title="ROI"               value={formatPercent(totals.roi)}              subtitle="Retorno sobre investimento"                                       icon={TrendingUp}       accentColor="amber" />
                  <KpiCard title="CPA Médio"         value={formatCurrency(totals.averageCpa)}      subtitle="Custo por aquisição"                                              icon={BadgeDollarSign}  accentColor="rose"  invertTrend />
                </div>
                <ChartsSection dailyTrend={dailyTrend} campaignComparison={campaignComparison} budgetDistribution={budgetDistribution} />
                <CampaignTable campaigns={filteredCampaigns} />
              </div>
            )
          )}

          {mainTab === "history"   && <HistoricalView />}
          {mainTab === "analysis"  && selectedCategory && <CampaignAnalysis campaigns={aggregated} />}
          {mainTab === "creatives" && selectedCategory && <BestCreatives campaigns={aggregated} />}
          {mainTab === "products"  && <ProductBase />}
          {mainTab === "profiles"  && (
            <ProfileAnalysis
              selectedGroup={selectedGroup}
              adAccountId={campaignConfigs[selectedGroup]?.adAccountId ?? ""}
              groupLabel={CAMPAIGN_GROUPS.find((g) => g.id === selectedGroup)?.label ?? selectedGroup}
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
