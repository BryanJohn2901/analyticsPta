"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertCircle, ArrowLeft, BookMarked, CalendarDays, CheckCircle2, Edit2,
  GraduationCap, Key, Loader2, Plus, RefreshCw, Repeat, Trash2, Users, X, Zap,
} from "lucide-react";
import {
  fetchMetaCampaigns, fetchMetaInsights, loadMetaCredentials, MetaInsight,
} from "@/utils/metaApi";
import { formatBRL, formatCompact, formatInt, formatPercent, safeNumber } from "@/lib/format";
import { getTemplate, TEMPLATE_LIST, DEFAULT_PERSONALIZADO_CONFIG } from "@/lib/templates";
import type { TemplateId, Template, PersonalizadoConfig } from "@/lib/templates/types";
import { TemplateSelector } from "@/components/profiles/TemplateSelector";
import { PersonalizadoBuilder } from "@/components/profiles/PersonalizadoBuilder";
import {
  useAdvertiserStore, AdvertiserProfile, ActiveCampaign,
} from "@/hooks/useAdvertiserStore";
import type { CampaignConfig } from "@/hooks/useCampaignStore";

const formatCurrency = formatBRL;
const formatNumber = formatInt;

const TEMPLATE_LS_KEY = "pta_profile_template_v1";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GroupOption {
  id: string;
  label: string;
  section: string;
}

interface ProfileAnalysisProps {
  campaignGroupOptions: GroupOption[];
  campaignConfigs: Record<string, CampaignConfig>;
}

// ─── Analysis helpers ─────────────────────────────────────────────────────────

interface AdsetRow {
  name: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  revenue: number;
  cpm: number;
  ctr: number;
  purchases: number;
  leads: number;
  cpa: number;
}

function todayStr() { return new Date().toISOString().split("T")[0]; }
function daysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function getActionValue(actions: MetaInsight["actions"], type: string): number {
  return Number(actions?.find((a) => a.action_type === type)?.value ?? 0);
}

function pickActionValue(avs: MetaInsight["action_values"], ...types: string[]): number {
  if (!avs) return 0;
  for (const t of types) {
    const f = avs.find((a) => a.action_type === t);
    if (f) return parseFloat(f.value) || 0;
  }
  return 0;
}

function toAdsetRows(data: MetaInsight[]): AdsetRow[] {
  const map = new Map<string, AdsetRow>();
  data.forEach((d) => {
    const key = d.adset_name ?? d.campaign_name;
    const cur = map.get(key) ?? {
      name: key,
      impressions: 0, reach: 0, clicks: 0, spend: 0, revenue: 0,
      cpm: 0, ctr: 0, purchases: 0, leads: 0, cpa: 0,
    };
    cur.impressions += safeNumber(d.impressions);
    cur.reach       += safeNumber(d.reach);
    cur.clicks      += safeNumber(d.clicks);
    cur.spend       += safeNumber(d.spend);
    cur.purchases   += getActionValue(d.actions, "purchase");
    cur.leads       += getActionValue(d.actions, "lead")
                     + getActionValue(d.actions, "onsite_conversion.lead_grouped");
    cur.revenue     += pickActionValue(d.action_values, "purchase", "omni_purchase",
                       "offsite_conversion.fb_pixel_purchase");
    map.set(key ?? "", cur);
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    cpm: r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0,
    ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
    cpa: r.purchases > 0 ? r.spend / r.purchases : 0,
  })).sort((a, b) => b.spend - a.spend);
}

// ─── Section constants ────────────────────────────────────────────────────────

const SECTION_META = {
  pos:      { label: "Pós Graduação", icon: GraduationCap, color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  livros:   { label: "Livros",        icon: BookMarked,    color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
  ebooks:   { label: "Ebooks",        icon: BookMarked,    color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  perpetuo: { label: "Perpétuo",      icon: Repeat,        color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
  eventos:  { label: "Eventos",       icon: CalendarDays,  color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200" },
} as const;

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_STYLES = [
  ["bg-blue-100 text-blue-700",      "border-blue-200"],
  ["bg-purple-100 text-purple-700",  "border-purple-200"],
  ["bg-emerald-100 text-emerald-700","border-emerald-200"],
  ["bg-pink-100 text-pink-700",      "border-pink-200"],
  ["bg-orange-100 text-orange-700",  "border-orange-200"],
  ["bg-teal-100 text-teal-700",      "border-teal-200"],
];

function avatarStyle(name: string) {
  return AVATAR_STYLES[(name.charCodeAt(0) ?? 0) % AVATAR_STYLES.length];
}

// ─── Campaign Fetcher (inline inside form) ────────────────────────────────────

function CampaignFetcher({
  adAccountId,
  onSelect,
}: {
  adAccountId: string;
  onSelect: (campaign: ActiveCampaign) => void;
}) {
  type FetchState = "idle" | "loading" | "done" | "error";
  const [state, setState]       = useState<FetchState>("idle");
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; status: string }[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const hasToken = Boolean(loadMetaCredentials().accessToken);

  const fetchCampaigns = async () => {
    if (!adAccountId.trim() || !hasToken) return;
    setState("loading"); setError(null);
    try {
      const token = loadMetaCredentials().accessToken;
      const result = await fetchMetaCampaigns(adAccountId.trim(), token);
      setCampaigns(result);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar campanhas.");
      setState("error");
    }
  };

  if (!adAccountId.trim()) return null;

  return (
    <div className="space-y-2">
      {!hasToken && (
        <p className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
          <Key size={10} /> Configure o Access Token em Importar dados → Meta Ads primeiro.
        </p>
      )}

      {state === "idle" && hasToken && (
        <button
          type="button"
          onClick={() => void fetchCampaigns()}
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
        >
          <Zap size={11} /> Buscar campanhas do Ad Account
        </button>
      )}

      {state === "loading" && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Loader2 size={12} className="animate-spin" /> Buscando campanhas…
        </div>
      )}

      {state === "error" && (
        <div className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400">
          <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="ml-auto text-[10px] underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {state === "done" && campaigns.length === 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">Nenhuma campanha ativa/pausada encontrada.</p>
      )}

      {state === "done" && campaigns.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Selecione a campanha ativa
          </p>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/40">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect({ id: c.id, name: c.name })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition hover:bg-white dark:hover:bg-slate-600"
              >
                <span
                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${c.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-400"}`}
                />
                <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300" title={c.name}>
                  {c.name}
                </span>
                <span className={`flex-shrink-0 text-[9px] ${c.status === "ACTIVE" ? "text-emerald-500" : "text-amber-400"}`}>
                  {c.status === "ACTIVE" ? "ATIVO" : "PAUSADO"}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="mt-1 text-[10px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            ↺ Recarregar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Profile Form ─────────────────────────────────────────────────────────────

interface ProfileFormData {
  name: string;
  product: string;
  adAccountId: string;
  groupId: string;
  campaigns: ActiveCampaign[];
}

const EMPTY_FORM: ProfileFormData = {
  name: "", product: "", adAccountId: "", groupId: "", campaigns: [],
};

function ProfileForm({
  initial, groupOptions, campaignConfigs, onSave, onCancel,
}: {
  initial?: ProfileFormData;
  groupOptions: GroupOption[];
  campaignConfigs: Record<string, CampaignConfig>;
  onSave: (data: ProfileFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProfileFormData>(initial ?? EMPTY_FORM);

  const handleGroupChange = (groupId: string) => {
    const auto = campaignConfigs[groupId]?.adAccountId ?? "";
    setForm((f) => ({ ...f, groupId, adAccountId: auto || f.adAccountId }));
  };

  const handleSelectCampaign = (camp: ActiveCampaign) => {
    setForm((f) => {
      if (f.campaigns.some((c) => c.id === camp.id)) return f;
      return { ...f, campaigns: [...f.campaigns, camp] };
    });
  };

  const handleRemoveCampaign = (id: string) => {
    setForm((f) => ({ ...f, campaigns: f.campaigns.filter((c) => c.id !== id) }));
  };

  const inputCls = "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:bg-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-5 text-sm font-bold text-slate-900 dark:text-slate-100">
        {initial ? "Editar Perfil" : "Novo Perfil de Anunciante"}
      </h3>
      <div className="space-y-4">

        <div>
          <label className={labelCls}>Nome do Anunciante</label>
          <input type="text" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Rafa Lund" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Produto / Pós-Graduação</label>
          <input type="text" value={form.product}
            onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
            placeholder="Ex: Pós em Treinamento Feminino" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Grupo de Campanha</label>
          <select value={form.groupId} onChange={(e) => handleGroupChange(e.target.value)}
            className={inputCls}>
            <option value="">— Selecionar grupo —</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Ad Account</label>
          <input type="text" value={form.adAccountId}
            onChange={(e) => setForm((f) => ({ ...f, adAccountId: e.target.value, campaigns: [] }))}
            placeholder="act_524658353530105" className={inputCls} />
          {form.groupId && campaignConfigs[form.groupId]?.adAccountId && (
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              Configurado: {campaignConfigs[form.groupId].adAccountId}
            </p>
          )}
        </div>

        {/* Campaign fetcher — shown once Ad Account is filled */}
        {form.adAccountId.trim() && (
          <div className="space-y-2">
            {/* Already selected campaigns */}
            {form.campaigns.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Campanhas selecionadas
                </p>
                {form.campaigns.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                    <CheckCircle2 size={11} className="flex-shrink-0 text-emerald-500" />
                    <span className="flex-1 truncate text-[11px] font-medium text-emerald-800 dark:text-emerald-300" title={c.name}>
                      {c.name}
                    </span>
                    <button type="button" onClick={() => handleRemoveCampaign(c.id)}
                      className="text-emerald-400 transition hover:text-red-500 dark:text-emerald-600">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <CampaignFetcher
              adAccountId={form.adAccountId}
              onSelect={handleSelectCampaign}
            />
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => onSave(form)}
            disabled={!form.name.trim() || !form.adAccountId.trim()}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand text-xs font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">
            Salvar Perfil
          </button>
          <button type="button" onClick={onCancel}
            className="flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({
  profile, groupLabel, onSelect, onEdit, onDelete,
}: {
  profile: AdvertiserProfile;
  groupLabel: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = profile.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const [avatarCls, borderCls] = avatarStyle(profile.name);

  return (
    <div
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-2xl border-2 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 ${borderCls} dark:border-slate-600`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarCls}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{profile.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{profile.product}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {groupLabel && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand dark:bg-brand/20">
            {groupLabel}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-500">
          {profile.adAccountId}
        </span>
      </div>

      {/* Campaign badges */}
      {profile.campaigns.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {profile.campaigns.slice(0, 2).map((c) => (
            <span key={c.id} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              {c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name}
            </span>
          ))}
          {profile.campaigns.length > 2 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700">
              +{profile.campaigns.length - 2}
            </span>
          )}
        </div>
      )}

      {profile.campaigns.length === 0 && (
        <p className="mt-2 text-[10px] italic text-slate-400 dark:text-slate-500">Sem campanhas configuradas</p>
      )}

      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">Clique para ver a análise</p>

      {/* Action buttons — shown on hover */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-700 dark:hover:text-blue-400">
          <Edit2 size={12} />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-300 hover:text-red-600 dark:border-slate-600 dark:bg-slate-700 dark:hover:text-red-400">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Single-campaign analysis panel ──────────────────────────────────────────

function CampaignAnalysisPanel({
  adAccountId, campaign, dateFrom, dateTo, template,
}: {
  adAccountId: string;
  campaign: ActiveCampaign;
  dateFrom: string;
  dateTo: string;
  template: Template;
}) {
  const [data, setData]       = useState<AdsetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const raw = await fetchMetaInsights(adAccountId, dateFrom, dateTo, [campaign.id]);
      setData(toAdsetRows(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  }, [adAccountId, campaign.id, dateFrom, dateTo]);

  useEffect(() => { void load(); }, [load]);

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalSpend       = data.reduce((s, r) => s + r.spend,       0);
  const totalRevenue     = data.reduce((s, r) => s + r.revenue,     0);
  const totalPurchases   = data.reduce((s, r) => s + r.purchases,   0);
  const totalClicks      = data.reduce((s, r) => s + r.clicks,      0);
  const totalImpressions = data.reduce((s, r) => s + r.impressions, 0);
  const totalLeads       = data.reduce((s, r) => s + r.leads,       0);
  const avgCtr           = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const txCaptura        = totalClicks    > 0 ? (totalLeads    / totalClicks)    * 100 : 0;
  const txConversao      = totalLeads     > 0 ? (totalPurchases / totalLeads)    * 100
                         : totalClicks   > 0 ? (totalPurchases / totalClicks)   * 100 : 0;
  const cpaMedia         = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const roas             = totalSpend     > 0 ? totalRevenue / totalSpend        : 0;

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={22} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        <button onClick={() => void load()} className="ml-auto underline">Tentar novamente</button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
        Nenhum dado encontrado para este período.
      </div>
    );
  }

  // ── Template-driven values ────────────────────────────────────────────────────
  const tpl = template;
  const rawValues: Record<string, number> = {
    impressions:   totalImpressions,
    reach:         data.reduce((s, r) => s + r.reach, 0),
    clicks:        totalClicks,
    spend:         totalSpend,
    revenue:       totalRevenue,
    leads:         totalLeads,
    sales:         totalPurchases,
    tickets:       totalPurchases,   // imersão maps purchases → tickets
    // page_views / profile_visits / new_followers not returned by campaign-level API
    page_views:    0,
    profile_visits: 0,
    new_followers:  0,
  };
  const derived   = tpl.derive(rawValues);
  const kpiValues = { ...rawValues, ...derived };

  const KPI_ACCENT: Record<string, string> = {
    brand: "text-indigo-600 dark:text-indigo-400",
    sky:   "text-sky-600 dark:text-sky-400",
    green: "text-emerald-600 dark:text-emerald-400",
    rose:  "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
    slate: "text-slate-600 dark:text-slate-400",
  };

  return (
    <div className="space-y-4">

      {/* ── KPIs dirigidos pelo template ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tpl.kpis.map((kpi) => {
          const val = kpiValues[kpi.id] ?? 0;
          const display = val > 0 ? kpi.format(val) : "—";
          return (
            <article key={kpi.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</p>
              <p className={`mt-1 text-lg font-bold ${KPI_ACCENT[kpi.color] ?? ""}`}>{display}</p>
            </article>
          );
        })}
      </div>

      {/* ── Layout: funil + tabela lado a lado ──────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">

        {/* Funil dirigido pelo template */}
        <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Funil de vendas</h3>
          <div className="flex flex-col items-stretch gap-0">
            {tpl.funnel.map((stage, i) => {
              const val  = kpiValues[stage.id] ?? 0;
              const prev = i > 0 ? (kpiValues[tpl.funnel[i - 1].id] ?? 0) : null;
              const rate = prev !== null && prev > 0 ? val / prev : null;
              return (
                <div key={stage.id} className="flex flex-col items-center">
                  {i > 0 && rate !== null && stage.rateFromPrev && (
                    <div className="flex flex-col items-center py-1">
                      <div className="h-2 w-px bg-slate-300 dark:bg-slate-600" />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        {stage.rateFromPrev} {formatPercent(rate)}
                      </span>
                      <div className="h-2 w-px bg-slate-300 dark:bg-slate-600" />
                    </div>
                  )}
                  {i > 0 && (rate === null || !stage.rateFromPrev) && (
                    <div className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
                  )}
                  <div
                    className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 px-3 py-2.5 text-center"
                    style={{ background: stage.bg }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {stage.label}
                    </p>
                    <p className="mt-0.5 truncate text-base font-bold text-slate-900">
                      {formatCompact(val)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Tabela dirigida pelo template */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tpl.table.title}</h3>
            {loading && <Loader2 size={13} className="animate-spin text-slate-400" />}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                <tr>
                  {tpl.table.columns.map((col) => (
                    <th key={col.id} className={`px-3 py-2 font-semibold ${col.align === "right" ? "text-right" : ""}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-700 dark:text-slate-300">
                {data.map((r, i) => {
                  const rowValues: Record<string, number> = {
                    impressions: r.impressions, reach: r.reach, clicks: r.clicks,
                    spend: r.spend, revenue: r.revenue, leads: r.leads,
                    sales: r.purchases, tickets: r.purchases, cpa: r.cpa,
                    page_views: 0, profile_visits: 0, new_followers: 0,
                  };
                  const rowDerived = tpl.derive(rowValues);
                  const rowAll = { ...rowValues, ...rowDerived };
                  return (
                    <tr key={r.name} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${i === 0 ? "bg-blue-50/60 dark:bg-blue-900/10" : ""}`}>
                      {tpl.table.columns.map((col) => {
                        if (col.id === "name" || col.id === "campaign") {
                          return (
                            <td key={col.id} className="max-w-[280px] truncate px-3 py-2 font-medium" title={r.name}>
                              {r.name}
                            </td>
                          );
                        }
                        if (col.id === "adset") {
                          return <td key={col.id} className="px-3 py-2 text-slate-400">—</td>;
                        }
                        const v = rowAll[col.id] ?? 0;
                        const formatted = col.format ? (v > 0 ? col.format(v) : "—") : String(v);
                        return (
                          <td key={col.id} className={`whitespace-nowrap px-3 py-2 ${col.align === "right" ? "text-right tabular-nums" : ""}`}>
                            {formatted}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {/* ── Investimento por conjunto (chart) ───────────────────────────────── */}
      {data.length > 1 && (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Investimento por Conjunto de Anúncios</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} width={115}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 12 }}
                  formatter={(v) => [formatCurrency(Number(v)), "Investimento"]}
                />
                <Bar dataKey="spend" name="Investimento" fill="#2563eb" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      )}
    </div>
  );
}

// ─── Profile Detail View ──────────────────────────────────────────────────────

function ProfileDetailView({
  profile, groupLabel, onBack,
}: {
  profile: AdvertiserProfile;
  groupLabel: string;
  onBack: () => void;
}) {
  const { addCampaignToProfile, removeCampaignFromProfile } = useAdvertiserStore();
  const [activeCampId, setActiveCampId] = useState<string>(profile.campaigns[0]?.id ?? "");
  const [dateFrom, setDateFrom]         = useState(daysAgoStr(14));
  const [dateTo, setDateTo]             = useState(todayStr());
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addPanelAccountId, setAddPanelAccountId] = useState(profile.adAccountId);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const hasToken = Boolean(loadMetaCredentials().accessToken);

  // Template state — persisted per profile in localStorage
  const [templateId, setTemplateId] = useState<TemplateId>(() => {
    if (typeof window === "undefined") return "pos";
    try {
      const stored = JSON.parse(localStorage.getItem(TEMPLATE_LS_KEY) ?? "{}") as Record<string, TemplateId>;
      return stored[profile.id] ?? "pos";
    } catch { return "pos"; }
  });
  const [showTemplateModal, setShowTemplateModal] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = JSON.parse(localStorage.getItem(TEMPLATE_LS_KEY) ?? "{}") as Record<string, TemplateId>;
      return !stored[profile.id]; // show modal on first visit
    } catch { return true; }
  });
  const [showBuilder, setShowBuilder] = useState(false);

  const PERSONALIZADO_LS_KEY = "pta_personalizado_v1";
  const [personalizadoConfig, setPersonalizadoConfig] = useState<PersonalizadoConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_PERSONALIZADO_CONFIG;
    try {
      const stored = JSON.parse(localStorage.getItem(PERSONALIZADO_LS_KEY) ?? "{}") as Record<string, PersonalizadoConfig>;
      return stored[profile.id] ?? DEFAULT_PERSONALIZADO_CONFIG;
    } catch { return DEFAULT_PERSONALIZADO_CONFIG; }
  });

  const handlePersonalizadoChange = (cfg: PersonalizadoConfig) => {
    setPersonalizadoConfig(cfg);
    try {
      const stored = JSON.parse(localStorage.getItem(PERSONALIZADO_LS_KEY) ?? "{}") as Record<string, PersonalizadoConfig>;
      localStorage.setItem(PERSONALIZADO_LS_KEY, JSON.stringify({ ...stored, [profile.id]: cfg }));
    } catch {}
  };

  const handleTemplateChange = (id: TemplateId) => {
    setTemplateId(id);
    setShowTemplateModal(false);
    if (id === "personalizado") setShowBuilder(true);
    try {
      const stored = JSON.parse(localStorage.getItem(TEMPLATE_LS_KEY) ?? "{}") as Record<string, TemplateId>;
      localStorage.setItem(TEMPLATE_LS_KEY, JSON.stringify({ ...stored, [profile.id]: id }));
    } catch {}
  };

  // Resolved template — personalizado is built from config, others are static
  const resolvedTemplate = getTemplate(templateId, personalizadoConfig);

  // Keep activeCampId in sync when campaigns list changes
  useEffect(() => {
    if (!profile.campaigns.some((c) => c.id === activeCampId) && profile.campaigns.length > 0) {
      setActiveCampId(profile.campaigns[0].id);
    }
  }, [profile.campaigns, activeCampId]);

  const handleAddCampaign = (camp: ActiveCampaign) => {
    addCampaignToProfile(profile.id, camp);
    setActiveCampId(camp.id);
    setShowAddPanel(false);
  };

  const handleRemoveCampaign = (campId: string) => {
    if (confirmRemoveId === campId) {
      removeCampaignFromProfile(profile.id, campId);
      setConfirmRemoveId(null);
      if (activeCampId === campId) {
        const remaining = profile.campaigns.filter((c) => c.id !== campId);
        setActiveCampId(remaining[0]?.id ?? "");
      }
    } else {
      setConfirmRemoveId(campId);
      setTimeout(() => setConfirmRemoveId(null), 3000);
    }
  };

  const activeCampaign = profile.campaigns.find((c) => c.id === activeCampId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
              <ArrowLeft size={14} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{profile.name}</h2>
                {groupLabel && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand dark:bg-brand/20">{groupLabel}</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {profile.product}
                {" · "}<span className="font-mono">{profile.adAccountId}</span>
              </p>
            </div>
          </div>
          {/* Template selector + Date range */}
          <div className="flex flex-wrap items-center gap-2">
            <TemplateSelector
              current={templateId}
              onChange={handleTemplateChange}
              variant="dropdown"
              onOpenBuilder={() => setShowBuilder(true)}
            />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
            <span className="text-xs text-slate-400">até</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </div>
        </div>

        {/* Campaign tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          {profile.campaigns.map((camp) => (
            <div key={camp.id} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => setActiveCampId(camp.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
                  activeCampId === camp.id
                    ? "border-brand bg-brand text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${activeCampId === camp.id ? "bg-white/70" : "bg-emerald-500"}`} />
                {camp.name.length > 28 ? camp.name.slice(0, 28) + "…" : camp.name}
              </button>
              {/* Remove campaign button */}
              {confirmRemoveId === camp.id ? (
                <div className="absolute left-0 top-full z-10 mt-1 flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 shadow-lg dark:border-red-800 dark:bg-slate-800">
                  <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">Remover?</span>
                  <button type="button" onClick={() => handleRemoveCampaign(camp.id)}
                    className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700">
                    Sim
                  </button>
                  <button type="button" onClick={() => setConfirmRemoveId(null)}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemoveCampaign(camp.id)}
                  title="Remover campanha"
                  className="ml-0.5 hidden h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-500 group-hover:flex dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}

          {/* Add campaign — styled as a proper tab */}
          <button
            type="button"
            onClick={() => setShowAddPanel(!showAddPanel)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
              showAddPanel
                ? "border-brand bg-brand text-white"
                : "border-dashed border-slate-300 bg-white text-slate-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-500 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
            }`}
          >
            <Plus size={11} /> Adicionar campanha
          </button>
        </div>

        {/* Add campaign panel */}
        {showAddPanel && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-800 dark:bg-blue-900/10">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Adicionar campanha ao perfil
              </p>
              <button type="button" onClick={() => { setShowAddPanel(false); setAddPanelAccountId(profile.adAccountId); }}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500">
                <X size={13} />
              </button>
            </div>
            {!hasToken ? (
              <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                <Key size={11} /> Configure o Access Token em Importar dados → Meta Ads.
              </p>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">Ad Account ID</p>
                  <input
                    type="text"
                    value={addPanelAccountId}
                    onChange={(e) => setAddPanelAccountId(e.target.value)}
                    placeholder="act_524658353530105"
                    className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                  {addPanelAccountId !== profile.adAccountId && (
                    <button
                      type="button"
                      onClick={() => setAddPanelAccountId(profile.adAccountId)}
                      className="mt-1 text-[10px] text-slate-400 underline hover:text-slate-600 dark:text-slate-500"
                    >
                      ↺ Usar conta do perfil ({profile.adAccountId})
                    </button>
                  )}
                </div>
                <CampaignFetcher
                  adAccountId={addPanelAccountId}
                  onSelect={handleAddCampaign}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* No token warning */}
      {!hasToken && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-10 text-center dark:border-amber-800 dark:bg-amber-900/20">
          <Key size={22} className="text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Token não configurado</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Configure em Importar dados → Meta Ads API</p>
          </div>
        </div>
      )}

      {/* No campaigns state */}
      {hasToken && profile.campaigns.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <RefreshCw size={22} className="text-slate-300 dark:text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhuma campanha adicionada</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Clique em <strong>+ Adicionar campanha</strong> acima para começar
            </p>
          </div>
        </div>
      )}

      {/* Template selector modal — shown on first visit to this profile */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              Qual tipo de campanha é essa?
            </h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              Escolha o template para ver os KPIs e funil corretos para este perfil.
            </p>
            <TemplateSelector
              current={templateId}
              onChange={handleTemplateChange}
              variant="modal"
              onOpenBuilder={() => setShowBuilder(true)}
            />
            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Você pode trocar o template a qualquer momento no header do perfil.
            </p>
          </div>
        </div>
      )}

      {/* Personalizado builder modal */}
      {showBuilder && (
        <PersonalizadoBuilder
          config={personalizadoConfig}
          onChange={handlePersonalizadoChange}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {/* Per-campaign analysis */}
      {hasToken && activeCampaign && (
        <CampaignAnalysisPanel
          key={`${activeCampaign.id}-${dateFrom}-${dateTo}-${templateId}-${JSON.stringify(personalizadoConfig)}`}
          adAccountId={profile.adAccountId}
          campaign={activeCampaign}
          dateFrom={dateFrom}
          dateTo={dateTo}
          template={resolvedTemplate}
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileAnalysis({ campaignGroupOptions, campaignConfigs }: ProfileAnalysisProps) {
  const { profiles, addProfile, updateProfile, deleteProfile } = useAdvertiserStore();
  const [view, setView]               = useState<"list" | "form" | "detail">("list");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedProfile = profiles.find((p) => p.id === selectedId);
  const editingProfile  = profiles.find((p) => p.id === editingId);

  function groupLabel(groupId: string) {
    return campaignGroupOptions.find((g) => g.id === groupId)?.label ?? groupId;
  }

  const handleSave = (data: ProfileFormData) => {
    if (editingId) {
      updateProfile(editingId, {
        name: data.name, product: data.product,
        adAccountId: data.adAccountId, groupId: data.groupId,
        campaigns: data.campaigns,
      });
    } else {
      addProfile({
        name: data.name, product: data.product,
        adAccountId: data.adAccountId, groupId: data.groupId,
        campaigns: data.campaigns,
      });
    }
    setView("list"); setEditingId(null);
  };

  const handleEdit = (id: string) => { setEditingId(id); setView("form"); };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteProfile(id);
      setConfirmDeleteId(null);
      if (selectedId === id) { setSelectedId(null); setView("list"); }
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  // ── Form view ────────────────────────────────────────────────────────────────
  if (view === "form") {
    const editingForm: ProfileFormData | undefined = editingProfile
      ? {
          name: editingProfile.name,
          product: editingProfile.product,
          adAccountId: editingProfile.adAccountId,
          groupId: editingProfile.groupId,
          campaigns: editingProfile.campaigns,
        }
      : undefined;

    return (
      <div className="mx-auto max-w-lg py-4">
        <ProfileForm
          initial={editingForm}
          groupOptions={campaignGroupOptions}
          campaignConfigs={campaignConfigs}
          onSave={handleSave}
          onCancel={() => { setView("list"); setEditingId(null); }}
        />
      </div>
    );
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (view === "detail" && selectedProfile) {
    return (
      <ProfileDetailView
        key={selectedProfile.id}
        profile={selectedProfile}
        groupLabel={groupLabel(selectedProfile.groupId)}
        onBack={() => { setView("list"); setSelectedId(null); }}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  const sectionKeys = Object.keys(SECTION_META) as (keyof typeof SECTION_META)[];
  const profilesBySection = sectionKeys.map((sec) => ({
    sec,
    meta: SECTION_META[sec],
    items: profiles.filter((p) => {
      const grp = campaignGroupOptions.find((g) => g.id === p.groupId);
      return grp?.section === sec;
    }),
  })).filter((s) => s.items.length > 0);

  const ungrouped = profiles.filter((p) => {
    const grp = campaignGroupOptions.find((g) => g.id === p.groupId);
    return !grp;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Perfis de Anunciantes</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Configure e gerencie os perfis dos seus anunciantes
          </p>
        </div>
        <button type="button" onClick={() => { setEditingId(null); setView("form"); }}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-semibold text-white transition hover:bg-brand-hover">
          <Plus size={13} /> Novo Perfil
        </button>
      </div>

      {/* Empty state */}
      {profiles.length === 0 && (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
            <Users size={26} className="text-slate-300 dark:text-slate-500" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">Nenhum perfil configurado</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Crie um perfil para cada anunciante e acompanhe a performance individualmente
            </p>
          </div>
          <button type="button" onClick={() => { setEditingId(null); setView("form"); }}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover">
            <Plus size={15} /> Criar primeiro perfil
          </button>
        </div>
      )}

      {/* Profiles grouped by section */}
      {profilesBySection.map(({ sec, meta, items }) => {
        const SectionIcon = meta.icon;
        return (
          <section key={sec}>
            <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${meta.bg} ${meta.border}`}>
              <SectionIcon size={14} className={meta.color} />
              <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
              <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">
                {items.length} perfil{items.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((profile) => (
                <div key={profile.id} className="relative">
                  <ProfileCard
                    profile={profile}
                    groupLabel={groupLabel(profile.groupId)}
                    onSelect={() => { setSelectedId(profile.id); setView("detail"); }}
                    onEdit={() => handleEdit(profile.id)}
                    onDelete={() => handleDelete(profile.id)}
                  />
                  {confirmDeleteId === profile.id && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-red-50/95 dark:bg-slate-800/95">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">Confirmar exclusão?</p>
                      <button type="button" onClick={() => handleDelete(profile.id)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700">
                        Excluir
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Ungrouped profiles */}
      {ungrouped.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Sem grupo</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ungrouped.map((profile) => (
              <div key={profile.id} className="relative">
                <ProfileCard
                  profile={profile}
                  groupLabel=""
                  onSelect={() => { setSelectedId(profile.id); setView("detail"); }}
                  onEdit={() => handleEdit(profile.id)}
                  onDelete={() => handleDelete(profile.id)}
                />
                {confirmDeleteId === profile.id && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-red-50/95 dark:bg-slate-800/95">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">Confirmar exclusão?</p>
                    <button type="button" onClick={() => handleDelete(profile.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700">
                      Excluir
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
