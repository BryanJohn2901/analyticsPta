"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Eye, Loader2, MousePointerClick, ShoppingCart, CreditCard, Trophy, Settings, X } from "lucide-react";
import { loadMetaCredentials } from "@/utils/metaApi";
import type { PixelStatsResponse } from "@/app/api/meta/pixel/route";

const STORAGE_KEY = "pta_pixel_id_v1";

function loadPixelId(): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(STORAGE_KEY) ?? ""; } catch { return ""; }
}
function savePixelId(id: string) {
  try { id ? localStorage.setItem(STORAGE_KEY, id) : localStorage.removeItem(STORAGE_KEY); } catch {}
}

interface FunnelStepProps {
  icon: React.ElementType;
  label: string;
  count: number;
  rate?: number;   // conversion rate from previous step (0–1)
  color: string;
  isLast?: boolean;
}

function FunnelStep({ icon: Icon, label, count, rate, color, isLast }: FunnelStepProps) {
  const pct = rate !== undefined ? (rate * 100).toFixed(1) : null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <div
          className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border text-center"
          style={{ borderColor: color + "40", backgroundColor: color + "15" }}
        >
          <Icon size={18} style={{ color }} />
          <span className="mt-0.5 text-[11px] font-bold leading-none" style={{ color }}>
            {count.toLocaleString("pt-BR")}
          </span>
        </div>
        <span className="mt-1 max-w-[56px] text-center text-[10px] leading-tight" style={{ color: "var(--dm-text-tertiary)" }}>
          {label}
        </span>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center gap-0.5">
          <ChevronRight size={14} style={{ color: "var(--dm-text-tertiary)" }} />
          {pct !== null && (
            <span className="text-[9px] font-medium" style={{ color: "var(--dm-text-tertiary)" }}>
              {pct}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  dateFrom?: string;
  dateTo?: string;
}

export function PixelFunnelSection({ dateFrom, dateTo }: Props) {
  const [pixelId, setPixelId]     = useState("");
  const [inputVal, setInputVal]   = useState("");
  const [showInput, setShowInput] = useState(false);
  const [data, setData]           = useState<PixelStatsResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted pixel ID on mount
  useEffect(() => {
    const saved = loadPixelId();
    if (saved) { setPixelId(saved); setInputVal(saved); }
  }, []);

  // Fetch whenever pixelId or date range changes
  useEffect(() => {
    if (!pixelId) { setData(null); return; }
    const { accessToken } = loadMetaCredentials();
    if (!accessToken) { setError("Token Meta não configurado."); return; }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ pixelId, accessToken });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo)   params.set("dateTo",   dateTo);

    fetch(`/api/meta/pixel?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Erro ao buscar pixel.");
        setData(body as PixelStatsResponse);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro desconhecido."))
      .finally(() => setLoading(false));
  }, [pixelId, dateFrom, dateTo]);

  function handleSave() {
    const trimmed = inputVal.trim();
    setPixelId(trimmed);
    savePixelId(trimmed);
    setShowInput(false);
  }

  function handleClear() {
    setPixelId("");
    setInputVal("");
    savePixelId("");
    setData(null);
    setShowInput(false);
  }

  const f = data?.funnel;
  const steps = f ? [
    { icon: Eye,            label: "PageView",    count: f.pageView,         rate: undefined,                                              color: "#6366f1" },
    { icon: MousePointerClick, label: "Lead",      count: f.lead,             rate: f.pageView > 0 ? f.lead / f.pageView : 0,               color: "#0ea5e9" },
    { icon: ShoppingCart,   label: "Checkout",    count: f.initiateCheckout, rate: f.lead > 0 ? f.initiateCheckout / f.lead : 0,            color: "#f59e0b" },
    { icon: CreditCard,     label: "Pagamento",   count: f.addPaymentInfo,   rate: f.initiateCheckout > 0 ? f.addPaymentInfo / f.initiateCheckout : 0, color: "#f97316" },
    { icon: Trophy,         label: "Purchase",    count: f.purchase,         rate: f.addPaymentInfo > 0 ? f.purchase / f.addPaymentInfo : 0, color: "#22c55e" },
  ] : [];

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--dm-border)", backgroundColor: "var(--dm-surface)" }}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>
            Funil do Pixel
          </h3>
          {pixelId && (
            <p className="text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
              ID: {pixelId}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {pixelId && (
            <button
              onClick={handleClear}
              title="Remover pixel"
              className="flex h-7 w-7 items-center justify-center rounded-lg border transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              style={{ borderColor: "var(--dm-border)", color: "var(--dm-text-tertiary)" }}
            >
              <X size={13} />
            </button>
          )}
          <button
            onClick={() => { setShowInput((v) => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{ borderColor: "var(--dm-border)", color: "var(--dm-text-secondary)" }}
          >
            <Settings size={12} />
            {pixelId ? "Trocar pixel" : "Configurar pixel"}
          </button>
        </div>
      </div>

      {/* Pixel ID input */}
      {showInput && (
        <div className="mb-4 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Cole o Pixel ID (ex: 413292981515563)"
            className="h-8 flex-1 rounded-lg border px-3 text-xs outline-none"
            style={{
              borderColor: "var(--dm-border)",
              backgroundColor: "var(--dm-surface-raised)",
              color: "var(--dm-text-primary)",
            }}
          />
          <button
            onClick={handleSave}
            disabled={!inputVal.trim()}
            className="h-8 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: "var(--dm-brand-500)" }}
          >
            Salvar
          </button>
        </div>
      )}

      {/* States */}
      {!pixelId && !showInput && (
        <p className="py-4 text-center text-xs" style={{ color: "var(--dm-text-tertiary)" }}>
          Configure o Pixel ID para visualizar o funil de conversão.
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--dm-brand-500)" }} />
          <span className="text-xs" style={{ color: "var(--dm-text-tertiary)" }}>Carregando pixel…</span>
        </div>
      )}

      {error && !loading && (
        <p className="py-2 text-center text-xs text-red-500">{error}</p>
      )}

      {/* Funnel */}
      {data && !loading && !error && (
        <>
          <div className="flex flex-wrap items-start gap-1">
            {steps.map((s, i) => (
              <FunnelStep key={s.label} {...s} isLast={i === steps.length - 1} />
            ))}
          </div>

          {/* Other events */}
          {data.events.filter(e => !["PageView","Lead","InitiateCheckout","AddPaymentInfo","Purchase"].includes(e.name)).length > 0 && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--dm-border)" }}>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--dm-text-tertiary)" }}>
                Outros eventos
              </p>
              <div className="flex flex-wrap gap-2">
                {data.events
                  .filter(e => !["PageView","Lead","InitiateCheckout","AddPaymentInfo","Purchase"].includes(e.name))
                  .map(e => (
                    <span key={e.name} className="rounded-md border px-2 py-0.5 text-[11px]"
                      style={{ borderColor: "var(--dm-border)", color: "var(--dm-text-secondary)" }}>
                      {e.name}: <strong>{e.total.toLocaleString("pt-BR")}</strong>
                    </span>
                  ))
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
