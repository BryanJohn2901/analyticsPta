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
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <div
            className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{ backgroundColor: "var(--dm-brand-500)" }}
          >
            <GraduationCap size={26} style={{ color: "var(--dm-text-inverse)" }} />
          </div>
          <h1
            className="text-2xl font-bold sm:text-3xl"
            style={{ color: "var(--dm-text-primary)" }}
          >
            O que você quer analisar?
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dm-text-secondary)" }}>
            Escolha a categoria de campanha para ver apenas os dados relevantes
          </p>
        </div>

        {/* 5 cards — responsive grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_CONFIGS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className="dm-cat-card group relative flex flex-col rounded-xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                backgroundColor: "var(--dm-bg-surface)",
                borderColor: "var(--dm-border-default)",
                "--dm-cat-card-hover-border": "var(--dm-brand-500)",
              } as React.CSSProperties}
            >
              {/* Icon */}
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--dm-bg-elevated)" }}
              >
                <cat.icon size={18} style={{ color: cat.vars.base }} />
              </div>

              {/* Title + description */}
              <p className="text-sm font-semibold" style={{ color: "var(--dm-text-primary)" }}>{cat.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--dm-text-secondary)" }}>
                {cat.description}
              </p>

              {/* Tags — neutral */}
              <div className="mt-3 flex flex-wrap gap-1">
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

              {/* Blue hover indicator */}
              <span
                className="absolute right-4 top-4 h-2 w-2 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ backgroundColor: "var(--dm-brand-500)" }}
              />
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
          Você pode trocar a categoria a qualquer momento pelo cabeçalho do dashboard
        </p>
      </div>
    </div>
  );
}
