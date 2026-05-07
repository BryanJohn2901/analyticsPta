"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

interface Feature {
  icon: React.ElementType;
  label: string;
  description: string;
}

interface Step {
  label: string;
  description: string;
}

interface TabLandingProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  features: Feature[];
  steps: Step[];
  cta: { label: string; onClick: () => void };
  ctaSecondary?: { label: string; onClick: () => void };
  /** Optional slot rendered below the steps (e.g. import cards for overview) */
  children?: React.ReactNode;
}

export function TabLanding({
  icon: Icon,
  title,
  subtitle,
  features,
  steps,
  cta,
  ctaSecondary,
  children,
}: TabLandingProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6" style={{ animation: "dm-fade-up 0.28s ease both" }}>

      {/* ── Hero ── */}
      <div
        className="rounded-xl border p-6 text-center sm:p-8"
        style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
      >
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "var(--dm-brand-50)" }}
        >
          <Icon size={28} style={{ color: "var(--dm-brand-500)" }} />
        </div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--dm-text-primary)" }}>
          {title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--dm-text-secondary)" }}>
          {subtitle}
        </p>
      </div>

      {/* ── Features ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.label}
            className="flex flex-col gap-3 rounded-xl border p-4"
            style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: "var(--dm-bg-elevated)" }}
            >
              <f.icon size={16} style={{ color: "var(--dm-brand-500)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>{f.label}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: "var(--dm-text-secondary)" }}>
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Steps ── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--dm-bg-surface)", borderColor: "var(--dm-border-default)" }}
      >
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--dm-text-tertiary)" }}>
          Como funciona
        </p>
        <div className="flex flex-col gap-0 sm:flex-row sm:gap-0">
          {steps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-1 flex-col gap-1.5 sm:items-center sm:text-center">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white sm:mx-auto"
                  style={{ backgroundColor: "var(--dm-brand-500)" }}
                >
                  {i + 1}
                </div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--dm-text-primary)" }}>{step.label}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--dm-text-secondary)" }}>
                  {step.description}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center justify-center px-3 py-2 sm:py-0">
                  <ArrowRight size={14} style={{ color: "var(--dm-text-tertiary)" }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Optional children slot (e.g. import cards) ── */}
      {children}

      {/* ── CTA buttons (rendered only if no children, or as footer when children present) ── */}
      {!children && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={cta.onClick}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--dm-brand-500)" }}
          >
            {cta.label}
          </button>
          {ctaSecondary && (
            <button
              type="button"
              onClick={ctaSecondary.onClick}
              className="flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:opacity-80"
              style={{
                borderColor: "var(--dm-border-default)",
                color: "var(--dm-text-secondary)",
                backgroundColor: "var(--dm-bg-surface)",
              }}
            >
              {ctaSecondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
