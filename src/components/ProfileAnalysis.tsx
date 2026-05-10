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
  fetchMetaCampaigns, fetchMetaInsights, fetchMetaAdAccounts,
  loadMetaCredentials, MetaInsight, MetaAdAccount,
} from "@/utils/metaApi";
import { formatBRL, formatCompact, formatInt, formatPercent, safeNumber } from "@/lib/format";
import { getTemplate, TEMPLATE_LIST, DEFAULT_PERSONALIZADO_CONFIG } from "@/lib/templates";
import { TabLanding } from "@/components/TabLanding";
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

// ─── Add Campaign Panel ───────────────────────────────────────────────────────
// Full panel: account picker → campaign list → multi-add without closing

function AddCampaignPanel({
  defaultAccountId,
  alreadyAddedIds,
  onAdd,
  onClose,
}: {
  defaultAccountId: string;
  alreadyAddedIds: Set<string>;
  onAdd: (campaign: ActiveCampaign) => void;
  onClose?: () => void;
}) {
  const token = loadMetaCredentials().accessToken;
  const hasToken = Boolean(token);

  // ── Account picker state ──
  const [accountId, setAccountId]           = useState(defaultAccountId);
  const [accounts, setAccounts]             = useState<MetaAdAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError]   = useState<string | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // ── Campaign list state ──
  const [campaigns, setCampaigns]           = useState<{ id: string; name: string; status: string }[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [addedThisSession, setAddedThisSession] = useState<Set<string>>(new Set());

  const fetchAccounts = async () => {
    setAccountsLoading(true); setAccountsError(null);
    try {
      const list = await fetchMetaAdAccounts(token);
      setAccounts(list);
      setShowAccountPicker(true);
    } catch (e) {
      setAccountsError(e instanceof Error ? e.message : "Erro ao buscar contas.");
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchCampaigns = async (id = accountId) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    setCampaignsLoading(true); setCampaignsError(null); setCampaigns([]);
    try {
      const list = await fetchMetaCampaigns(trimmed, token);
      setCampaigns(list);
    } catch (e) {
      setCampaignsError(e instanceof Error ? e.message : "Erro ao buscar campanhas.");
    } finally {
      setCampaignsLoading(false);
    }
  };

  const handleSelectAccount = (acc: MetaAdAccount) => {
    setAccountId(acc.id);
    setShowAccountPicker(false);
    void fetchCampaigns(acc.id);
  };

  const handleAdd = (camp: { id: string; name: string }) => {
    onAdd({ id: camp.id, name: camp.name });
    setAddedThisSession((prev) => new Set([...prev, camp.id]));
  };

  const inputCls = "h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200";

  if (!hasToken) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
        <Key size={11} /> Configure o Access Token em <strong>Importar dados → Meta Ads</strong>.
      </p>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Account ID row ── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Ad Account
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={accountId}
            onChange={(e) => { setAccountId(e.target.value); setCampaigns([]); setCampaignsError(null); }}
            placeholder="act_524658353530105"
            className={inputCls}
          />
          {/* Buscar minhas contas */}
          <button
            type="button"
            onClick={() => void fetchAccounts()}
            disabled={accountsLoading}
            title="Listar todas as contas disponíveis para este token"
            className="flex flex-shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:border-blue-500"
          >
            {accountsLoading ? <Loader2 size={10} className="animate-spin" /> : <Users size={10} />}
            {accountsLoading ? "Buscando…" : "Ver contas"}
          </button>
          {/* Buscar campanhas */}
          <button
            type="button"
            onClick={() => void fetchCampaigns()}
            disabled={!accountId.trim() || campaignsLoading}
            title="Buscar campanhas desta conta"
            className="flex flex-shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
          >
            {campaignsLoading ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
            {campaignsLoading ? "Buscando…" : "Campanhas"}
          </button>
        </div>

        {/* Account error */}
        {accountsError && (
          <p className="text-[10px] text-red-500 dark:text-red-400">{accountsError}</p>
        )}

        {/* Account picker dropdown */}
        {showAccountPicker && accounts.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 dark:border-slate-700">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {accounts.length} conta{accounts.length > 1 ? "s" : ""} disponível{accounts.length > 1 ? "eis" : ""}
              </p>
              <button type="button" onClick={() => setShowAccountPicker(false)} className="text-slate-400 hover:text-slate-600">
                <X size={11} />
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleSelectAccount(acc)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${acc.account_status === 1 ? "bg-emerald-500" : "bg-slate-400"}`} />
                  <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                  <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">{acc.id}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Campaigns list ── */}
      {campaignsError && (
        <div className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{campaignsError}</span>
          <button type="button" onClick={() => void fetchCampaigns()} className="text-[10px] underline">Tentar novamente</button>
        </div>
      )}

      {!campaignsLoading && campaigns.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Campanhas — clique para adicionar
          </p>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800">
            {campaigns.map((c) => {
              const alreadyAdded = alreadyAddedIds.has(c.id);
              const justAdded    = addedThisSession.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => !alreadyAdded && !justAdded && handleAdd(c)}
                  disabled={alreadyAdded || justAdded}
                  className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-[11px] last:border-b-0 transition dark:border-slate-700 ${
                    alreadyAdded || justAdded
                      ? "cursor-default opacity-60"
                      : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${c.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300" title={c.name}>{c.name}</span>
                  {(alreadyAdded || justAdded) ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle2 size={8} /> Adicionada
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      + Adicionar
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {addedThisSession.size > 0 && (
            <p className="mt-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
              ✓ {addedThisSession.size} campanha{addedThisSession.size > 1 ? "s adicionadas" : " adicionada"} — feche o painel quando terminar
            </p>
          )}
        </div>
      )}

      {!campaignsLoading && campaigns.length === 0 && !campaignsError && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Digite ou selecione um Ad Account e clique em <strong>Campanhas</strong> para listar.
        </p>
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
    <div
      className="rounded-xl border p-5 shadow-sm sm:p-6"
      style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
    >
      <h3 className="mb-5 text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>
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

        {/* Campaign picker — shown once Ad Account is filled */}
        {form.adAccountId.trim() && (
          <div className="space-y-2">
            {form.campaigns.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Campanhas selecionadas
                </p>
                {form.campaigns.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                    <CheckCircle2 size={11} className="flex-shrink-0 text-emerald-500" />
                    <span className="flex-1 truncate text-[11px] font-medium text-emerald-800 dark:text-emerald-300" title={c.name}>{c.name}</span>
                    <button type="button" onClick={() => handleRemoveCampaign(c.id)}
                      className="text-emerald-400 transition hover:text-red-500 dark:text-emerald-600">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-600 dark:bg-slate-700/30">
              <AddCampaignPanel
                key={form.adAccountId}
                defaultAccountId={form.adAccountId}
                alreadyAddedIds={new Set(form.campaigns.map((c) => c.id))}
                onAdd={handleSelectCampaign}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-3">
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
      className="group relative cursor-pointer rounded-xl border shadow-sm transition-all hover:shadow-md"
      style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${avatarCls}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>{profile.name}</p>
            <p className="mt-0.5 truncate text-xs" style={{ color: "var(--dm-text-secondary)" }}>{profile.product}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {groupLabel && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: "var(--dm-brand-50)", color: "var(--dm-brand-500)" }}
            >
              {groupLabel}
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[10px]"
            style={{ backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-tertiary)" }}
          >
            {profile.adAccountId}
          </span>
        </div>

        {/* Campaign badges */}
        {profile.campaigns.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {profile.campaigns.slice(0, 2).map((c) => (
              <span key={c.id} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                {c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name}
              </span>
            ))}
            {profile.campaigns.length > 2 && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-tertiary)" }}
              >
                +{profile.campaigns.length - 2}
              </span>
            )}
          </div>
        )}

        {profile.campaigns.length === 0 && (
          <p className="mt-2 text-[10px] italic" style={{ color: "var(--dm-text-tertiary)" }}>Sem campanhas configuradas</p>
        )}

        <p className="mt-2 text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>Clique para ver a análise →</p>
      </div>

      {/* Action buttons — shown on hover */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex h-6 w-6 items-center justify-center rounded-md border transition"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-tertiary)" }}
        >
          <Edit2 size={11} />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-6 w-6 items-center justify-center rounded-md border transition hover:border-red-300 hover:text-red-500"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-tertiary)" }}
        >
          <Trash2 size={11} />
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
      <div
        className="rounded-xl border p-8 text-center text-xs"
        style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)", color: "var(--dm-text-tertiary)" }}
      >
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
    brand: "text-brand",
    sky:   "text-sky-500",
    green: "text-emerald-500",
    rose:  "text-rose-500",
    amber: "text-amber-500",
    slate: "text-slate-500",
  };

  return (
    <div className="space-y-4">

      {/* ── KPIs dirigidos pelo template ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tpl.kpis.map((kpi) => {
          const val = kpiValues[kpi.id] ?? 0;
          const display = val > 0 ? kpi.format(val) : "—";
          return (
            <article
              key={kpi.id}
              className="flex flex-col rounded-xl border p-4 shadow-sm"
              style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-text-tertiary)" }}>
                {kpi.label}
              </p>
              <p className={`mt-1.5 text-xl font-bold tabular-nums tracking-tight ${KPI_ACCENT[kpi.color] ?? ""}`}>
                {display}
              </p>
            </article>
          );
        })}
      </div>

      {/* ── Layout: funil + tabela lado a lado ──────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">

        {/* Funil dirigido pelo template */}
        <article
          className="min-w-0 overflow-hidden rounded-xl border shadow-sm"
          style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--dm-border-subtle)" }}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-text-tertiary)" }}>
              Funil de Vendas
            </h3>
            <Zap size={13} style={{ color: "var(--dm-brand-500)", opacity: 0.6 }} />
          </div>
          <div className="flex flex-col items-stretch gap-0 p-4">
            {tpl.funnel.map((stage, i) => {
              const val  = kpiValues[stage.id] ?? 0;
              const prev = i > 0 ? (kpiValues[tpl.funnel[i - 1].id] ?? 0) : null;
              const rate = prev !== null && prev > 0 ? val / prev : null;
              return (
                <div key={stage.id} className="flex flex-col items-center">
                  {i > 0 && rate !== null && stage.rateFromPrev && (
                    <div className="flex flex-col items-center py-1">
                      <div className="h-3 w-px" style={{ backgroundColor: "var(--dm-border-subtle)" }} />
                      <span
                        className="z-10 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                        style={{ borderColor: "var(--dm-border-subtle)", backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-brand-500)" }}
                      >
                        {stage.rateFromPrev} {formatPercent(rate)}
                      </span>
                      <div className="h-3 w-px" style={{ backgroundColor: "var(--dm-border-subtle)" }} />
                    </div>
                  )}
                  {i > 0 && (rate === null || !stage.rateFromPrev) && (
                    <div className="h-3 w-px" style={{ backgroundColor: "var(--dm-border-subtle)" }} />
                  )}
                  <div
                    className="w-full min-w-0 overflow-hidden rounded-lg px-3 py-3 text-center"
                    style={{ background: stage.bg }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                      {stage.label}
                    </p>
                    <p className="mt-1 truncate text-base font-bold text-slate-900">
                      {formatNumber(val)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Tabela dirigida pelo template */}
        <article
          className="overflow-hidden rounded-xl border shadow-sm"
          style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
        >
          <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--dm-border-subtle)" }}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-text-tertiary)" }}>
              {tpl.table.title}
            </h3>
            {loading && <Loader2 size={13} className="animate-spin" style={{ color: "var(--dm-text-tertiary)" }} />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr style={{ backgroundColor: "var(--dm-bg-elevated)" }}>
                  {tpl.table.columns.map((col) => (
                    <th
                      key={col.id}
                      className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider ${col.align === "right" ? "text-right" : ""}`}
                      style={{ color: "var(--dm-text-tertiary)" }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ borderColor: "var(--dm-border-subtle)" }} className="divide-y">
                {data.map((r) => {
                  const rowValues: Record<string, number> = {
                    impressions: r.impressions, reach: r.reach, clicks: r.clicks,
                    spend: r.spend, revenue: r.revenue, leads: r.leads,
                    sales: r.purchases, tickets: r.purchases, cpa: r.cpa,
                    page_views: 0, profile_visits: 0, new_followers: 0,
                  };
                  const rowDerived = tpl.derive(rowValues);
                  const rowAll = { ...rowValues, ...rowDerived };
                  return (
                    <tr key={r.name} className="transition-colors" style={{ borderColor: "var(--dm-border-subtle)" }}>
                      {tpl.table.columns.map((col) => {
                        if (col.id === "name" || col.id === "campaign") {
                          return (
                            <td
                              key={col.id}
                              className="max-w-[280px] truncate px-4 py-2.5 text-xs font-semibold"
                              style={{ color: "var(--dm-text-primary)" }}
                              title={r.name}
                            >
                              {r.name}
                            </td>
                          );
                        }
                        if (col.id === "adset") {
                          return <td key={col.id} className="px-4 py-2.5 text-xs" style={{ color: "var(--dm-text-tertiary)" }}>—</td>;
                        }
                        const v = rowAll[col.id] ?? 0;
                        const formatted = col.format ? (v > 0 ? col.format(v) : "—") : String(v);
                        return (
                          <td
                            key={col.id}
                            className={`whitespace-nowrap px-4 py-2.5 text-xs tabular-nums ${col.align === "right" ? "text-right" : ""}`}
                            style={{ color: "var(--dm-text-secondary)" }}
                          >
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
        <article
          className="rounded-xl border p-5 shadow-sm"
          style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
        >
          <h3 className="mb-4 text-xs font-semibold" style={{ color: "var(--dm-text-primary)" }}>
            Investimento por Conjunto de Anúncios
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dm-border-subtle)" horizontal={false} />
                <XAxis type="number" stroke="var(--dm-border-default)" tick={{ fontSize: 10, fill: "var(--dm-text-tertiary)" }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="var(--dm-border-default)" tick={{ fontSize: 10, fill: "var(--dm-text-tertiary)" }} width={115}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--dm-border-default)", background: "var(--dm-bg-elevated)", color: "var(--dm-text-primary)", fontSize: 12 }}
                  formatter={(v) => [formatCurrency(Number(v)), "Investimento"]}
                />
                <Bar dataKey="spend" name="Investimento" fill="var(--dm-brand-500)" radius={[0, 4, 4, 0]} />
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
    // Panel stays open so user can add more campaigns
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
    <div className="space-y-4">
      {/* Header */}
      <div
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition"
              style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-secondary)" }}
            >
              <ArrowLeft size={15} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold" style={{ color: "var(--dm-text-primary)" }}>
                  {profile.name}
                </h2>
                {groupLabel && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: "var(--dm-brand-50)", color: "var(--dm-brand-500)" }}
                  >
                    {groupLabel}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs" style={{ color: "var(--dm-text-secondary)" }}>
                {profile.product}
                <span className="mx-1.5 opacity-30">·</span>
                <span className="font-mono text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>{profile.adAccountId}</span>
              </p>
            </div>
          </div>

          {/* Template selector + Date range */}
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <TemplateSelector
              current={templateId}
              onChange={handleTemplateChange}
              variant="dropdown"
              onOpenBuilder={() => setShowBuilder(true)}
            />
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
              style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}
            >
              <CalendarDays size={13} style={{ color: "var(--dm-text-tertiary)" }} />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none" style={{ color: "var(--dm-text-primary)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-text-tertiary)" }}>até</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none" style={{ color: "var(--dm-text-primary)" }} />
            </div>
          </div>
        </div>

        {/* Campaign tabs */}
        <div
          className="flex flex-wrap items-center gap-2 border-t px-5 py-3"
          style={{ borderColor: "var(--dm-border-subtle)" }}
        >
          {profile.campaigns.map((camp) => (
            <div key={camp.id} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => setActiveCampId(camp.id)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all"
                style={
                  activeCampId === camp.id
                    ? { backgroundColor: "var(--dm-brand-500)", borderColor: "var(--dm-brand-500)", color: "#fff" }
                    : { backgroundColor: "var(--dm-bg-elevated)", borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }
                }
              >
                <span className={`h-1.5 w-1.5 rounded-full ${activeCampId === camp.id ? "bg-white" : "bg-emerald-500"}`} />
                {camp.name.length > 36 ? camp.name.slice(0, 36) + "…" : camp.name}
              </button>
              {/* Remove campaign button */}
              {confirmRemoveId === camp.id ? (
                <div
                  className="absolute left-0 top-full z-10 mt-1.5 flex items-center gap-1.5 rounded-lg border p-2 shadow-xl"
                  style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)" }}
                >
                  <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-red-600">Remover?</span>
                  <button type="button" onClick={() => handleRemoveCampaign(camp.id)}
                    className="rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-red-700 transition-colors">
                    Sim
                  </button>
                  <button type="button" onClick={() => setConfirmRemoveId(null)}
                    className="rounded-md border px-2.5 py-1 text-[10px] font-semibold transition"
                    style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)", backgroundColor: "var(--dm-bg-elevated)" }}
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemoveCampaign(camp.id)}
                  className="ml-1 hidden h-5 w-5 items-center justify-center rounded text-red-400 transition hover:bg-red-50 group-hover:flex dark:hover:bg-red-900/30"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}

          {/* Add campaign */}
          <button
            type="button"
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all"
            style={
              showAddPanel
                ? { backgroundColor: "var(--dm-brand-500)", borderColor: "var(--dm-brand-500)", color: "#fff" }
                : { borderStyle: "dashed", borderColor: "var(--dm-border-default)", color: "var(--dm-text-tertiary)", backgroundColor: "transparent" }
            }
          >
            <Plus size={13} /> Adicionar Campanha
          </button>
        </div>

        {/* Add campaign panel */}
        {showAddPanel && (
          <div
            className="border-t px-5 py-4"
            style={{ borderColor: "var(--dm-border-subtle)", backgroundColor: "var(--dm-bg-elevated)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-text-tertiary)" }}>
                Vincular Nova Campanha ao Perfil
              </p>
              <button type="button" onClick={() => setShowAddPanel(false)}
                className="rounded-md p-1 transition" style={{ color: "var(--dm-text-tertiary)" }}>
                <X size={14} />
              </button>
            </div>
            <AddCampaignPanel
              key={profile.id}
              defaultAccountId={profile.adAccountId}
              alreadyAddedIds={new Set(profile.campaigns.map((c) => c.id))}
              onAdd={handleAddCampaign}
              onClose={() => setShowAddPanel(false)}
            />
          </div>
        )}
      </div>

      {/* No token warning */}
      {!hasToken && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)" }}
        >
          <Key size={20} className="text-amber-500" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>Token não configurado</p>
            <p className="mt-1 text-xs" style={{ color: "var(--dm-text-secondary)" }}>Configure em Importar dados → Meta Ads API</p>
          </div>
        </div>
      )}

      {/* No campaigns state */}
      {hasToken && profile.campaigns.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)" }}
        >
          <RefreshCw size={20} style={{ color: "var(--dm-text-tertiary)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>Nenhuma campanha adicionada</p>
            <p className="mt-1 text-xs" style={{ color: "var(--dm-text-secondary)" }}>
              Clique em <strong>+ Adicionar Campanha</strong> acima para começar
            </p>
          </div>
        </div>
      )}

      {/* Template selector modal — shown on first visit to this profile */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-3xl rounded-xl border p-6 shadow-2xl"
            style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
          >
            <h2 className="mb-1 text-base font-semibold" style={{ color: "var(--dm-text-primary)" }}>
              Qual tipo de campanha é essa?
            </h2>
            <p className="mb-5 text-xs" style={{ color: "var(--dm-text-secondary)" }}>
              Escolha o template para ver os KPIs e funil corretos para este perfil.
            </p>
            <TemplateSelector
              current={templateId}
              onChange={handleTemplateChange}
              variant="modal"
              onOpenBuilder={() => setShowBuilder(true)}
            />
            <p className="mt-4 text-center text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--dm-text-primary)" }}>Perfis de Anunciantes</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--dm-text-secondary)" }}>
            Configure e gerencie os perfis dos seus anunciantes
          </p>
        </div>
        <button type="button" onClick={() => { setEditingId(null); setView("form"); }}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition"
          style={{ backgroundColor: "var(--dm-brand-500)" }}
        >
          <Plus size={13} /> Novo Perfil
        </button>
      </div>

      {/* Empty state */}
      {profiles.length === 0 && (
        <TabLanding
          icon={Users}
          title="Perfil de Anúncio"
          subtitle="Crie templates com as configurações ideais para cada anunciante. Use-os como referência ao criar novos anúncios e compare resultados entre perfis."
          features={[
            { icon: Users,        label: "Templates de Público",    description: "Salve segmentações, objetivos e configurações de cada tipo de campanha." },
            { icon: Zap,          label: "Benchmarks por Perfil",   description: "Compare performance entre anunciantes e identifique os padrões vencedores." },
            { icon: CheckCircle2, label: "Reutilize o que Funciona", description: "Replique configurações validadas para novos lançamentos com agilidade." },
          ]}
          steps={[
            { label: "Crie um perfil",         description: "Defina nome, tipo de produto e configurações do anunciante." },
            { label: "Conecte ao Meta Ads",     description: "Vincule o Access Token para buscar dados reais da conta." },
            { label: "Analise e compare",       description: "Veja métricas de cada perfil e compare lado a lado." },
          ]}
          cta={{ label: "Criar primeiro perfil", onClick: () => { setEditingId(null); setView("form"); } }}
        />
      )}

      {/* Profiles grouped by section */}
      {profilesBySection.map(({ sec, meta, items }) => {
        const SectionIcon = meta.icon;
        return (
          <section key={sec}>
            <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--dm-border-subtle)" }}>
              <SectionIcon size={13} className={meta.color} />
              <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
              <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--dm-text-tertiary)" }}>
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
