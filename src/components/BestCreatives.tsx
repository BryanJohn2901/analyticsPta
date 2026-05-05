"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Check,
  ExternalLink,
  ImageIcon,
  Loader2,
  MousePointerClick,
  Pencil,
  ShoppingCart,
  X,
} from "lucide-react";
import { AggregatedCampaign } from "@/types/campaign";
import { useCreativeStore, CreativeData, EMPTY_CREATIVE } from "@/hooks/useCreativeStore";
import { fetchMetaCreatives, loadMetaCredentials } from "@/utils/metaApi";
import { formatCurrency, formatPercent } from "@/utils/metrics";

interface BestCreativesProps {
  campaigns: AggregatedCampaign[];
  adAccountId?: string;
}

// ─── Creative card ────────────────────────────────────────────────────────────

interface CreativeCardProps {
  campaign: AggregatedCampaign;
  creative: CreativeData;
  isEditing: boolean;
  onEditOpen: () => void;
  onSave: (data: CreativeData) => void;
  onCancel: () => void;
}

function CreativeCard({ campaign: c, creative, isEditing, onEditOpen, onSave, onCancel }: CreativeCardProps) {
  const [draft, setDraft] = useState<CreativeData>(creative);

  const handleOpen = () => {
    setDraft(creative);
    onEditOpen();
  };

  const hasMedia = Boolean(creative.mediaUrl);
  const hasLink = Boolean(creative.adLink);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      style={{ borderColor: isEditing ? "var(--dm-brand-500)" : undefined }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
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
          <ImageIcon size={28} className="text-slate-300 dark:text-slate-500" />
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Sem criativo</span>
        </div>

        {/* Actions overlay */}
        <div className="absolute right-2 top-2 flex gap-1">
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
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-800 dark:text-slate-200">
          {c.campaignName}
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
          <span>CTR {formatPercent(c.ctr)}</span>
          <span>ROAS {c.roas.toFixed(2)}x</span>
          {c.conversions > 0 && <span>CPA {formatCurrency(c.cpa)}</span>}
        </div>
        {creative.notes && (
          <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500 line-clamp-2">
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
        <div className="border-t border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="space-y-2">
            <input
              type="url"
              value={draft.mediaUrl}
              onChange={(e) => setDraft((d) => ({ ...d, mediaUrl: e.target.value }))}
              placeholder="URL da imagem ou vídeo"
              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            <input
              type="url"
              value={draft.adLink}
              onChange={(e) => setDraft((d) => ({ ...d, adLink: e.target.value }))}
              placeholder="Link do anúncio"
              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Notas"
              rows={2}
              className="w-full resize-none rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={11} /> Cancelar
              </button>
              <button
                type="button"
                onClick={() => onSave(draft)}
                className="flex items-center gap-1 rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600"
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
    <li className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-700/50">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          rank === 1
            ? "bg-amber-100 text-amber-700"
            : rank === 2
              ? "bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300"
              : "bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-400"
        }`}
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-200 dark:bg-slate-600">
          <ImageIcon size={12} className="text-slate-400" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{c.campaignName}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-[10px] text-slate-500 dark:text-slate-400">
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
  const storeRef = useRef(store);
  storeRef.current = store;

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

  if (campaigns.length === 0) {
    return (
      <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-12">
        Nenhuma campanha disponível para o filtro atual.
      </p>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Gallery ─────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Criativos ({campaigns.length})
          </h2>
          {fetchingCreatives && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
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
                onEditOpen={() => setEditingCampaign(c.campaignName)}
                onSave={(data) => {
                  saveCreative(c.campaignName, data);
                  setEditingCampaign(null);
                }}
                onCancel={() => setEditingCampaign(null)}
              />
            );
          })}
        </div>
      </section>

      {/* ── Rankings ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <MousePointerClick size={17} className="text-blue-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Maior CTR</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Criativos que mais geram cliques</p>
            </div>
          </div>
          {byCtr.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Dados insuficientes para este filtro.</p>
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

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart size={17} className="text-violet-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Melhor Conversão</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Criativos que mais convertem em vendas</p>
            </div>
          </div>
          {byConversion.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Dados insuficientes para este filtro.</p>
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
