"use client";

import { TEMPLATE_LIST } from "@/lib/templates";
import type { TemplateId } from "@/lib/templates/types";
import { ChevronDown, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  current: TemplateId;
  onChange: (id: TemplateId) => void;
  variant?: "modal" | "dropdown";
  onOpenBuilder?: () => void;
}

export function TemplateSelector({ current, onChange, variant = "dropdown", onOpenBuilder }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentTpl = TEMPLATE_LIST.find((t) => t.id === current) ?? TEMPLATE_LIST[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (variant === "modal") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {TEMPLATE_LIST.map((tpl) => {
          const isPersonalizado = tpl.id === "personalizado";
          const isSelected = current === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                onChange(tpl.id);
                if (isPersonalizado && onOpenBuilder) onOpenBuilder();
              }}
              className={`relative text-left rounded-2xl border-2 p-5 transition hover:shadow-md hover:-translate-y-0.5 ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Template</div>
              <div className="mt-1 text-lg font-bold" style={{ color: tpl.color }}>{tpl.label}</div>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{tpl.description}</p>
              {isPersonalizado ? (
                <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                  <Settings2 size={10} />
                  {isSelected ? "Configurar métricas →" : "Monte do seu jeito"}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1">
                  {tpl.kpis.slice(0, 3).map((k) => (
                    <span
                      key={k.id}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-700 dark:text-slate-300"
                    >
                      {k.label}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant
  return (
    <div ref={ref} className="flex items-center gap-1">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
        >
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: currentTpl.color }} />
          Template: {currentTpl.label}
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="py-1">
              {TEMPLATE_LIST.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => { onChange(tpl.id); setOpen(false); if (tpl.id === "personalizado" && onOpenBuilder) onOpenBuilder(); }}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-xs transition hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                    tpl.id === current ? "bg-indigo-50/60 dark:bg-indigo-900/20" : ""
                  }`}
                >
                  <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: tpl.color }} />
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold leading-tight ${tpl.id === current ? "text-indigo-700 dark:text-indigo-400" : "text-slate-800 dark:text-slate-200"}`}>
                      {tpl.label}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
                      {tpl.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configurar button — only shown when personalizado is active */}
      {current === "personalizado" && onOpenBuilder && (
        <button
          type="button"
          onClick={onOpenBuilder}
          title="Configurar métricas do dashboard personalizado"
          className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
        >
          <Settings2 size={11} /> Configurar
        </button>
      )}
    </div>
  );
}
