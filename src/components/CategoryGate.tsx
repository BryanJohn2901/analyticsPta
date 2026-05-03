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
  cls: {
    card: string; border: string; hoverBorder: string;
    iconBg: string; iconColor: string;
    title: string; tagBg: string; tagText: string;
    dot: string;
  };
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    id: "pos",
    label: "Lançamentos de Pós",
    description: "Campanhas mensais de lançamento das turmas de pós-graduação",
    icon: GraduationCap,
    tags: ["Biomecânica (BM)", "Trein. Funcional (TF)", "Trein. Feminino (SM)", "Musculação (MPA)", "Fisiologia (FE)", "Bodybuilding (BB)"],
    cls: {
      card: "bg-blue-50/80", border: "border-blue-100", hoverBorder: "hover:border-blue-400",
      iconBg: "bg-blue-100", iconColor: "text-blue-600",
      title: "text-blue-900", tagBg: "bg-blue-100", tagText: "text-blue-700",
      dot: "bg-blue-500",
    },
  },
  {
    id: "livros",
    label: "Livros",
    description: "Campanhas de venda de livros físicos e digitais",
    icon: BookMarked,
    tags: ["Livro de Biomecânica", "Livro de Marketing"],
    cls: {
      card: "bg-emerald-50/80", border: "border-emerald-100", hoverBorder: "hover:border-emerald-400",
      iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
      title: "text-emerald-900", tagBg: "bg-emerald-100", tagText: "text-emerald-700",
      dot: "bg-emerald-500",
    },
  },
  {
    id: "ebooks",
    label: "Ebooks",
    description: "Produtos digitais e materiais de educação online",
    icon: FileText,
    tags: ["Ebook Bio Joelho", "Ebook Bio Coluna"],
    cls: {
      card: "bg-violet-50/80", border: "border-violet-100", hoverBorder: "hover:border-violet-400",
      iconBg: "bg-violet-100", iconColor: "text-violet-600",
      title: "text-violet-900", tagBg: "bg-violet-100", tagText: "text-violet-700",
      dot: "bg-violet-500",
    },
  },
  {
    id: "perpetuo",
    label: "Perpétuo",
    description: "Campanhas evergreen de oferta contínua sem data de encerramento",
    icon: Repeat,
    tags: ["Notável Play"],
    cls: {
      card: "bg-amber-50/80", border: "border-amber-100", hoverBorder: "hover:border-amber-400",
      iconBg: "bg-amber-100", iconColor: "text-amber-600",
      title: "text-amber-900", tagBg: "bg-amber-100", tagText: "text-amber-700",
      dot: "bg-amber-500",
    },
  },
  {
    id: "eventos",
    label: "Eventos",
    description: "Eventos presenciais, mentorias e imersões",
    icon: CalendarDays,
    tags: ["BS", "Mentoria Scala", "Next", "Power Trainer"],
    cls: {
      card: "bg-rose-50/80", border: "border-rose-100", hoverBorder: "hover:border-rose-400",
      iconBg: "bg-rose-100", iconColor: "text-rose-600",
      title: "text-rose-900", tagBg: "bg-rose-100", tagText: "text-rose-700",
      dot: "bg-rose-500",
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

export const CATEGORY_DOT: Record<ProductCategory, string> = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.id, c.cls.dot]),
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
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-blue-200">
            <GraduationCap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            O que você quer analisar?
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Escolha a categoria de campanha para ver apenas os dados relevantes
          </p>
        </div>

        {/* 5 cards — responsive grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_CONFIGS.map((cat) => {
            const c = cat.cls;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className={`group relative flex flex-col rounded-2xl border-2 ${c.card} ${c.border} ${c.hoverBorder} p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-800/60 dark:border-slate-700 dark:hover:border-slate-500`}
              >
                {/* Icon */}
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${c.iconBg} dark:opacity-80`}>
                  <cat.icon size={20} className={c.iconColor} />
                </div>

                {/* Title + description */}
                <p className={`text-sm font-bold ${c.title} dark:text-slate-100`}>{cat.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{cat.description}</p>

                {/* Example tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cat.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.tagBg} ${c.tagText} dark:opacity-80`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Hover indicator */}
                <span
                  className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${c.dot} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
                />
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Você pode trocar a categoria a qualquer momento pelo cabeçalho do dashboard
        </p>
      </div>
    </div>
  );
}
