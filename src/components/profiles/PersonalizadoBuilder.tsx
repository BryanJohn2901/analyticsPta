"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { PersonalizadoConfig } from "@/lib/templates/types";
import {
  ALL_KPI_OPTIONS,
  ALL_FUNNEL_OPTIONS,
  KPI_GROUPS,
  DEFAULT_PERSONALIZADO_CONFIG,
} from "@/lib/templates";
import { loadInstagramCredentials } from "@/utils/instagramApi";

const MAX_KPIS = 10;

interface Props {
  config: PersonalizadoConfig;
  onChange: (config: PersonalizadoConfig) => void;
  onClose: () => void;
}

export function PersonalizadoBuilder({ config, onChange, onClose }: Props) {
  const [name,      setName]      = useState<string>(config.name ?? "");
  const [kpiIds,    setKpiIds]    = useState<string[]>(config.kpiIds);
  const [funnelIds, setFunnelIds] = useState<string[]>(config.funnelIds);

  const hasIgToken = Boolean(loadInstagramCredentials().accessToken);

  const toggleKpi = (id: string) => {
    setKpiIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // min 1
        return prev.filter((k) => k !== id);
      }
      if (prev.length >= MAX_KPIS) return prev;
      return [...prev, id];
    });
  };

  const toggleFunnel = (id: string) =>
    setFunnelIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );

  const handleSave = () => {
    onChange({ name: name.trim() || undefined, kpiIds, funnelIds });
    onClose();
  };

  const handleReset = () => {
    setName("");
    setKpiIds(DEFAULT_PERSONALIZADO_CONFIG.kpiIds);
    setFunnelIds(DEFAULT_PERSONALIZADO_CONFIG.funnelIds);
  };

  // ── Style helpers ───────────────────────────────────────────────────────────
  const kpiItemCls = (selected: boolean, disabled = false) =>
    `flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
      selected
        ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
        : disabled
          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600"
          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-violet-500"
    }`;

  const checkCls = (selected: boolean, disabled = false) =>
    `flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
      selected
        ? "border-violet-500 bg-violet-500"
        : disabled
          ? "border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-700"
          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700"
    }`;

  const funnelItemCls = (selected: boolean) =>
    `flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
      selected
        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-500"
    }`;

  const funnelCheckCls = (selected: boolean) =>
    `flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
      selected
        ? "border-emerald-500 bg-emerald-500"
        : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700"
    }`;

  const kpiMap = Object.fromEntries(ALL_KPI_OPTIONS.map((k) => [k.id, k]));
  const visibleGroups = KPI_GROUPS.filter((g) => !g.igOnly || hasIgToken);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl shadow-2xl"
        style={{ backgroundColor: "var(--dm-bg-surface)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div
          className="flex flex-shrink-0 items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--dm-border-default)" }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--dm-text-primary)" }}>
              Personalizar layout
            </h2>
            <p className="text-xs" style={{ color: "var(--dm-text-tertiary)" }}>
              {kpiIds.length}/{MAX_KPIS} KPIs selecionados · mín. 1
            </p>
          </div>
          <button onClick={onClose}
            className="rounded-full p-1.5 transition hover:opacity-70"
            style={{ color: "var(--dm-text-tertiary)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 3.7 — Nome do template */}
          <section>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
              Nome do layout <span className="font-normal opacity-50">(opcional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tráfego — Pós Graduação"
              className="h-9 w-full rounded-lg border px-3 text-xs outline-none transition focus:ring-2 focus:ring-violet-200"
              style={{
                borderColor: "var(--dm-border-default)",
                backgroundColor: "var(--dm-bg-elevated)",
                color: "var(--dm-text-primary)",
              }}
            />
          </section>

          {/* 3.5 + 3.6 — KPIs grouped */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>
                Métricas principais
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: kpiIds.length >= MAX_KPIS ? "var(--dm-brand-50)" : "var(--dm-bg-elevated)",
                  color: kpiIds.length >= MAX_KPIS ? "var(--dm-brand-500)" : "var(--dm-text-tertiary)",
                }}
              >
                {kpiIds.length}/{MAX_KPIS}
              </span>
            </div>

            <div className="space-y-4">
              {visibleGroups.map((group) => {
                const groupKpis = group.kpiIds.map((id) => kpiMap[id]).filter(Boolean);
                return (
                  <div key={group.label}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--dm-text-tertiary)" }}>
                      {group.label}
                      {group.igOnly && (
                        <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px]"
                          style={{ backgroundColor: "#E1306C22", color: "#E1306C" }}>
                          Instagram
                        </span>
                      )}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {groupKpis.map((kpi) => {
                        const selected = kpiIds.includes(kpi.id);
                        const disabled = !selected && kpiIds.length >= MAX_KPIS;
                        return (
                          <button
                            key={kpi.id}
                            type="button"
                            onClick={() => !disabled && toggleKpi(kpi.id)}
                            className={kpiItemCls(selected, disabled)}
                          >
                            <span className={checkCls(selected, disabled)}>
                              {selected && <Check size={9} className="text-white" />}
                            </span>
                            <span className="truncate">{kpi.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Funil */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>
                Etapas do funil{" "}
                <span className="text-[10px] font-normal" style={{ color: "var(--dm-text-tertiary)" }}>
                  ({funnelIds.length} selecionadas)
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {ALL_FUNNEL_OPTIONS.map((stage) => {
                const selected = funnelIds.includes(stage.id);
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => toggleFunnel(stage.id)}
                    className={funnelItemCls(selected)}
                  >
                    <span className={funnelCheckCls(selected)}>
                      {selected && <Check size={9} className="text-white" />}
                    </span>
                    <span className="truncate">{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div
          className="flex flex-shrink-0 items-center justify-between border-t px-6 py-4"
          style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}
        >
          <button
            onClick={handleReset}
            className="text-xs underline transition hover:opacity-70"
            style={{ color: "var(--dm-text-tertiary)" }}
          >
            Restaurar padrão
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-xs font-medium transition hover:opacity-80"
              style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)", backgroundColor: "var(--dm-bg-surface)" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={kpiIds.length === 0 || funnelIds.length === 0}
              className="rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
