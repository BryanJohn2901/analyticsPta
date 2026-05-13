"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  X, Settings2, ChevronDown, ChevronUp, Plus, Trash2, Loader2,
  Zap, User, Activity, CheckCircle2, XCircle, Link2, Eye, EyeOff,
  RefreshCw, Save, RotateCcw, Sun, Moon, Database,
} from "lucide-react";
import { classifyCampaign } from "@/utils/campaignClassifier";
import type { UserCategory, UserAccountEntry } from "@/types/userConfig";
import { FIXED_CATEGORIES, MAX_CUSTOM_CATEGORIES } from "@/types/userConfig";
import {
  upsertUserCategory, deleteUserCategory,
  upsertUserAccountEntry, deleteUserAccountEntry,
} from "@/utils/supabaseCategories";
import { fetchMetaCampaigns, loadMetaCredentials, saveMetaCredentials } from "@/utils/metaApi";
import type { MetaSyncResult } from "@/utils/supabaseCampaigns";

// ─── Types ────────────────────────────────────────────────────────────────────

type CPTab = "accounts" | "integrations" | "sync" | "profile";

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  categories: UserCategory[];
  accountEntries: UserAccountEntry[];
  onCategoriesChange: (cats: UserCategory[]) => void;
  onEntriesChange:    (entries: UserAccountEntry[]) => void;
  onUpdateProfile:    (name: string) => Promise<void>;
  onSignOut:          () => Promise<void>;
  // Sync tab
  syncStatus?:   { syncing: boolean; result?: MetaSyncResult; error?: string };
  campaignCount?: number;
  dataSource?:   { type: string; label: string } | null;
  onRefresh?:    () => Promise<void>;
  onClearData?:  () => Promise<void>;
  // Campaign name suggestions for AddEntryForm
  campaignSuggestions?: string[];
}

// ─── AddEntryForm ─────────────────────────────────────────────────────────────

interface AddEntryFormProps {
  categoryId: string;
  onSaved: (entry: UserAccountEntry) => void;
  onCancel: () => void;
  suggestions?: string[];
}

function AddEntryForm({ categoryId, onSaved, onCancel, suggestions = [] }: AddEntryFormProps) {
  const [label,       setLabel]       = useState("");
  const [accountId,   setAccountId]   = useState("");
  const [verifyState, setVerifyState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errMsg,      setErrMsg]      = useState("");
  const [campaigns,   setCampaigns]   = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [selected,    setSelected]    = useState<string[]>([]);
  const [saving,      setSaving]      = useState(false);

  const handleVerify = async () => {
    const id = accountId.trim();
    if (!id) return;
    const { accessToken } = loadMetaCredentials();
    if (!accessToken) { setErrMsg("Token de acesso não configurado. Configure em Integrações."); setVerifyState("error"); return; }
    setVerifyState("loading");
    setErrMsg("");
    try {
      const camps = await fetchMetaCampaigns(id, accessToken);
      setCampaigns(camps);
      setSelected(camps.map(c => c.id));
      setVerifyState("ok");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Falha ao verificar conta.");
      setVerifyState("error");
    }
  };

  const handleSave = async () => {
    if (!label.trim() || !accountId.trim()) return;
    setSaving(true);
    try {
      const entry = await upsertUserAccountEntry({
        categoryId,
        label:               label.trim(),
        adAccountId:         accountId.trim(),
        campaigns,
        selectedCampaignIds: selected.length < campaigns.length ? selected : [],
      });
      onSaved(entry);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = () => setSelected(s => s.length === campaigns.length ? [] : campaigns.map(c => c.id));
  const toggleOne = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <div className="mt-2 rounded-xl border p-3 space-y-3"
      style={{ borderColor: "var(--dm-brand-300)", backgroundColor: "var(--dm-bg-elevated)" }}
    >
      {/* Label */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          Nome da conta
        </label>
        {suggestions.length > 0 && (
          <datalist id="cp-entry-suggestions">
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        )}
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Ex: Biomecânica, André Seguidor…"
          list={suggestions.length > 0 ? "cp-entry-suggestions" : undefined}
          className="h-8 w-full rounded-lg border px-3 text-xs outline-none transition focus:ring-1"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)",
            color: "var(--dm-text-primary)" }}
        />
      </div>

      {/* Ad Account ID */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          Ad Account ID
        </label>
        <div className="flex gap-2">
          <input
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            placeholder="act_123456789"
            className="h-8 flex-1 rounded-lg border px-3 text-xs outline-none transition focus:ring-1"
            style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)",
              color: "var(--dm-text-primary)" }}
          />
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={!accountId.trim() || verifyState === "loading"}
            className="flex h-8 flex-shrink-0 items-center gap-1 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-50"
            style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)",
              color: "var(--dm-text-secondary)" }}
          >
            {verifyState === "loading"
              ? <Loader2 size={11} className="animate-spin" />
              : <Activity size={11} />}
            Verificar
          </button>
        </div>
        {verifyState === "error" && (
          <p className="mt-1 text-[10px] text-red-500">{errMsg}</p>
        )}
      </div>

      {/* Campaign picker (only after successful verify) */}
      {verifyState === "ok" && campaigns.length > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
              Campanhas ({selected.length}/{campaigns.length})
            </span>
            <button type="button" onClick={toggleAll}
              className="text-[10px] font-semibold" style={{ color: "var(--dm-brand-500)" }}>
              {selected.length === campaigns.length ? "Desmarcar todas" : "Marcar todas"}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-lg border p-1.5 space-y-0.5"
            style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)" }}>
            {campaigns.map(c => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition hover:bg-slate-100/50 dark:hover:bg-slate-700/50">
                <input type="checkbox" checked={selected.includes(c.id)}
                  onChange={() => toggleOne(c.id)}
                  className="h-3 w-3 flex-shrink-0 rounded accent-blue-600" />
                <span className="flex-1 truncate text-[11px]" style={{ color: "var(--dm-text-primary)" }}
                  title={c.name}>{c.name}</span>
                <span className={`flex-shrink-0 text-[9px] font-bold ${c.status === "ACTIVE" ? "text-emerald-500" : "text-amber-400"}`}>
                  {c.status === "ACTIVE" ? "●" : "◐"}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex h-8 flex-1 items-center justify-center rounded-lg border text-xs font-semibold transition"
          style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }}>
          Cancelar
        </button>
        <button type="button" onClick={() => void handleSave()}
          disabled={!label.trim() || !accountId.trim() || saving}
          className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-bold text-white transition disabled:opacity-50"
          style={{ backgroundColor: "var(--dm-brand-500)" }}>
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          Salvar
        </button>
      </div>
    </div>
  );
}

// ─── EntryRow ─────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: UserAccountEntry;
  onDeleted: (id: string) => void;
  onToggled: (entry: UserAccountEntry) => void;
}

function EntryRow({ entry, onDeleted, onToggled }: EntryRowProps) {
  const [deleting,  setDeleting]  = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [toggling,  setToggling]  = useState(false);
  const campCount = entry.campaigns.length;
  const selCount  = entry.selectedCampaignIds.length || campCount;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteUserAccountEntry(entry.id);
      onDeleted(entry.id);
    } catch { setDeleting(false); }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const updated = await upsertUserAccountEntry({
        id: entry.id, categoryId: entry.categoryId, label: entry.label,
        adAccountId: entry.adAccountId, campaigns: entry.campaigns,
        selectedCampaignIds: entry.selectedCampaignIds, isEnabled: !entry.isEnabled,
      });
      onToggled(updated);
    } catch { /* ignore */ } finally { setToggling(false); }
  };

  return (
    <div className="rounded-lg border" style={{ borderColor: "var(--dm-border-default)",
      backgroundColor: "var(--dm-bg-elevated)", opacity: entry.isEnabled ? 1 : 0.6 }}>
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Toggle */}
        <button type="button" onClick={() => void handleToggle()} disabled={toggling}
          title={entry.isEnabled ? "Desativar" : "Ativar"}
          className="flex-shrink-0 transition disabled:opacity-50">
          {entry.isEnabled
            ? <Eye size={13} className="text-emerald-500" />
            : <EyeOff size={13} style={{ color: "var(--dm-text-tertiary)" }} />}
        </button>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold" style={{ color: "var(--dm-text-primary)" }}>
            {entry.label}
          </p>
          <p className="truncate text-[10px] font-mono" style={{ color: "var(--dm-text-tertiary)" }}>
            {entry.adAccountId}
          </p>
        </div>

        {/* Campaign count badge */}
        {campCount > 0 && (
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="flex flex-shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold transition"
            style={{ backgroundColor: "var(--dm-bg-surface)", color: "var(--dm-brand-500)",
              border: "1px solid var(--dm-brand-200)" }}>
            <Link2 size={8} />
            {selCount}/{campCount}
            {expanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
          </button>
        )}

        {/* Delete */}
        <button type="button" onClick={() => void handleDelete()} disabled={deleting}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:opacity-40"
          style={{ color: "var(--dm-text-tertiary)" }}>
          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        </button>
      </div>

      {/* Campaign list (expanded) */}
      {expanded && campCount > 0 && (
        <div className="mx-2 mb-2 max-h-32 overflow-y-auto rounded border p-1"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)" }}>
          {entry.campaigns.map(c => {
            const checked = entry.selectedCampaignIds.length === 0 || entry.selectedCampaignIds.includes(c.id);
            return (
              <div key={c.id} className="flex items-center gap-2 rounded px-2 py-1">
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${checked ? "bg-emerald-500" : "bg-slate-300"}`} />
                <span className="flex-1 truncate text-[10px]" style={{ color: "var(--dm-text-secondary)" }}
                  title={c.name}>{c.name}</span>
                <span className={`text-[9px] font-bold ${c.status === "ACTIVE" ? "text-emerald-500" : "text-amber-400"}`}>
                  {c.status === "ACTIVE" ? "● ativa" : "◐ pausada"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CategorySection ──────────────────────────────────────────────────────────

interface CategorySectionProps {
  slug: string;
  name: string;
  emoji: string;
  campaignSuggestions?: string[];
  categoryRecord: UserCategory | undefined;
  entries: UserAccountEntry[];
  onCategoryToggle:  (slug: string, enabled: boolean) => void;
  onCategoryCreated: (cat: UserCategory) => void;
  onEntrySaved:    (entry: UserAccountEntry) => void;
  onEntryDeleted:  (id: string) => void;
  onEntryToggled:  (entry: UserAccountEntry) => void;
  isCustom?: boolean;
  onDeleteCategory?: (slug: string) => void;
}

function CategorySection({
  slug, name, emoji, categoryRecord, entries, campaignSuggestions,
  onCategoryToggle, onCategoryCreated, onEntrySaved, onEntryDeleted, onEntryToggled,
  isCustom, onDeleteCategory,
}: CategorySectionProps) {
  const [showAdd,        setShowAdd]        = useState(false);
  const [toggling,       setToggling]       = useState(false);
  const [localRecord,    setLocalRecord]    = useState(categoryRecord);
  const isEnabled = (localRecord ?? categoryRecord)?.isEnabled ?? true;

  // Sync localRecord when parent prop changes (e.g. after creation callback)
  useEffect(() => {
    if (categoryRecord) setLocalRecord(categoryRecord);
  }, [categoryRecord?.id, categoryRecord?.isEnabled]);

  // Creates the Supabase record on demand (first time user interacts with this category)
  const ensureRecord = async (): Promise<UserCategory> => {
    if (localRecord) return localRecord;
    const created = await upsertUserCategory({
      slug, name, type: isCustom ? "custom" : "fixed", emoji: emoji || null,
    });
    setLocalRecord(created);
    onCategoryCreated(created);
    return created;
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await ensureRecord();
      await onCategoryToggle(slug, !isEnabled);
    } finally { setToggling(false); }
  };

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--dm-border-default)" }}>

      {/* Category header */}
      <div className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: "var(--dm-bg-elevated)" }}>
        <span className="text-base leading-none">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--dm-text-primary)" }}>
            {name}
          </p>
          <p className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>
            {entries.length === 0 ? "Nenhuma conta vinculada" : `${entries.length} conta${entries.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Toggle enable/disable */}
        <button type="button" onClick={() => void handleToggle()} disabled={toggling}
          title={isEnabled ? "Desativar categoria" : "Ativar categoria"}
          className={`flex h-6 items-center gap-1 rounded-full px-2 text-[10px] font-bold transition disabled:opacity-50 ${
            isEnabled
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
          }`}>
          {toggling
            ? <Loader2 size={9} className="animate-spin" />
            : isEnabled ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
          {isEnabled ? "ativo" : "inativo"}
        </button>

        {/* Delete (custom categories only) */}
        {isCustom && onDeleteCategory && (
          <button type="button" onClick={() => onDeleteCategory(slug)}
            className="flex h-6 w-6 items-center justify-center rounded transition hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            style={{ color: "var(--dm-text-tertiary)" }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Entries */}
      {(entries.length > 0 || showAdd) && (
        <div className="p-3 space-y-2" style={{ borderTop: "1px solid var(--dm-border-default)" }}>
          {entries.map(entry => (
            <EntryRow key={entry.id} entry={entry}
              onDeleted={onEntryDeleted} onToggled={onEntryToggled} />
          ))}

          {showAdd && localRecord && (
            <AddEntryForm
              categoryId={localRecord.id}
              suggestions={(campaignSuggestions ?? []).filter(
                n => classifyCampaign(n) === slug
              )}
              onSaved={entry => { onEntrySaved(entry); setShowAdd(false); }}
              onCancel={() => setShowAdd(false)}
            />
          )}
        </div>
      )}

      {/* Add account button */}
      {!showAdd && (
        <div className="px-3 pb-3" style={{ paddingTop: entries.length > 0 ? 0 : "0.75rem" }}>
          <button type="button"
            onClick={() => void ensureRecord().then(() => setShowAdd(true))}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-[11px] font-semibold transition hover:opacity-80"
            style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }}>
            <Plus size={12} /> Adicionar conta
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Contas & Campanhas ──────────────────────────────────────────────────

interface TabAccountsProps {
  categories: UserCategory[];
  accountEntries: UserAccountEntry[];
  onCategoriesChange: (cats: UserCategory[]) => void;
  onEntriesChange:    (entries: UserAccountEntry[]) => void;
  campaignSuggestions?: string[];
}

function TabAccounts({ categories, accountEntries, onCategoriesChange, onEntriesChange, campaignSuggestions }: TabAccountsProps) {
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📌");
  const [savingCat, setSavingCat] = useState(false);
  const [catErr, setCatErr] = useState("");

  const customCats = categories.filter(c => c.type === "custom");
  const canAddCustom = customCats.length < MAX_CUSTOM_CATEGORIES;

  const handleToggleCategory = async (slug: string, enabled: boolean) => {
    const existing = categories.find(c => c.slug === slug);
    const fixedDef = FIXED_CATEGORIES.find(f => f.slug === slug);
    const updated = await upsertUserCategory({
      id:        existing?.id,
      slug,
      name:      existing?.name ?? fixedDef?.name ?? slug,
      type:      existing?.type ?? "fixed",
      emoji:     existing?.emoji ?? fixedDef?.emoji ?? null,
      position:  existing?.position ?? fixedDef?.defaultPosition ?? 0,
      isEnabled: enabled,
    });
    onCategoriesChange(
      categories.some(c => c.slug === slug)
        ? categories.map(c => c.slug === slug ? updated : c)
        : [...categories, updated],
    );
  };

  const handleEntrySaved = (entry: UserAccountEntry) => {
    onEntriesChange(
      accountEntries.some(e => e.id === entry.id)
        ? accountEntries.map(e => e.id === entry.id ? entry : e)
        : [...accountEntries, entry],
    );
  };

  const handleEntryDeleted = (id: string) => {
    onEntriesChange(accountEntries.filter(e => e.id !== id));
  };

  const handleEntryToggled = (entry: UserAccountEntry) => {
    onEntriesChange(accountEntries.map(e => e.id === entry.id ? entry : e));
  };

  const handleDeleteCustom = async (slug: string) => {
    const cat = categories.find(c => c.slug === slug);
    if (!cat) return;
    await deleteUserCategory(cat.id);
    onCategoriesChange(categories.filter(c => c.slug !== slug));
    onEntriesChange(accountEntries.filter(e => e.categoryId !== cat.id));
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    setCatErr("");
    try {
      const slug = `custom-${Date.now()}`;
      const cat = await upsertUserCategory({
        slug, name: newCatName.trim(), type: "custom",
        emoji: newCatEmoji || "📌", position: 10 + customCats.length,
      });
      onCategoriesChange([...categories, cat]);
      setNewCatName(""); setNewCatEmoji("📌"); setShowNewCat(false);
    } catch (e) {
      setCatErr(e instanceof Error ? e.message : "Erro ao criar categoria.");
    } finally { setSavingCat(false); }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--dm-text-tertiary)" }}>Categorias fixas</p>
        <div className="space-y-2">
          {FIXED_CATEGORIES.map(fc => {
            const catRecord = categories.find(c => c.slug === fc.slug);
            const entries   = catRecord
              ? accountEntries.filter(e => e.categoryId === catRecord.id)
              : [];
            return (
              <CategorySection key={fc.slug}
                slug={fc.slug} name={fc.name} emoji={fc.emoji}
                categoryRecord={catRecord} entries={entries}
                campaignSuggestions={campaignSuggestions}
                onCategoryToggle={handleToggleCategory}
                onCategoryCreated={cat => onCategoriesChange([...categories, cat])}
                onEntrySaved={handleEntrySaved}
                onEntryDeleted={handleEntryDeleted}
                onEntryToggled={handleEntryToggled}
              />
            );
          })}
        </div>
      </div>

      {/* Custom categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--dm-text-tertiary)" }}>
            Categorias personalizadas
          </p>
          <span className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>
            {customCats.length}/{MAX_CUSTOM_CATEGORIES}
          </span>
        </div>

        {customCats.length > 0 && (
          <div className="space-y-2 mb-2">
            {customCats.map(cat => {
              const entries = accountEntries.filter(e => e.categoryId === cat.id);
              return (
                <CategorySection key={cat.slug}
                  slug={cat.slug} name={cat.name} emoji={cat.emoji ?? "📌"}
                  categoryRecord={cat} entries={entries}
                  campaignSuggestions={campaignSuggestions}
                  onCategoryToggle={handleToggleCategory}
                  onCategoryCreated={created => onCategoriesChange(categories.map(c => c.id === created.id ? created : c))}
                  onEntrySaved={handleEntrySaved}
                  onEntryDeleted={handleEntryDeleted}
                  onEntryToggled={handleEntryToggled}
                  isCustom
                  onDeleteCategory={handleDeleteCustom}
                />
              );
            })}
          </div>
        )}

        {/* New custom category form */}
        {showNewCat ? (
          <div className="rounded-xl border p-3 space-y-3"
            style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
            <div className="flex gap-2">
              <input
                value={newCatEmoji}
                onChange={e => setNewCatEmoji(e.target.value.slice(-2))}
                placeholder="📌"
                maxLength={2}
                className="h-8 w-12 rounded-lg border text-center text-base outline-none focus:ring-1"
                style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)" }}
              />
              <input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Nome da categoria"
                className="h-8 flex-1 rounded-lg border px-3 text-xs outline-none focus:ring-1"
                style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)",
                  color: "var(--dm-text-primary)" }}
              />
            </div>
            {catErr && <p className="text-[10px] text-red-500">{catErr}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNewCat(false)}
                className="flex h-8 flex-1 items-center justify-center rounded-lg border text-xs font-semibold"
                style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={() => void handleCreateCategory()}
                disabled={!newCatName.trim() || savingCat}
                className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--dm-brand-500)" }}>
                {savingCat ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Criar
              </button>
            </div>
          </div>
        ) : canAddCustom ? (
          <button type="button" onClick={() => setShowNewCat(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-semibold transition hover:opacity-80"
            style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }}>
            <Plus size={13} /> Nova categoria
          </button>
        ) : (
          <p className="text-center text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
            Limite de {MAX_CUSTOM_CATEGORIES} categorias personalizadas atingido.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Integrações ─────────────────────────────────────────────────────────

function TabIntegrations() {
  const [token,    setToken]    = useState(() => loadMetaCredentials().accessToken ?? "");
  const [visible,  setVisible]  = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [testOk,   setTestOk]   = useState<boolean | null>(null);
  const [testMsg,  setTestMsg]  = useState("");
  const [saved,    setSaved]    = useState(false);

  const handleSave = () => {
    saveMetaCredentials({ accessToken: token.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    const t = token.trim();
    if (!t) return;
    setTesting(true);
    setTestOk(null);
    setTestMsg("");
    try {
      const { fetchMetaAdAccounts } = await import("@/utils/metaApi");
      const accounts = await fetchMetaAdAccounts(t);
      setTestOk(true);
      setTestMsg(`${accounts.length} conta${accounts.length !== 1 ? "s" : ""} encontrada${accounts.length !== 1 ? "s" : ""}.`);
    } catch (e) {
      setTestOk(false);
      setTestMsg(e instanceof Error ? e.message : "Falha ao testar token.");
    } finally { setTesting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Meta Ads */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--dm-bg-elevated)" }}>
            <Zap size={15} style={{ color: "var(--dm-brand-500)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>Meta Ads</p>
            <p className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>Token de acesso à API</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              type={visible ? "text" : "password"}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="EAAxxxxxxxxx…"
              className="h-9 w-full rounded-lg border pr-9 pl-3 text-xs font-mono outline-none focus:ring-1"
              style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)",
                color: "var(--dm-text-primary)" }}
            />
            <button type="button" onClick={() => setVisible(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: "var(--dm-text-tertiary)" }}>
              {visible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>

          {testOk !== null && (
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium ${
              testOk ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                     : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
            }`}>
              {testOk ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {testMsg}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => void handleTest()}
              disabled={!token.trim() || testing}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-semibold transition disabled:opacity-50"
              style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }}>
              {testing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Testar
            </button>
            <button type="button" onClick={handleSave}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-bold text-white transition"
              style={{ backgroundColor: saved ? "var(--dm-success-text)" : "var(--dm-brand-500)" }}>
              {saved ? <CheckCircle2 size={11} /> : <Save size={11} />}
              {saved ? "Salvo!" : "Salvar token"}
            </button>
          </div>
        </div>

        <p className="mt-2 text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>
          💡 Use um <strong>System User Token</strong> para não expirar.
          Tokens do Graph API Explorer expiram em ~1h.
        </p>
      </section>
    </div>
  );
}

// ─── Tab: Sincronização ───────────────────────────────────────────────────────

interface TabSyncProps {
  syncStatus?:    { syncing: boolean; result?: MetaSyncResult; error?: string };
  campaignCount?: number;
  dataSource?:    { type: string; label: string } | null;
  onRefresh?:     () => Promise<void>;
  onClearData?:   () => Promise<void>;
}

function TabSync({ syncStatus, campaignCount, dataSource, onRefresh, onClearData }: TabSyncProps) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (!onClearData) return;
    setClearing(true);
    try { await onClearData(); } finally { setClearing(false); }
  };

  const lastSync = syncStatus?.result;
  const isMetaSource = dataSource?.type === "meta";

  return (
    <div className="space-y-5">
      {/* Status card */}
      <div className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>Fonte de dados</p>
          {dataSource ? (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: "var(--dm-success-bg)", color: "var(--dm-success-text)" }}>
              {dataSource.type === "meta" ? "Meta Ads" : dataSource.type === "google_sheets" ? "Google Sheets" : "CSV"}
            </span>
          ) : (
            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>
              Nenhuma
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>Registros</p>
          <div className="flex items-center gap-1.5">
            <Database size={11} style={{ color: "var(--dm-text-tertiary)" }} />
            <span className="text-[13px] font-bold" style={{ color: "var(--dm-text-primary)" }}>
              {campaignCount ?? 0}
            </span>
          </div>
        </div>

        {lastSync && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>Última sync</p>
            <span className="text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
              {lastSync.synced} registros · {lastSync.dateFrom} → {lastSync.dateTo}
            </span>
          </div>
        )}

        {syncStatus?.syncing && (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--dm-text-secondary)" }}>
            <Loader2 size={12} className="animate-spin flex-shrink-0" />
            Sincronizando dados…
          </div>
        )}

        {syncStatus?.error && (
          <p className="text-[11px] text-red-500">{syncStatus.error}</p>
        )}
      </div>

      {/* Atualizar button */}
      {isMetaSource && onRefresh && (
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={syncStatus?.syncing}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
          style={{ backgroundColor: "var(--dm-brand-500)" }}
        >
          <RotateCcw size={14} className={syncStatus?.syncing ? "animate-spin" : ""} />
          Atualizar dados agora
        </button>
      )}

      {/* Limpar dados */}
      {dataSource && onClearData && (
        <div className="rounded-xl border p-4"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
          <p className="mb-1 text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>Limpar dados</p>
          <p className="mb-3 text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
            Remove todos os dados importados e desconecta a fonte atual.
          </p>
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={clearing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400 disabled:opacity-50"
            style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }}
          >
            {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Limpar dados
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

interface TabProfileProps {
  name: string;
  email: string;
  onUpdateProfile: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

function TabProfile({ name, email, onUpdateProfile, onSignOut }: TabProfileProps) {
  const [editName, setEditName] = useState(name);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await onUpdateProfile(editName.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Avatar placeholder */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: "var(--dm-brand-500)" }}>
          {(name || email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>{name || "—"}</p>
          <p className="truncate text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>{email}</p>
        </div>
      </div>

      {/* Edit name */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          Nome
        </label>
        <div className="flex gap-2">
          <input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="h-9 flex-1 rounded-lg border px-3 text-xs outline-none focus:ring-1"
            style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)",
              color: "var(--dm-text-primary)" }}
          />
          <button type="button" onClick={() => void handleSave()}
            disabled={!editName.trim() || saving}
            className="flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-bold text-white transition disabled:opacity-50"
            style={{ backgroundColor: saved ? "var(--dm-success-text)" : "var(--dm-brand-500)" }}>
            {saving ? <Loader2 size={11} className="animate-spin" /> : saved ? <CheckCircle2 size={11} /> : <Save size={11} />}
            {saved ? "Salvo!" : "Salvar"}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          E-mail
        </label>
        <p className="rounded-lg border px-3 py-2 text-xs"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)",
            color: "var(--dm-text-tertiary)" }}>
          {email}
        </p>
      </div>

      {/* Theme */}
      <div>
        <label className="mb-2 block text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          Tema
        </label>
        <div className="flex gap-2">
          {(["light", "dark"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${
                resolvedTheme === t
                  ? "border-[var(--dm-brand-400)] bg-[var(--dm-brand-50)] text-[var(--dm-brand-600)]"
                  : "border-[var(--dm-border-default)] text-[var(--dm-text-secondary)]"
              }`}
            >
              {t === "light" ? <Sun size={13} /> : <Moon size={13} />}
              {t === "light" ? "Claro" : "Escuro"}
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button type="button" onClick={() => void onSignOut()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400"
        style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }}>
        <User size={14} />
        Sair da conta
      </button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ControlPanel({
  isOpen, onClose, userName, userEmail,
  categories, accountEntries,
  onCategoriesChange, onEntriesChange,
  onUpdateProfile, onSignOut,
  syncStatus, campaignCount, dataSource, onRefresh, onClearData,
  campaignSuggestions,
}: ControlPanelProps) {
  const [tab, setTab] = useState<CPTab>("accounts");

  const tabCls = useCallback((t: CPTab) =>
    `px-3 py-2 text-xs font-semibold rounded-lg transition ${
      tab === t
        ? "text-[var(--dm-text-primary)] bg-[var(--dm-bg-surface)] shadow-sm"
        : "text-[var(--dm-text-tertiary)] hover:text-[var(--dm-text-secondary)]"
    }`, [tab]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col"
        style={{
          backgroundColor: "var(--dm-bg-surface)",
          borderLeft: "1px solid var(--dm-border-default)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
          animation: "slideInRight 0.25s ease",
        }}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--dm-border-default)" }}>
          <div className="flex items-center gap-2">
            <Settings2 size={16} style={{ color: "var(--dm-brand-500)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--dm-text-primary)" }}>
              Painel de Controle
            </h2>
          </div>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full transition hover:opacity-70"
            style={{ color: "var(--dm-text-tertiary)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex flex-shrink-0 gap-1 border-b px-4 py-2"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
          <button className={tabCls("accounts")}     onClick={() => setTab("accounts")}>Contas</button>
          <button className={tabCls("integrations")} onClick={() => setTab("integrations")}>Integrações</button>
          <button className={tabCls("sync")}         onClick={() => setTab("sync")}>Sincronização</button>
          <button className={tabCls("profile")}      onClick={() => setTab("profile")}>Perfil</button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "accounts" && (
            <TabAccounts
              categories={categories}
              accountEntries={accountEntries}
              onCategoriesChange={onCategoriesChange}
              onEntriesChange={onEntriesChange}
              campaignSuggestions={campaignSuggestions}
            />
          )}
          {tab === "integrations" && <TabIntegrations />}
          {tab === "sync" && (
            <TabSync
              syncStatus={syncStatus}
              campaignCount={campaignCount}
              dataSource={dataSource}
              onRefresh={onRefresh}
              onClearData={onClearData}
            />
          )}
          {tab === "profile" && (
            <TabProfile
              name={userName}
              email={userEmail}
              onUpdateProfile={onUpdateProfile}
              onSignOut={onSignOut}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
