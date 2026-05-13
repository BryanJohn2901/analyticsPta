"use client";

import { BookMarked, CalendarDays, FileText, GraduationCap, Repeat } from "lucide-react";
import { ProductCategory } from "@/types/campaign";

// ─── Category definitions ─────────────────────────────────────────────────────

interface CategoryConfig {
  id: ProductCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  tags: string[];
  /** CSS custom property values — auto-switch light/dark via globals.css */
  vars: {
    bg: string;
    border: string;
    hoverBorder: string;
    iconBg: string;
    icon: string;
    title: string;
    tagBg: string;
    tagText: string;
    base: string;
  };
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    id: "pos",
    label: "Lançamentos de Pós",
    description: "Campanhas mensais de lançamento das turmas de pós-graduação",
    icon: GraduationCap,
    tags: ["Biomecânica (BM)", "Trein. Funcional (TF)", "Trein. Feminino (SM)", "Musculação (MPA)", "Fisiologia (FE)", "Bodybuilding (BB)"],
    vars: {
      bg:          "var(--dm-cat-pos-bg)",
      border:      "var(--dm-cat-pos-border)",
      hoverBorder: "var(--dm-cat-pos-base)",
      iconBg:      "var(--dm-cat-pos-tag-bg)",
      icon:        "var(--dm-cat-pos-icon)",
      title:       "var(--dm-cat-pos-title)",
      tagBg:       "var(--dm-cat-pos-tag-bg)",
      tagText:     "var(--dm-cat-pos-tag-text)",
      base:        "var(--dm-cat-pos-base)",
    },
  },
  {
    id: "livros",
    label: "Livros",
    description: "Campanhas de venda de livros físicos e digitais",
    icon: BookMarked,
    tags: ["Livro de Biomecânica", "Livro de Marketing"],
    vars: {
      bg:          "var(--dm-cat-livros-bg)",
      border:      "var(--dm-cat-livros-border)",
      hoverBorder: "var(--dm-cat-livros-base)",
      iconBg:      "var(--dm-cat-livros-tag-bg)",
      icon:        "var(--dm-cat-livros-icon)",
      title:       "var(--dm-cat-livros-title)",
      tagBg:       "var(--dm-cat-livros-tag-bg)",
      tagText:     "var(--dm-cat-livros-tag-text)",
      base:        "var(--dm-cat-livros-base)",
    },
  },
  {
    id: "ebooks",
    label: "Ebooks",
    description: "Produtos digitais e materiais de educação online",
    icon: FileText,
    tags: ["Ebook Bio Joelho", "Ebook Bio Coluna"],
    // NOTA: Violeta (--dm-cat-ebooks-*) ≠ Indigo da brand (--dm-brand-*)
    // Nunca trocar. Distinção intencional.
    vars: {
      bg:          "var(--dm-cat-ebooks-bg)",
      border:      "var(--dm-cat-ebooks-border)",
      hoverBorder: "var(--dm-cat-ebooks-base)",
      iconBg:      "var(--dm-cat-ebooks-tag-bg)",
      icon:        "var(--dm-cat-ebooks-icon)",
      title:       "var(--dm-cat-ebooks-title)",
      tagBg:       "var(--dm-cat-ebooks-tag-bg)",
      tagText:     "var(--dm-cat-ebooks-tag-text)",
      base:        "var(--dm-cat-ebooks-base)",
    },
  },
  {
    id: "perpetuo",
    label: "Perpétuo",
    description: "Campanhas evergreen de oferta contínua sem data de encerramento",
    icon: Repeat,
    tags: ["Notável Play"],
    vars: {
      bg:          "var(--dm-cat-perpetuo-bg)",
      border:      "var(--dm-cat-perpetuo-border)",
      hoverBorder: "var(--dm-cat-perpetuo-base)",
      iconBg:      "var(--dm-cat-perpetuo-tag-bg)",
      icon:        "var(--dm-cat-perpetuo-icon)",
      title:       "var(--dm-cat-perpetuo-title)",
      tagBg:       "var(--dm-cat-perpetuo-tag-bg)",
      tagText:     "var(--dm-cat-perpetuo-tag-text)",
      base:        "var(--dm-cat-perpetuo-base)",
    },
  },
  {
    id: "eventos",
    label: "Eventos",
    description: "Eventos presenciais, mentorias e imersões",
    icon: CalendarDays,
    tags: ["Biomechanic Specialist", "Mentoria Scala", "Next", "Power Trainer"],
    vars: {
      bg:          "var(--dm-cat-eventos-bg)",
      border:      "var(--dm-cat-eventos-border)",
      hoverBorder: "var(--dm-cat-eventos-base)",
      iconBg:      "var(--dm-cat-eventos-tag-bg)",
      icon:        "var(--dm-cat-eventos-icon)",
      title:       "var(--dm-cat-eventos-title)",
      tagBg:       "var(--dm-cat-eventos-tag-bg)",
      tagText:     "var(--dm-cat-eventos-tag-text)",
      base:        "var(--dm-cat-eventos-base)",
    },
  },
];

// ─── Lookup maps (re-exported for header chip) ────────────────────────────────

export const CATEGORY_LABEL: Record<ProductCategory, string> = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.id, c.label]),
) as Record<ProductCategory, string>;

export const CATEGORY_ICON: Record<ProductCategory, React.ElementType> = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.id, c.icon]),
) as Record<ProductCategory, React.ElementType>;

/** Returns a CSS var string for the category base color — use with style={{ backgroundColor: dot }} */
export const CATEGORY_DOT: Record<ProductCategory, string> = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.id, c.vars.base]),
) as Record<ProductCategory, string>;

// ─── Gate component ───────────────────────────────────────────────────────────

interface CategoryGateProps {
  onSelect: (cat: ProductCategory) => void;
}

export function CategoryGate({ onSelect }: CategoryGateProps) {
  return (
    <div className="flex min-h-[min(70vh,560px)] flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="mb-8 text-center sm:mb-10">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-secondary)" }}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "var(--dm-brand-500)" }}>1</span>
            Passo 1 de 2 — área de negócio
          </p>
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{ backgroundColor: "var(--dm-brand-500)" }}
          >
            <GraduationCap size={28} style={{ color: "var(--dm-text-inverse)" }} />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: "var(--dm-text-primary)" }}
          >
            Que tipo de campanhas quer ver primeiro?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed" style={{ color: "var(--dm-text-secondary)" }}>
            Cada cartão agrupa um conjunto de cursos e métricas. Pode mudar mais tarde pelo canto superior do dashboard.
          </p>
        </div>

        {/* Cards — responsive grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_CONFIGS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className="dm-cat-card group relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                backgroundColor: "var(--dm-bg-surface)",
                borderColor: "var(--dm-border-default)",
                "--dm-cat-card-hover-border": "var(--dm-brand-500)",
              } as React.CSSProperties}
            >
              {/* Icon */}
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--dm-bg-elevated)" }}
              >
                <cat.icon size={20} style={{ color: cat.vars.base }} />
              </div>

              {/* Title + description */}
              <p className="text-[15px] font-semibold" style={{ color: "var(--dm-text-primary)" }}>{cat.label}</p>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--dm-text-secondary)" }}>
                {cat.description}
              </p>

              {/* Tags — neutral */}
              <div className="mt-4 flex flex-wrap gap-1">
                {cat.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-tertiary)" }}
                  >
                    {tag}
                  </span>
                ))}
                {cat.tags.length > 3 && (
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: "var(--dm-bg-elevated)", color: "var(--dm-text-tertiary)" }}
                  >
                    +{cat.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Hover indicator */}
              <span
                className="absolute right-4 top-4 h-2 w-2 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ backgroundColor: "var(--dm-brand-500)" }}
              />
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed" style={{ color: "var(--dm-text-tertiary)" }}>
          Dica: no telemóvel, use o menu ☰ para mudar de separador; no desktop, a categoria também aparece no topo ao lado do título da página.
        </p>
      </div>
    </div>
  );
}
