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
//   4. Pós Grad  — course keywords: biomecan, bodybuil, fisiolog, funcional, saude, feminino, muscula, mpa
//   5. Perpétuo  — everything else (Notável Play, etc.)

export function classifyCampaign(name: string): ProductCategory {
  const n = norm(name);

  if (/livro/.test(n)) return "livros";
  if (/ebook/.test(n)) return "ebooks";
  if (/\bbs\b|mentoria.?scala|\bnext\b|power.?trainer/.test(n)) return "eventos";
  if (/pos.?em|\bmpa\b|biomecan|bodybuil|fisiolog|funcional|saude|feminino|muscula/.test(n))
    return "pos";

  return "perpetuo";
}

// ─── Course group within Pós Grad ─────────────────────────────────────────────
//
// Returns the sidebar-group id ("biomecanica" | "musculacao" | …)
// or "" if the campaign doesn't belong to any recognised course.

export function classifyCourse(name: string): string {
  const n = norm(name);
  if (n.includes("biomecan"))                          return "biomecanica";
  if (n.includes("muscula") || n.includes("mpa"))     return "musculacao";
  if (n.includes("fisiolog"))                         return "fisiologia";
  if (n.includes("bodybuil"))                         return "bodybuilding";
  if (n.includes("femin") || n.includes("saude"))     return "feminino"; // SM → Trein. Feminino
  if (n.includes("funcional"))                        return "funcional";
  return "";
}
