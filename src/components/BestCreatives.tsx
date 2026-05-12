"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Check,
  CloudUpload,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  MousePointerClick,
  Pencil,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";
import { AggregatedCampaign } from "@/types/campaign";
import { useCreativeStore, CreativeData, EMPTY_CREATIVE } from "@/hooks/useCreativeStore";
import { fetchMetaCreatives, loadMetaCredentials } from "@/utils/metaApi";
import { formatCurrency, formatPercent } from "@/utils/metrics";
import {
  fetchSupabaseCreatives,
  saveCreativeToSupabase,
} from "@/utils/supabaseCreatives";

interface BestCreativesProps {
  campaigns: AggregatedCampaign[];
  adAccountId?: string;
}

// ─── Creative card ────────────────────────────────────────────────────────────

interface CreativeCardProps {
  campaign: AggregatedCampaign;
  creative: CreativeData;
  isEditing: boolean;
  isSaving: boolean;
  isSupabaseSaved: boolean;
  onEditOpen: () => void;
  onSave: (data: CreativeData) => void;
  onCancel: () => void;
  onToggleStar: () => void;
  onSaveToSupabase: () => void;
}

function downloadBlob(url: string, filename: string) {
  fetch(url)
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => {
      // Fallback: open in new tab
      window.open(url, "_blank");
    });
}

function CreativeCard({ campaign: c, creative, isEditing, isSaving, isSupabaseSaved, onEditOpen, onSave, onCancel, onToggleStar, onSaveToSupabase }: CreativeCardProps) {
  const [draft, setDraft] = useState<CreativeData>(creative);

  const handleOpen = () => {
    setDraft(creative);
    onEditOpen();
  };

  const hasMedia = Boolean(creative.mediaUrl);
  const hasLink = Boolean(creative.adLink);
  const isStarred = Boolean(creative.starred);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border shadow-sm"
      style={{
        backgroundColor: "var(--dm-bg-surface)",
        borderColor: isEditing ? "var(--dm-brand-500)" : "var(--dm-border-default)",
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden" style={{ backgroundColor: "var(--dm-bg-elevated)" }}>
        {hasMedia ? (
          <img
            src={creative.mediaUrl}
            alt={c.campaignName}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute("hidden");
            }}
          />
        ) : null}
        {/* Fallback placeholder — shown when no URL or image fails */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1"
          hidden={hasMedia || undefined}
          id={`placeholder-${c.campaignName}`}
        >
          <ImageIcon size={28} style={{ color: "var(--dm-border-strong)" }} />
          <span className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>Sem criativo</span>
        </div>

        {/* Star badge (top-left) */}
        {isStarred && (
          <div className="absolute left-2 top-2">
            <span className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur-sm">
              <Star size={10} fill="white" /> Destaque
            </span>
          </div>
        )}

        {/* Actions overlay (top-right) */}
        <div className="absolute right-2 top-2 flex gap-1">
          {/* Star/unstar */}
          <button
            type="button"
            onClick={onToggleStar}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow backdrop-blur-sm hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800"
            title={isStarred ? "Remover destaque" : "Marcar como destaque"}
          >
            <Star size={13} fill={isStarred ? "#f59e0b" : "none"} stroke={isStarred ? "#f59e0b" : "currentColor"} className="text-slate-400" />
          </button>
          {/* Download */}
          {hasMedia && (
            <button
              type="button"
              onClick={() => downloadBlob(creative.mediaUrl, `${c.campaignName}-criativo.jpg`)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow backdrop-blur-sm hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800"
              title="Baixar imagem"
            >
              <Download size={13} className="text-slate-500 dark:text-slate-400" />
            </button>
          )}
          {/* Save to Supabase Storage */}
          {hasMedia && (
            <button
              type="button"
              onClick={onSaveToSupabase}
              disabled={isSaving || isSupabaseSaved}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow backdrop-blur-sm hover:bg-white disabled:cursor-default dark:bg-slate-800/90 dark:hover:bg-slate-800"
              title={isSupabaseSaved ? "Salvo no Supabase" : "Salvar no Supabase"}
            >
              {isSaving ? (
                <Loader2 size={13} className="animate-spin text-blue-500" />
              ) : isSupabaseSaved ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <CloudUpload size={13} className="text-slate-500 dark:text-slate-400" />
              )}
            </button>
          )}
          {hasLink && (
            <a
              href={creative.adLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow backdrop-blur-sm hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800"
              title="Abrir anúncio"
            >
              <ExternalLink size={13} className="text-blue-500" />
            </a>
          )}
          <button
            type="button"
            onClick={handleOpen}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow backdrop-blur-sm hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800"
            title="Editar criativo"
          >
            <Pencil size={13} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Campaign info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-xs font-semibold leading-snug" style={{ color: "var(--dm-text-primary)" }}>
          {c.campaignName}
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]" style={{ color: "var(--dm-text-secondary)" }}>
          <span>CTR {formatPercent(c.ctr)}</span>
          <span>ROAS {c.roas.toFixed(2)}x</span>
          {c.conversions > 0 && <span>CPA {formatCurrency(c.cpa)}</span>}
        </div>
        {creative.notes && (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug" style={{ color: "var(--dm-text-tertiary)" }}>
            {creative.notes}
          </p>
        )}

        {/* Link row (if set but no media to show overlay) */}
        {hasLink && !hasMedia && (
          <a
            href={creative.adLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:underline"
          >
            <ExternalLink size={10} />
            Ver anúncio
          </a>
        )}
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <div className="border-t p-3" style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
          <div className="space-y-2">
            <input
              type="url"
              value={draft.mediaUrl}
              onChange={(e) => setDraft((d) => ({ ...d, mediaUrl: e.target.value }))}
              placeholder="URL da imagem ou vídeo"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:outline-none"
              style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)", color: "var(--dm-text-primary)" }}
            />
            <input
              type="url"
              value={draft.adLink}
              onChange={(e) => setDraft((d) => ({ ...d, adLink: e.target.value }))}
              placeholder="Link do anúncio"
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:outline-none"
              style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)", color: "var(--dm-text-primary)" }}
            />
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Notas"
              rows={2}
              className="w-full resize-none rounded-md border px-2.5 py-1.5 text-xs focus:outline-none"
              style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)", color: "var(--dm-text-primary)" }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs"
                style={{ color: "var(--dm-text-secondary)" }}
              >
                <X size={11} /> Cancelar
              </button>
              <button
                type="button"
                onClick={() => onSave(draft)}
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: "var(--dm-brand-500)" }}
              >
                <Check size={11} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ranking row ──────────────────────────────────────────────────────────────

interface CreativeRowProps {
  rank: number;
  campaign: AggregatedCampaign;
  creative: CreativeData;
  highlight: string;
  highlightValue: string;
}

function CreativeRow({ rank, campaign: c, creative, highlight, highlightValue }: CreativeRowProps) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border p-2.5" style={{ borderColor: "var(--dm-border-subtle)", backgroundColor: "var(--dm-bg-elevated)" }}>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={
          rank === 1
            ? { backgroundColor: "var(--dm-brand-50)", color: "var(--dm-brand-500)" }
            : { backgroundColor: "var(--dm-bg-surface)", color: "var(--dm-text-tertiary)" }
        }
      >
        {rank}
      </span>

      {/* Tiny thumbnail */}
      {creative.mediaUrl ? (
        <img
          src={creative.mediaUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded" style={{ backgroundColor: "var(--dm-border-default)" }}>
          <ImageIcon size={12} style={{ color: "var(--dm-text-tertiary)" }} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold" style={{ color: "var(--dm-text-primary)" }}>{c.campaignName}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-[10px]" style={{ color: "var(--dm-text-secondary)" }}>
          <span>CTR {formatPercent(c.ctr)}</span>
          <span>Conv. {formatPercent(c.conversionRate)}</span>
          <span>ROAS {c.roas.toFixed(2)}x</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="rounded-md bg-blue-50 px-2 py-0.5 text-right dark:bg-blue-900/30">
          <p className="text-[9px] text-blue-500 dark:text-blue-400">{highlight}</p>
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{highlightValue}</p>
        </div>
        {creative.adLink && (
          <a
            href={creative.adLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-400 hover:underline"
          >
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </li>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BestCreatives({ campaigns, adAccountId }: BestCreativesProps) {
  const { store, saveCreative } = useCreativeStore();
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [fetchingCreatives, setFetchingCreatives] = useState(false);
  // campaign_name → true when successfully saved to Supabase Storage
  const [supabaseSaved, setSupabaseSaved] = useState<Record<string, boolean>>({});
  const [savingCampaign, setSavingCampaign] = useState<string | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  const toggleStar = (campaignName: string) => {
    const existing = storeRef.current[campaignName] ?? EMPTY_CREATIVE;
    saveCreative(campaignName, {
      ...existing,
      starred: !existing.starred,
      starredAt: !existing.starred ? new Date().toISOString() : undefined,
    });
  };

  // Load previously saved creatives from Supabase on mount
  useEffect(() => {
    fetchSupabaseCreatives().then((rows) => {
      for (const row of rows) {
        if (!row.storage_url) continue;
        const existing = storeRef.current[row.campaign_name];
        // Prefer Supabase URL over Meta CDN (won't expire)
        saveCreative(row.campaign_name, {
          mediaUrl: row.storage_url,
          adLink:   existing?.adLink || row.ad_link,
          notes:    existing?.notes  || row.notes,
          starred:  existing?.starred ?? row.starred,
          starredAt: existing?.starredAt ?? row.starred_at ?? undefined,
        });
        setSupabaseSaved((prev) => ({ ...prev, [row.campaign_name]: true }));
      }
    }).catch(() => {});
  // Only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!adAccountId) return;
    const { accessToken } = loadMetaCredentials();
    if (!accessToken) return;

    setFetchingCreatives(true);
    fetchMetaCreatives(adAccountId, accessToken)
      .then((results) => {
        for (const r of results) {
          if (!r.thumbnailUrl && !r.adLink) continue;
          const existing = storeRef.current[r.campaignName];
          // Preserve manually-set mediaUrl; always refresh adLink from API if user hasn't set one
          saveCreative(r.campaignName, {
            mediaUrl: existing?.mediaUrl || r.thumbnailUrl,
            adLink:   existing?.adLink   || r.adLink,
            notes:    existing?.notes    || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setFetchingCreatives(false));
  // adAccountId change triggers a fresh fetch; saveCreative is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adAccountId]);

  const handleSaveToSupabase = async (campaignName: string) => {
    const creative = storeRef.current[campaignName];
    if (!creative?.mediaUrl) return;
    setSavingCampaign(campaignName);
    try {
      const storageUrl = await saveCreativeToSupabase(
        creative.mediaUrl,
        campaignName,
        adAccountId ?? "",
        creative.adLink,
      );
      // Update local store with the permanent Supabase URL
      saveCreative(campaignName, { ...creative, mediaUrl: storageUrl });
      setSupabaseSaved((prev) => ({ ...prev, [campaignName]: true }));
    } catch {
      // Silently ignore — user can retry
    } finally {
      setSavingCampaign(null);
    }
  };

  const byCtr = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.impressions > 500)
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 8),
    [campaigns],
  );

  const byConversion = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.clicks > 50 && c.conversions > 0)
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 8),
    [campaigns],
  );

  const starred = useMemo(
    () =>
      campaigns
        .map((c) => ({ campaign: c, creative: store[c.campaignName] }))
        .filter((x) => x.creative?.starred)
        .sort((a, b) => {
          const ta = a.creative.starredAt ?? "";
          const tb = b.creative.starredAt ?? "";
          return tb.localeCompare(ta);
        }),
    [campaigns, store],
  );

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--dm-brand-50)" }}>
          <ImageIcon size={26} style={{ color: "var(--dm-brand-500)" }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>Nenhum criativo disponível</p>
          <p className="mt-1 text-xs" style={{ color: "var(--dm-text-secondary)" }}>Importe dados via Meta Ads ou filtre uma campanha com impressões.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── How it works banner ──────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start"
        style={{ borderColor: "var(--dm-brand-100)", backgroundColor: "var(--dm-brand-50)" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--dm-brand-100)" }}
        >
          <ImageIcon size={16} style={{ color: "var(--dm-brand-600)" }} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold" style={{ color: "var(--dm-brand-700)" }}>Como funciona esta seção</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--dm-brand-600)" }}>
            <span className="flex items-center gap-1"><MousePointerClick size={11} /> Rankings automáticos por CTR e conversão</span>
            <span className="flex items-center gap-1"><Star size={11} /> Marque como destaque com a estrela — aparece na biblioteca</span>
            <span className="flex items-center gap-1"><Download size={11} /> Baixe a imagem do criativo com um clique</span>
            <span className="flex items-center gap-1"><ExternalLink size={11} /> Acesse o anúncio diretamente pelo ícone de link</span>
          </div>
        </div>
      </div>

      {/* ── Gallery ─────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>
            Criativos ({campaigns.length})
          </h2>
          {fetchingCreatives && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>
              <Loader2 size={11} className="animate-spin" />
              Buscando criativos no Meta…
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {campaigns.map((c) => {
            const creative = store[c.campaignName] ?? EMPTY_CREATIVE;
            return (
              <CreativeCard
                key={c.campaignName}
                campaign={c}
                creative={creative}
                isEditing={editingCampaign === c.campaignName}
                isSaving={savingCampaign === c.campaignName}
                isSupabaseSaved={supabaseSaved[c.campaignName] ?? false}
                onEditOpen={() => setEditingCampaign(c.campaignName)}
                onSave={(data) => {
                  saveCreative(c.campaignName, data);
                  setEditingCampaign(null);
                }}
                onCancel={() => setEditingCampaign(null)}
                onToggleStar={() => toggleStar(c.campaignName)}
                onSaveToSupabase={() => void handleSaveToSupabase(c.campaignName)}
              />
            );
          })}
        </div>
      </section>

      {/* ── Biblioteca de Destaque ───────────────────────────────────────── */}
      {starred.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Star size={15} fill="#f59e0b" stroke="#f59e0b" />
            <h2 className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>
              Biblioteca de Destaques ({starred.length})
            </h2>
            <p className="text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>— Criativos marcados como melhores</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {starred.map(({ campaign: c, creative }) => (
              <div
                key={c.campaignName}
                className="flex flex-col overflow-hidden rounded-xl border shadow-sm"
                style={{ borderColor: "#f59e0b", backgroundColor: "var(--dm-bg-surface)" }}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: "var(--dm-bg-elevated)" }}>
                  {creative.mediaUrl ? (
                    <img src={creative.mediaUrl} alt={c.campaignName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon size={24} style={{ color: "var(--dm-border-strong)" }} />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <span className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Star size={9} fill="white" /> Destaque
                    </span>
                  </div>
                  {creative.adLink && (
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => downloadBlob(creative.mediaUrl, `${c.campaignName}-destaque.jpg`)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow hover:bg-white"
                        title="Baixar"
                      >
                        <Download size={12} className="text-slate-500" />
                      </button>
                      <a
                        href={creative.adLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow hover:bg-white"
                        title="Abrir anúncio"
                      >
                        <ExternalLink size={12} className="text-blue-500" />
                      </a>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex flex-col gap-1 p-3">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug" style={{ color: "var(--dm-text-primary)" }}>{c.campaignName}</p>
                  <div className="flex flex-wrap gap-x-2 text-[10px]" style={{ color: "var(--dm-text-secondary)" }}>
                    <span>CTR {formatPercent(c.ctr)}</span>
                    <span>ROAS {c.roas.toFixed(2)}x</span>
                  </div>
                  {creative.notes && (
                    <p className="mt-0.5 line-clamp-2 text-[10px] italic leading-snug" style={{ color: "var(--dm-text-tertiary)" }}>{creative.notes}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleStar(c.campaignName)}
                    className="mt-1 self-start rounded-md px-2 py-0.5 text-[10px] font-medium"
                    style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)" }}
                  >
                    Remover destaque
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Rankings ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border p-5 shadow-sm" style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}>
          <div className="mb-4 flex items-center gap-2">
            <MousePointerClick size={17} style={{ color: "var(--dm-brand-500)" }} />
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>Maior CTR</h3>
              <p className="text-xs" style={{ color: "var(--dm-text-secondary)" }}>Criativos que mais geram cliques</p>
            </div>
          </div>
          {byCtr.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--dm-text-tertiary)" }}>Dados insuficientes para este filtro.</p>
          ) : (
            <ol className="space-y-2">
              {byCtr.map((c, idx) => (
                <CreativeRow
                  key={c.campaignName}
                  rank={idx + 1}
                  campaign={c}
                  creative={store[c.campaignName] ?? EMPTY_CREATIVE}
                  highlight="CTR"
                  highlightValue={formatPercent(c.ctr)}
                />
              ))}
            </ol>
          )}
        </article>

        <article className="rounded-xl border p-5 shadow-sm" style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}>
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart size={17} style={{ color: "var(--dm-brand-500)" }} />
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>Melhor Conversão</h3>
              <p className="text-xs" style={{ color: "var(--dm-text-secondary)" }}>Criativos que mais convertem em vendas</p>
            </div>
          </div>
          {byConversion.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--dm-text-tertiary)" }}>Dados insuficientes para este filtro.</p>
          ) : (
            <ol className="space-y-2">
              {byConversion.map((c, idx) => (
                <CreativeRow
                  key={c.campaignName}
                  rank={idx + 1}
                  campaign={c}
                  creative={store[c.campaignName] ?? EMPTY_CREATIVE}
                  highlight="Tx. Conv."
                  highlightValue={formatPercent(c.conversionRate)}
                />
              ))}
            </ol>
          )}
        </article>
      </div>
    </div>
  );
}
