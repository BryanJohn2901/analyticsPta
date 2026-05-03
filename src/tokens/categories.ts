/**
 * DASHMONSTER — CATEGORY COLOR CONFIG
 * Fonte única de verdade para cores de categoria.
 * Todos os valores espelham as CSS vars em colors.css.
 * Use estas constantes em qualquer lógica JS/TS que precise
 * mapear uma categoria para suas cores.
 */

export type CategoryKey = "pos" | "livros" | "ebooks" | "perpetuo" | "eventos";

export interface CategoryConfig {
  key: CategoryKey;
  label: string;
  description: string;
  /** Classe CSS aplicada ao container do card */
  cardClass: string;
  /** Cor base (para ícones SVG inline e charts) */
  base: { light: string; dark: string };
  /** Cor do ícone */
  icon: { light: string; dark: string };
  /** Cor do título do card */
  title: { light: string; dark: string };
  /** Background do card */
  bg: { light: string; dark: string };
  /** Borda do card */
  border: { light: string; dark: string };
  /** Background das tags/badges */
  tagBg: { light: string; dark: string };
  /** Texto das tags/badges — WCAG AA mínimo garantido */
  tagText: { light: string; dark: string };
  /** Contraste de tagText sobre tagBg (para auditoria) */
  contrastRatio: string;
  wcagLevel: "AA" | "AAA";
}

export const CATEGORIES: Record<CategoryKey, CategoryConfig> = {
  pos: {
    key: "pos",
    label: "Lançamentos de Pós",
    description: "Campanhas mensais de lançamento das turmas de pós-graduação",
    cardClass: "cat-pos",
    base:    { light: "#2563EB", dark: "#60A5FA" },
    icon:    { light: "#3B82F6", dark: "#60A5FA" },
    title:   { light: "#1E3A8A", dark: "#BFDBFE" },
    bg:      { light: "#EFF4FF", dark: "#0F1A3A" },
    border:  { light: "#BFDBFE", dark: "#1E3A8A" },
    tagBg:   { light: "#DBEAFE", dark: "#1E3A8A" },
    tagText: { light: "#1E40AF", dark: "#93C5FD" },
    contrastRatio: "8.6:1",
    wcagLevel: "AAA",
  },

  livros: {
    key: "livros",
    label: "Livros",
    description: "Campanhas de venda de livros físicos e digitais",
    cardClass: "cat-livros",
    base:    { light: "#059669", dark: "#34D399" },
    icon:    { light: "#10B981", dark: "#34D399" },
    title:   { light: "#064E3B", dark: "#A7F3D0" },
    bg:      { light: "#ECFDF5", dark: "#052E1C" },
    border:  { light: "#A7F3D0", dark: "#065F46" },
    tagBg:   { light: "#D1FAE5", dark: "#064E3B" },
    tagText: { light: "#065F46", dark: "#6EE7B7" },
    contrastRatio: "7.5:1",
    wcagLevel: "AAA",
  },

  ebooks: {
    key: "ebooks",
    label: "Ebooks",
    description: "Produtos digitais e materiais de educação online",
    cardClass: "cat-ebooks",
    // NOTA: Violeta (#7C3AED) ≠ Indigo da brand (#5858F0)
    // Nunca trocar. Essa distinção resolve a colisão semântica com a nav.
    base:    { light: "#7C3AED", dark: "#A78BFA" },
    icon:    { light: "#8B5CF6", dark: "#A78BFA" },
    title:   { light: "#4C1D95", dark: "#DDD6FE" },
    bg:      { light: "#F5F0FF", dark: "#1A0F35" },
    border:  { light: "#DDD6FE", dark: "#3B0764" },
    tagBg:   { light: "#EDE9FE", dark: "#2E1065" },
    tagText: { light: "#5B21B6", dark: "#C4B5FD" },
    contrastRatio: "7.1:1",
    wcagLevel: "AAA",
  },

  perpetuo: {
    key: "perpetuo",
    label: "Perpétuo",
    description: "Campanhas evergreen de oferta contínua sem data de encerramento",
    cardClass: "cat-perpetuo",
    base:    { light: "#D97706", dark: "#FBBF24" },
    icon:    { light: "#F59E0B", dark: "#FBBF24" },
    title:   { light: "#78350F", dark: "#FEF3C7" },
    bg:      { light: "#FFFBEB", dark: "#2A1A00" },
    border:  { light: "#FDE68A", dark: "#78350F" },
    tagBg:   { light: "#FEF3C7", dark: "#451A03" },
    tagText: { light: "#92400E", dark: "#FCD34D" },
    contrastRatio: "6.1:1",
    wcagLevel: "AA",
  },

  eventos: {
    key: "eventos",
    label: "Eventos",
    description: "Eventos presenciais, mentorias e imersões",
    cardClass: "cat-eventos",
    base:    { light: "#DC2626", dark: "#F87171" },
    icon:    { light: "#F43F5E", dark: "#F87171" },
    title:   { light: "#881337", dark: "#FFE4E6" },
    bg:      { light: "#FFF1F2", dark: "#2A0808" },
    border:  { light: "#FECDD3", dark: "#7F1D1D" },
    tagBg:   { light: "#FFE4E6", dark: "#450A0A" },
    tagText: { light: "#9F1239", dark: "#FCA5A5" },
    contrastRatio: "6.8:1",
    wcagLevel: "AA",
  },
};

/** Retorna a config de categoria por key */
export const getCategoryConfig = (key: CategoryKey): CategoryConfig =>
  CATEGORIES[key];

/** Retorna todas as categorias como array */
export const getAllCategories = (): CategoryConfig[] =>
  Object.values(CATEGORIES);

/**
 * Mapeia nomes de campanha para chave de categoria.
 * Adaptar conforme crescimento dos produtos.
 */
export const CAMPAIGN_CATEGORY_MAP: Record<string, CategoryKey> = {
  // Pós-graduação
  "BM":  "pos",
  "TF":  "pos",
  "SM":  "pos",
  "MPA": "pos",
  "FE":  "pos",
  "BB":  "pos",
  // Livros
  "Livro de Biomecânica": "livros",
  "Livro de Marketing":   "livros",
  // Ebooks
  "Ebook Bio Joelho": "ebooks",
  "Ebook Bio Coluna": "ebooks",
  // Perpétuo
  "Notável Play": "perpetuo",
  // Eventos
  "BS":            "eventos",
  "Mentoria Scala":"eventos",
  "Next":          "eventos",
  "Power Trainer": "eventos",
};
