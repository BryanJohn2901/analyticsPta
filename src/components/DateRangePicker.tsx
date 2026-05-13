"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, X } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** YYYY-MM-DD → DD/MM/AAAA */
export function isoToBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/** DD/MM/AAAA → YYYY-MM-DD (returns "" if invalid) */
function brToIso(br: string): string {
  const digits = br.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  const date = new Date(`${y}-${m}-${d}`);
  if (isNaN(date.getTime())) return "";
  if (date.getDate() !== Number(d)) return ""; // catch month roll-over (e.g. 31/02)
  return `${y}-${m}-${d}`;
}

/** Auto-insert slashes as user types */
function applyMask(prev: string, next: string): string {
  const digits = next.replace(/\D/g, "").slice(0, 8);
  let result = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += "/";
    result += digits[i];
  }
  return result;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── BRDateInput ──────────────────────────────────────────────────────────────

interface BRDateInputProps {
  label: string;
  value: string;        // YYYY-MM-DD
  onChange: (v: string) => void;
  changed?: boolean;
}

function BRDateInput({ label, value, onChange, changed }: BRDateInputProps) {
  const [text, setText] = useState(isoToBR(value));
  const nativeRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally (preset clicked, filter cleared)
  useEffect(() => { setText(isoToBR(value)); }, [value]);

  const handleTextChange = (raw: string) => {
    const masked = applyMask(text, raw);
    setText(masked);
    const iso = brToIso(masked);
    if (iso) onChange(iso);
  };

  const handleNativePick = (iso: string) => {
    onChange(iso);
    setText(isoToBR(iso));
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium" style={{ color: "var(--dm-text-tertiary)" }}>{label}</span>
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="DD/MM/AAAA"
          maxLength={10}
          className="h-9 w-full rounded-lg border px-2 pr-8 text-xs outline-none transition focus:ring-1"
          style={{
            borderColor: changed ? "var(--dm-brand-400)" : "var(--dm-border-default)",
            backgroundColor: "var(--dm-bg-elevated)",
            color: "var(--dm-text-primary)",
          }}
        />
        {/* Native date picker hidden behind the calendar icon for accessibility */}
        <input
          ref={nativeRef}
          type="date"
          value={value}
          onChange={(e) => handleNativePick(e.target.value)}
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          style={{ fontSize: 0 }}
        />
        <Calendar
          size={13}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
          style={{ color: "var(--dm-text-tertiary)" }}
        />
      </div>
    </label>
  );
}

// ─── Preset definitions ───────────────────────────────────────────────────────

interface Preset { label: string; from: () => string; to: () => string }

const PRESETS: Preset[] = [
  { label: "Hoje",     from: localToday,         to: localToday },
  { label: "7 dias",   from: () => daysAgo(6),   to: localToday },
  { label: "30 dias",  from: () => daysAgo(29),  to: localToday },
  { label: "Mês",      from: firstOfMonth,        to: localToday },
];

// ─── DateRangePicker ──────────────────────────────────────────────────────────

export interface DateRangePickerProps {
  /** Applied (active) values — used to detect active preset */
  from: string;
  to: string;
  /** Pending (staged) values */
  pendingFrom: string;
  pendingTo: string;
  onPendingFrom: (v: string) => void;
  onPendingTo:   (v: string) => void;
  /** Apply pending values to the active filter */
  onApply: () => void;
  /** Instantly apply a specific date range (used by preset buttons) */
  onApplyRange: (from: string, to: string) => void;
  /** Clear both date filters */
  onClear: () => void;
  pendingChanged: boolean;
}

export function DateRangePicker({
  from, to,
  pendingFrom, pendingTo,
  onPendingFrom, onPendingTo,
  onApply, onApplyRange, onClear,
  pendingChanged,
}: DateRangePickerProps) {
  const activePreset = PRESETS.find(
    (p) => from && to && p.from() === from && p.to() === to,
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          Período
        </p>
        {(from || to) && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-0.5 text-[10px] transition hover:opacity-70"
            style={{ color: "var(--dm-text-tertiary)" }}
          >
            <X size={9} />
            Limpar
          </button>
        )}
      </div>

      {/* Preset chips */}
      <div className="mb-2 flex flex-wrap gap-1">
        {PRESETS.map((p) => {
          const active = p.label === activePreset?.label;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onApplyRange(p.from(), p.to())}
              className="rounded-md border px-2 py-0.5 text-[10px] font-medium transition"
              style={active ? {
                backgroundColor: "var(--dm-brand-500)",
                borderColor:     "var(--dm-brand-500)",
                color: "#fff",
              } : {
                borderColor:     "var(--dm-border-default)",
                backgroundColor: "var(--dm-bg-elevated)",
                color:           "var(--dm-text-secondary)",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Date text inputs (DD/MM/AAAA) */}
      <div className="grid grid-cols-2 gap-2">
        <BRDateInput
          label="De"
          value={pendingFrom}
          onChange={onPendingFrom}
          changed={pendingFrom !== from}
        />
        <BRDateInput
          label="Até"
          value={pendingTo}
          onChange={onPendingTo}
          changed={pendingTo !== to}
        />
      </div>

      {/* Apply button — visible only when pending differs from applied */}
      {pendingChanged && (
        <button
          onClick={onApply}
          className="mt-2 w-full rounded-lg py-2 text-xs font-bold text-white transition active:scale-95"
          style={{ backgroundColor: "var(--dm-brand-500)" }}
        >
          Aplicar período
        </button>
      )}

      {/* Active period summary (shown when no pending change) */}
      {(from || to) && !pendingChanged && (
        <p className="mt-1.5 text-center text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>
          {from ? isoToBR(from) : "início"} → {to ? isoToBR(to) : "hoje"}
        </p>
      )}
    </div>
  );
}
