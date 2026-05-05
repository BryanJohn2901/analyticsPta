"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { PersonalizadoConfig } from "@/lib/templates/types";
import { ALL_KPI_OPTIONS, ALL_FUNNEL_OPTIONS, DEFAULT_PERSONALIZADO_CONFIG } from "@/lib/templates";

interface Props {
  config: PersonalizadoConfig;
  onChange: (config: PersonalizadoConfig) => void;
  onClose: () => void;
}

export function PersonalizadoBuilder({ config, onChange, onClose }: Props) {
  const [kpiIds,    setKpiIds]    = useState<string[]>(config.kpiIds);
  const [funnelIds, setFunnelIds] = useState<string[]>(config.funnelIds);

  const toggleKpi = (id: string) => {
    setKpiIds((prev) => {
      if (prev.includes(id)) return prev.filter((k) => k !== id);
      if (prev.length >= 5) return prev; // max 5 KPIs
      return [...prev, id];
    });
  };

  const toggleFunnel = (id: string) =>
    setFunnelIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );

  const handleSave = () => { onChange({ kpiIds, funnelIds }); onClose(); };

  const handleReset = () => {
    setKpiIds(DEFAULT_PERSONALIZADO_CONFIG.kpiIds);
    setFunnelIds(DEFAULT_PERSONALIZADO_CONFIG.funnelIds);
  };

  const checkCls = (selected: boolean, disabled = false) =>
    `flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
      selected
        ? "border-violet-500 bg-violet-500"
        : disabled
          ? "border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-700"
          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700"
    }`;

  const itemCls = (selected: boolean, disabled = false) =>
    `flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
      selected
        ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
        : disabled
          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600"
          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-violet-500"
    }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Personalizar dashboard</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Escolha KPIs e etapas do funil para este perfil</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* KPIs */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                KPIs <span className="text-[10px] font-normal text-slate-400">({kpiIds.length}/5 selecionados)</span>
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Até 5 métricas principais</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_KPI_OPTIONS.map((kpi) => {
                const selected = kpiIds.includes(kpi.id);
                const disabled = !selected && kpiIds.length >= 5;
                return (
                  <button
                    key={kpi.id}
                    type="button"
                    onClick={() => !disabled && toggleKpi(kpi.id)}
                    className={itemCls(selected, disabled)}
                  >
                    <span className={checkCls(selected, disabled)}>
                      {selected && <Check size={9} className="text-white" />}
                    </span>
                    {kpi.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Funnel stages */}
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Etapas do funil <span className="text-[10px] font-normal text-slate-400">({funnelIds.length} selecionadas)</span>
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Etapas que aparecem no funil visual do perfil</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_FUNNEL_OPTIONS.map((stage) => {
                const selected = funnelIds.includes(stage.id);
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => toggleFunnel(stage.id)}
                    className={itemCls(selected)}
                  >
                    <span className={checkCls(selected)}>
                      {selected && <Check size={9} className="text-white" />}
                    </span>
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/60">
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 underline hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            Restaurar padrão
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
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
