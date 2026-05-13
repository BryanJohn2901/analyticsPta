"use client";

import { useState } from "react";
import {
  TrendingUp, Settings2, CheckCircle2, BarChart2, Target,
  Sparkles, X, ChevronRight,
} from "lucide-react";

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: TrendingUp,
    iconBg: "bg-blue-50 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "Bem-vindo ao DashMonster",
    subtitle: "A central de métricas para todas as suas campanhas de anúncio — em um só lugar.",
    features: [
      { icon: BarChart2, label: "KPIs em tempo real",     desc: "ROAS, CPA, CTR, CPC e muito mais, sempre atualizados." },
      { icon: Target,    label: "Análise por campanha",   desc: "Compare campanhas e identifique as que mais convertem." },
      { icon: Sparkles,  label: "Criativos & insights",   desc: "Veja quais criativos geram mais resultado." },
    ],
  },
  {
    icon: Settings2,
    iconBg: "bg-violet-50 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "Configure no Painel de Controle",
    subtitle: "Tudo sobre suas contas e categorias fica no ⚙️ — acesse a qualquer momento pelo botão no canto superior direito.",
    features: [
      { icon: Settings2,   label: "Contas Meta Ads",         desc: "Vincule contas de anúncio por categoria (Pós-grad., Livros, etc.)." },
      { icon: Target,      label: "Categorias personalizadas", desc: "Crie até 3 categorias com nome e emoji próprios." },
      { icon: CheckCircle2, label: "Salvo na sua conta",      desc: "Configurações ficam no Supabase — acessíveis em qualquer device." },
    ],
  },
  {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "Tudo pronto para começar!",
    subtitle: "Vamos abrir o Painel de Controle para você conectar sua primeira conta de anúncio.",
    features: [],
  },
] as const;

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const advance = () => {
    if (isLast) { onComplete(); return; }
    setStep(s => s + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--dm-bg-surface)",
          border: "1px solid var(--dm-border-default)",
          animation: "dm-fade-up 0.3s ease both",
        }}
      >
        {/* Skip */}
        <button
          onClick={onComplete}
          className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition hover:opacity-70"
          style={{ color: "var(--dm-text-tertiary)" }}
        >
          Pular <X size={12} />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-0 px-5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? "2rem" : "0.5rem",
                backgroundColor: i === step
                  ? "var(--dm-brand-500)"
                  : "var(--dm-border-default)",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-5" key={step} style={{ animation: "dm-fade-up 0.25s ease both" }}>
          {/* Icon */}
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${slide.iconBg}`}>
            <slide.icon size={26} className={slide.iconColor} />
          </div>

          {/* Title + subtitle */}
          <div className="text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--dm-text-primary)" }}>
              {slide.title}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--dm-text-secondary)" }}>
              {slide.subtitle}
            </p>
          </div>

          {/* Feature list */}
          {slide.features.length > 0 && (
            <div className="space-y-2.5 rounded-xl border p-4"
              style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
              {slide.features.map(f => (
                <div key={f.label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "var(--dm-bg-surface)" }}>
                    <f.icon size={13} style={{ color: "var(--dm-brand-500)" }} />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--dm-text-primary)" }}>{f.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Last slide: visual hint */}
          {isLast && (
            <div className="rounded-xl border p-4 text-center"
              style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
              <p className="text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
                Você pode reabrir o Painel a qualquer momento clicando em
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5"
                style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-surface)" }}>
                <Settings2 size={13} style={{ color: "var(--dm-brand-500)" }} />
                <span className="text-[12px] font-semibold" style={{ color: "var(--dm-text-primary)" }}>
                  Painel de Controle
                </span>
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
                no canto superior direito do dashboard.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-8 py-4"
          style={{ borderColor: "var(--dm-border-default)" }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)}
              className="text-xs font-medium transition hover:opacity-70"
              style={{ color: "var(--dm-text-tertiary)" }}>
              ← Voltar
            </button>
          ) : <span />}

          <button
            onClick={advance}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--dm-brand-500)" }}
          >
            {isLast ? (
              <>
                <Settings2 size={13} />
                Abrir Painel de Controle
              </>
            ) : (
              <>
                Próximo
                <ChevronRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
