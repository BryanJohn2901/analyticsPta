import { ProductCategory } from "@/types/campaign";

// ─── Normalization ────────────────────────────────────────────────────────────

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ─── Category classification ──────────────────────────────────────────────────
//
// Precedence (top → bottom wins):
//   1. Livros    — "livro"
//   2. Ebooks    — "ebook"
//   3. Eventos   — exact known campaign names: BS, Next, Mentoria Scala, Power Trainer
//   4. Pós Grad  — course keywords + abbreviations: BM, TF, SM, BB, FE, MPA
//   5. Perpétuo  — everything else (Notável Play, etc.)

export function classifyCampaign(name: string): ProductCategory {
  const n = norm(name);

  if (/livro/.test(n)) return "livros";
  if (/ebook/.test(n)) return "ebooks";
  if (/\bbs\b|mentoria.?scala|\bnext\b|power.?trainer/.test(n)) return "eventos";
  if (/pos.?em|\bmpa\b|biomecan|bodybuil|fisiolog|funcional|saude|feminino|muscula|\bbm\b|\btf\b|\bsm\b|\bbb\b|\bfe\b/.test(n))
    return "pos";

  return "perpetuo";
}

// ─── Course group within Pós Grad ─────────────────────────────────────────────
//
// Returns the sidebar-group id ("biomecanica" | "musculacao" | …)
// or "" if the campaign doesn't belong to any recognised course.

export function classifyCourse(name: string): string {
  const n = norm(name);
  if (n.includes("biomecan") || /\bbm\b/.test(n))                   return "biomecanica";
  if (n.includes("muscula") || n.includes("mpa"))                    return "musculacao";
  if (n.includes("fisiolog") || /\bfe\b/.test(n))                   return "fisiologia";
  if (n.includes("bodybuil") || /\bbb\b/.test(n))                   return "bodybuilding";
  if (n.includes("femin") || n.includes("saude") || /\bsm\b/.test(n)) return "feminino";
  if (n.includes("funcional") || /\btf\b/.test(n))                  return "funcional";
  return "";
}
