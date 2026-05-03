"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, Award, CheckCircle2, CheckSquare, DollarSign,
  Globe, ImageIcon, PauseCircle, Square, Star, TrendingUp,
  XCircle, Zap, ChevronLeft, ChevronRight, BarChart2,
} from "lucide-react";
import { AggregatedCampaign } from "@/types/campaign";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/metrics";

interface CampaignAnalysisProps {
  campaigns: AggregatedCampaign[];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "alta" | "média" | "baixa";
type Category = "criativo" | "orçamento" | "landing" | "targeting" | "escalar" | "pausar";
type SubTab   = "overview" | "critical" | "positive" | "tasks";

interface Issue        { label: string; severity: "critical" | "warning" }
interface TaskSuggestion {
  id: string; priority: Priority; category: Category; title: string; detail: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<Category, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pausar:    { label: "Pausar",    icon: PauseCircle,   color: "text-red-600",     bg: "bg-red-50" },
  criativo:  { label: "Criativo",  icon: ImageIcon,     color: "text-violet-600",  bg: "bg-violet-50" },
  landing:   { label: "Landing",   icon: Globe,         color: "text-orange-600",  bg: "bg-orange-50" },
  orçamento: { label: "Orçamento", icon: DollarSign,    color: "text-amber-600",   bg: "bg-amber-50" },
  targeting: { label: "Targeting", icon: AlertTriangle, color: "text-blue-600",    bg: "bg-blue-50" },
  escalar:   { label: "Escalar",   icon: TrendingUp,    color: "text-emerald-600", bg: "bg-emerald-50" },
};

const PRIORITY_RING: Record<Priority, string> = {
  alta:  "ring-red-200 bg-red-50",
  média: "ring-amber-200 bg-amber-50",
  baixa: "ring-emerald-200 bg-emerald-50",
};
const PRIORITY_BADGE: Record<Priority, string> = {
  alta:  "bg-red-100 text-red-700",
  média: "bg-amber-100 text-amber-700",
  baixa: "bg-emerald-100 text-emerald-700",
};
const PRIORITY_DOT: Record<Priority, string> = {
  alta: "bg-red-500", média: "bg-amber-400", baixa: "bg-emerald-500",
};

const PER_PAGE_CRITICAL = 6;
const PER_PAGE_TASKS    = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIssues(c: AggregatedCampaign): Issue[] {
  const out: Issue[] = [];
  if (c.roas < 1)                                out.push({ label: `ROAS negativo: ${c.roas.toFixed(2)}x — prejuízo por real investido`,         severity: "critical" });
  else if (c.roas < 2)                           out.push({ label: `ROAS baixo: ${c.roas.toFixed(2)}x (ideal ≥ 2x)`,                             severity: "warning" });
  if (c.conversions === 0 && c.investment > 100) out.push({ label: `Sem conversões com ${formatCurrency(c.investment)} investidos`,               severity: "critical" });
  else if (c.conversionRate < 1 && c.clicks > 200 && c.conversions > 0)
                                                 out.push({ label: `Tx. conversão baixa: ${formatPercent(c.conversionRate)} (ideal ≥ 1%)`,       severity: "warning" });
  if (c.ctr < 0.3 && c.impressions > 1000)      out.push({ label: `CTR crítico: ${formatPercent(c.ctr)} (ideal ≥ 0.5%)`,                         severity: "critical" });
  else if (c.ctr < 0.5 && c.impressions > 1000) out.push({ label: `CTR baixo: ${formatPercent(c.ctr)} (ideal ≥ 0.5%)`,                           severity: "warning" });
  return out;
}

function generateTasks(campaigns: AggregatedCampaign[]): TaskSuggestion[] {
  const tasks: TaskSuggestion[] = [];
  for (const c of campaigns) {
    const n = `"${c.campaignName}"`;
    if (c.roas < 1 && c.investment > 100)
      tasks.push({ id: `roas-neg-${c.campaignName}`, priority: "alta", category: "pausar",
        title: `Pausar ou revisar ${n}`,
        detail: `ROAS ${c.roas.toFixed(2)}x — cada R$1 investido retorna apenas R$${c.roas.toFixed(2)}. Pause enquanto revisa público, oferta e criativo.` });
    else if (c.roas >= 1 && c.roas < 2 && c.investment > 100)
      tasks.push({ id: `roas-low-${c.campaignName}`, priority: "média", category: "orçamento",
        title: `Reduzir budget de ${n} até estabilizar`,
        detail: `ROAS ${c.roas.toFixed(2)}x — margem estreita. Reduza o investimento diário em ~30% e ajuste a segmentação antes de escalar.` });
    if (c.conversions === 0 && c.investment > 100)
      tasks.push({ id: `no-conv-${c.campaignName}`, priority: "alta", category: "landing",
        title: `Revisar funil de compra de ${n}`,
        detail: `${formatCurrency(c.investment)} investidos, zero conversões. Teste o fluxo completo, cheque o pixel e a clareza da oferta na landing page.` });
    else if (c.conversionRate < 1 && c.clicks > 200 && c.conversions > 0)
      tasks.push({ id: `conv-low-${c.campaignName}`, priority: "média", category: "landing",
        title: `Otimizar landing page de ${n}`,
        detail: `${formatNumber(c.clicks)} cliques → ${formatNumber(c.conversions)} conversões (${formatPercent(c.conversionRate)}). Revise headline, prova social e CTA.` });
    if (c.ctr < 0.3 && c.impressions > 1000)
      tasks.push({ id: `ctr-crit-${c.campaignName}`, priority: "alta", category: "criativo",
        title: `Trocar criativo urgente em ${n}`,
        detail: `CTR ${formatPercent(c.ctr)} (crítico). O anúncio não gera atenção — troque imagem/vídeo e teste copy com gatilho de dor ou curiosidade.` });
    else if (c.ctr >= 0.3 && c.ctr < 0.5 && c.impressions > 1000)
      tasks.push({ id: `ctr-low-${c.campaignName}`, priority: "média", category: "criativo",
        title: `Testar variação de criativo em ${n}`,
        detail: `CTR ${formatPercent(c.ctr)} (abaixo dos 0.5% ideais). Crie 2–3 variações com hooks diferentes e faça A/B.` });
    if (c.roas >= 3 && c.investment > 50)
      tasks.push({ id: `scale-${c.campaignName}`, priority: "baixa", category: "escalar",
        title: `Escalar budget de ${n}`,
        detail: `ROAS ${c.roas.toFixed(2)}x — ótimo retorno. Aumente o budget diário em 20–30% e monitore por 3–5 dias.` });
    if (c.ctr >= 2 && c.impressions > 500)
      tasks.push({ id: `ref-ctr-${c.campaignName}`, priority: "baixa", category: "criativo",
        title: `Replicar criativo de ${n}`,
        detail: `CTR ${formatPercent(c.ctr)} — acima da média. Identifique o que funciona (formato, copy, hook) e teste em campanhas com CTR baixo.` });
    if (c.cpa > 0 && c.revenue > 0 && c.conversions > 0 && c.cpa > (c.revenue / c.conversions) * 0.5)
      tasks.push({ id: `cpa-high-${c.campaignName}`, priority: "média", category: "targeting",
        title: `Refinar segmentação de ${n} para reduzir CPA`,
        detail: `CPA ${formatCurrency(c.cpa)} — alto em relação ao ticket. Exclua segmentos de baixa intenção (lookalike muito amplo, etc).` });
  }
  const seen = new Set<string>();
  const order: Record<Priority, number> = { alta: 0, média: 1, baixa: 2 };
  return tasks
    .filter((t) => { if (seen.has(t.id)) return false; seen.add(t.id); return true; })
    .sort((a, b) => order[a.priority] - order[b.priority]);
}

// ─── Health score (0–100) ─────────────────────────────────────────────────────

function calcHealthScore(critical: number, warnings: number, total: number): number {
  if (total === 0) return 100;
  const penalty = critical * 10 + warnings * 5;
  return Math.max(0, Math.round(100 - (penalty / total) * total / Math.max(1, total) * 10));
}

function HealthRing({ score }: { score: number }) {
  const r      = 34;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color  = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  return (
    <svg width={84} height={84} viewBox="0 0 84 84" className="-rotate-90">
      <circle cx={42} cy={42} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
      <circle
        cx={42} cy={42} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

// ─── Sub-tab bar ─────────────────────────────────────────────────────────────

function SubTabBar({
  active, onChange, tabs,
}: {
  active: SubTab;
  onChange: (t: SubTab) => void;
  tabs: { id: SubTab; label: string; count?: number; icon: React.ElementType }[];
}) {
  return (
    <div className="flex gap-1 border-b border-slate-100 dark:border-slate-700">
      {tabs.map(({ id, label, count, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
            active === id
              ? "border-blue-600 text-blue-700 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Icon size={13} />
          {label}
          {count !== undefined && count > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              active === id ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
            }`}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Paginator ────────────────────────────────────────────────────────────────

function Paginator({
  page, total, perPage, onChange,
}: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} de {total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <ChevronLeft size={13} />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                p === page ? "bg-brand text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── TAB: Overview ────────────────────────────────────────────────────────────

function TabOverview({ campaigns }: { campaigns: AggregatedCampaign[] }) {
  const top10 = useMemo(
    () => [...campaigns].sort((a, b) => b.investment - a.investment).slice(0, 10),
    [campaigns],
  );
  const maxInv = Math.max(...top10.map((c) => c.investment), 1);

  return (
    <div className="space-y-4 pt-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Top 10 por Investimento</p>
      <div className="space-y-2.5">
        {top10.map((c) => {
          const roasColor = c.roas >= 3 ? "text-emerald-600" : c.roas >= 1.5 ? "text-blue-600" : c.roas >= 1 ? "text-amber-600" : "text-red-500";
          const barColor  = c.roas >= 3 ? "bg-emerald-500" : c.roas >= 1.5 ? "bg-blue-500"    : c.roas >= 1 ? "bg-amber-400"   : "bg-red-400";
          const pct       = (c.investment / maxInv) * 100;
          return (
            <div key={c.campaignName} className="group rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-700/50 dark:hover:border-slate-600 dark:hover:bg-slate-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-semibold text-slate-800 dark:text-slate-200" title={c.campaignName}>
                  {c.campaignName}
                </p>
                <div className="flex flex-shrink-0 items-center gap-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{formatCurrency(c.investment)}</span>
                  <span className={`font-bold ${roasColor}`}>{c.roas.toFixed(2)}x</span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB: Critical ────────────────────────────────────────────────────────────

function TabCritical({ campaigns }: { campaigns: AggregatedCampaign[] }) {
  const [page, setPage] = useState(1);
  const withIssues = useMemo(() =>
    campaigns
      .map((c) => ({ ...c, issues: getIssues(c) }))
      .filter((c) => c.issues.length > 0)
      .sort((a, b) => {
        const ac = a.issues.filter((i) => i.severity === "critical").length;
        const bc = b.issues.filter((i) => i.severity === "critical").length;
        return bc - ac || b.investment - a.investment;
      }),
    [campaigns],
  );

  const visible = withIssues.slice((page - 1) * PER_PAGE_CRITICAL, page * PER_PAGE_CRITICAL);

  if (withIssues.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 mt-4">
        <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
        <p className="text-sm font-medium text-emerald-700">
          Nenhum ponto crítico identificado. Todas as campanhas estão dentro dos parâmetros saudáveis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4">
      {visible.map((c) => {
        const hasCritical = c.issues.some((i) => i.severity === "critical");
        return (
          <article
            key={c.campaignName}
            className={`rounded-2xl border p-4 ${hasCritical ? "border-red-100 bg-red-50/60" : "border-amber-100 bg-amber-50/60"}`}
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {hasCritical
                  ? <XCircle size={15} className="flex-shrink-0 text-red-500" />
                  : <AlertTriangle size={15} className="flex-shrink-0 text-amber-500" />}
                <p className={`text-xs font-bold ${hasCritical ? "text-red-800" : "text-amber-800"}`}>
                  {c.campaignName}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Invest.", value: formatCurrency(c.investment) },
                  { label: "Receita", value: formatCurrency(c.revenue) },
                  { label: "ROAS",    value: `${c.roas.toFixed(2)}x` },
                  { label: "CTR",     value: formatPercent(c.ctr) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-white/70 px-2 py-1 text-center ring-1 ring-slate-200">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-xs font-bold text-slate-700">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Issues */}
            <ul className="mt-3 space-y-1.5">
              {c.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  {issue.severity === "critical"
                    ? <XCircle size={12} className="mt-0.5 flex-shrink-0 text-red-500" />
                    : <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-amber-500" />}
                  <span className={`text-xs ${issue.severity === "critical" ? "text-red-700" : "text-amber-700"}`}>
                    {issue.label}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
      <Paginator page={page} total={withIssues.length} perPage={PER_PAGE_CRITICAL} onChange={setPage} />
    </div>
  );
}

// ─── TAB: Positive ────────────────────────────────────────────────────────────

function TopList({ title, subtitle, icon: Icon, items, metricLabel, metricValue, color, bg }: {
  title: string; subtitle: string; icon: React.ElementType;
  items: AggregatedCampaign[];
  metricLabel: string; metricValue: (c: AggregatedCampaign) => string;
  color: string; bg: string;
}) {
  if (items.length === 0) return null;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${bg} dark:opacity-80`}>
          <Icon size={14} className={color} />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>
      </div>
      <ol className="space-y-2">
        {items.map((c, i) => (
          <li key={c.campaignName} className="flex items-center gap-2.5">
            <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
            }`}>{i + 1}</span>
            <p className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-300" title={c.campaignName}>
              {c.campaignName}
            </p>
            <span className={`flex-shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${bg} ${color} dark:opacity-80`}>
              {metricLabel}: {metricValue(c)}
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function TabPositive({ campaigns }: { campaigns: AggregatedCampaign[] }) {
  const topRoas = useMemo(() => [...campaigns].filter((c) => c.roas >= 2 && c.investment > 50).sort((a, b) => b.roas - a.roas).slice(0, 5), [campaigns]);
  const topRev  = useMemo(() => [...campaigns].filter((c) => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5), [campaigns]);
  const topCtr  = useMemo(() => [...campaigns].filter((c) => c.ctr >= 1 && c.impressions > 500).sort((a, b) => b.ctr - a.ctr).slice(0, 5), [campaigns]);
  const topConv = useMemo(() => [...campaigns].filter((c) => c.conversionRate >= 2 && c.clicks > 50).sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 5), [campaigns]);
  const hasAny  = topRoas.length > 0 || topRev.length > 0 || topCtr.length > 0 || topConv.length > 0;

  if (!hasAny) return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-sm text-slate-400">Nenhum destaque positivo nos filtros atuais. Tente ampliar o período.</p>
    </div>
  );

  return (
    <div className="grid gap-3 pt-4 sm:grid-cols-2">
      <TopList title="Melhor ROAS" subtitle="Maior retorno sobre investimento (≥ 2x)"
        icon={TrendingUp} items={topRoas} metricLabel="ROAS" metricValue={(c) => `${c.roas.toFixed(2)}x`}
        color="text-emerald-700" bg="bg-emerald-50" />
      <TopList title="Maior Receita" subtitle="Campanhas com maior faturamento"
        icon={Award} items={topRev} metricLabel="Receita" metricValue={(c) => formatCurrency(c.revenue)}
        color="text-emerald-700" bg="bg-emerald-50" />
      <TopList title="Melhor CTR" subtitle="Alta taxa de cliques — criativo engaja (≥ 1%)"
        icon={Zap} items={topCtr} metricLabel="CTR" metricValue={(c) => formatPercent(c.ctr)}
        color="text-blue-700" bg="bg-blue-50" />
      <TopList title="Melhor Conversão" subtitle="Cliques que viram compras (≥ 2%)"
        icon={Star} items={topConv} metricLabel="Conv." metricValue={(c) => formatPercent(c.conversionRate)}
        color="text-violet-700" bg="bg-violet-50" />
    </div>
  );
}

// ─── TAB: Tasks ──────────────────────────────────────────────────────────────

function TabTasks({ tasks }: { tasks: TaskSuggestion[] }) {
  const [checked, setChecked]     = useState<Set<string>>(new Set());
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterPri, setFilterPri] = useState<Priority | "all">("all");
  const [page, setPage]           = useState(1);

  const toggle = (id: string) =>
    setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = useMemo(() =>
    tasks.filter((t) =>
      !checked.has(t.id) &&
      (filterCat === "all" || t.category === filterCat) &&
      (filterPri === "all" || t.priority === filterPri),
    ), [tasks, checked, filterCat, filterPri]);

  const done    = tasks.filter((t) => checked.has(t.id));
  const visible = filtered.slice((page - 1) * PER_PAGE_TASKS, page * PER_PAGE_TASKS);

  const usedCategories = Array.from(new Set(tasks.map((t) => t.category))) as Category[];

  const handleFilterCat = (c: Category | "all") => { setFilterCat(c); setPage(1); };
  const handleFilterPri = (p: Priority | "all") => { setFilterPri(p); setPage(1); };

  return (
    <div className="space-y-4 pt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Priority filter */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-0.5">
          {(["all", "alta", "média", "baixa"] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleFilterPri(p)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                filterPri === p ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[p]}`} />}
              {p === "all" ? "Todas" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handleFilterCat("all")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              filterCat === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Todas
          </button>
          {usedCategories.map((cat) => {
            const m = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => handleFilterCat(cat)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  filterCat === cat ? `${m.bg} ${m.color}` : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <m.icon size={10} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> tarefas pendentes
          {done.length > 0 && <> · <span className="font-bold text-emerald-600 dark:text-emerald-400">{done.length}</span> concluídas</>}
        </p>
        {done.length > 0 && (
          <button onClick={() => setChecked(new Set())} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
            Limpar concluídas
          </button>
        )}
      </div>

      {/* Task cards */}
      {visible.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700">
            {tasks.length === 0
              ? "Nenhuma ação necessária — campanhas saudáveis!"
              : "Nenhuma tarefa para o filtro selecionado."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((task) => {
            const cat = CATEGORY_META[task.category];
            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 rounded-2xl border p-4 transition ring-1 ${PRIORITY_RING[task.priority]}`}
              >
                <button
                  onClick={() => toggle(task.id)}
                  className="mt-0.5 flex-shrink-0 text-slate-300 transition hover:text-blue-500"
                  title="Marcar como concluída"
                >
                  <Square size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_BADGE[task.priority]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.bg} ${cat.color}`}>
                      <cat.icon size={9} />
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{task.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{task.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Paginator page={page} total={filtered.length} perPage={PER_PAGE_TASKS} onChange={setPage} />

      {/* Done section */}
      {done.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-700">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Concluídas</p>
          {done.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 opacity-60 dark:border-slate-700 dark:bg-slate-700/50">
              <button onClick={() => toggle(t.id)} className="flex-shrink-0 text-emerald-500 hover:text-slate-400">
                <CheckSquare size={15} />
              </button>
              <p className="text-xs text-slate-500 line-through dark:text-slate-400">{t.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CampaignAnalysis({ campaigns }: CampaignAnalysisProps) {
  const [subTab, setSubTab] = useState<SubTab>("overview");

  const tasks    = useMemo(() => generateTasks(campaigns), [campaigns]);
  const critical = useMemo(() => campaigns.filter((c) => c.roas < 1 || (c.conversions === 0 && c.investment > 100)), [campaigns]);
  const warnings = useMemo(() => campaigns.filter((c) => c.roas >= 1 && c.roas < 2 && !critical.includes(c)), [campaigns, critical]);
  const positive = useMemo(() => campaigns.filter((c) => c.roas >= 2), [campaigns]);

  const issueCount = useMemo(() =>
    campaigns.map((c) => getIssues(c)).filter((i) => i.length > 0).length,
    [campaigns],
  );
  const tasksPending = tasks.length;
  const score        = calcHealthScore(critical.length, warnings.length, campaigns.length);
  const scoreColor   = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";
  const scoreLabel   = score >= 70 ? "Saudável" : score >= 40 ? "Atenção" : "Crítico";

  const TABS = [
    { id: "overview" as SubTab, label: "Visão Geral",   icon: BarChart2,     count: undefined },
    { id: "critical" as SubTab, label: "Problemas",     icon: XCircle,       count: issueCount },
    { id: "positive" as SubTab, label: "Destaques",     icon: CheckCircle2,  count: positive.length },
    { id: "tasks"    as SubTab, label: "Plano de Ação", icon: CheckSquare,   count: tasksPending },
  ];

  return (
    <div className="space-y-4">

      {/* ── Health score header ── */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <HealthRing score={score} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={`text-lg font-black leading-none ${scoreColor}`}>{score}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">score</p>
          </div>
        </div>

        {/* Label + divider */}
        <div className="flex-shrink-0 border-r border-slate-100 pr-4 dark:border-slate-700">
          <p className={`text-base font-black ${scoreColor}`}>{scoreLabel}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""} analisadas</p>
        </div>

        {/* Counters */}
        <div className="flex flex-wrap gap-3">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${critical.length > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-50 dark:bg-slate-700/50"}`}>
            <XCircle size={15} className={critical.length > 0 ? "text-red-500" : "text-slate-300 dark:text-slate-600"} />
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{critical.length}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Crítica{critical.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${warnings.length > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-700/50"}`}>
            <AlertTriangle size={15} className={warnings.length > 0 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"} />
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{warnings.length}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Alerta{warnings.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${positive.length > 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-slate-50 dark:bg-slate-700/50"}`}>
            <CheckCircle2 size={15} className={positive.length > 0 ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"} />
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{positive.length}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Saudável{positive.length !== 1 ? "is" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
            <CheckSquare size={15} className={tasksPending > 0 ? "text-blue-500" : "text-slate-300 dark:text-slate-600"} />
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{tasksPending}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Ação{tasksPending !== 1 ? "ões" : ""}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-tab card ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="px-5 pt-4">
          <SubTabBar active={subTab} onChange={setSubTab} tabs={TABS} />
        </div>
        <div className="px-5 pb-5">
          {subTab === "overview"  && <TabOverview  campaigns={campaigns} />}
          {subTab === "critical"  && <TabCritical  campaigns={campaigns} />}
          {subTab === "positive"  && <TabPositive  campaigns={campaigns} />}
          {subTab === "tasks"     && <TabTasks     tasks={tasks} />}
        </div>
      </div>

    </div>
  );
}
