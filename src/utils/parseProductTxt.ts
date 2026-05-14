import {
  CourseGroupId, DorSolucao, Entregavel, EntregavelItem,
  Lote, PersonaSegmento, ProductData, ProductType, SubPromessa, TurmaLink,
} from "@/types/product";

// ─── Normalise string for comparison (remove accents, uppercase, trim) ────────

function n(s: string): string {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// ─── Section parser ───────────────────────────────────────────────────────────

function parseSections(text: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current = "";
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line.trimStart().startsWith("#")) {
      current = n(line.replace(/^#+\s*/, ""));
      sections[current] = [];
    } else if (current) {
      sections[current].push(line.trimStart());
    }
  }
  return sections;
}

/** Returns the first matching section (tries each key in order). */
function sec(sections: Record<string, string[]>, ...keys: string[]): string[] {
  for (const k of keys) {
    if (sections[n(k)]) return sections[n(k)];
  }
  return [];
}

/** Get the value for a "KEY: value" line inside a section. */
function kv(lines: string[], key: string): string {
  const nk = n(key);
  for (const line of lines) {
    const ci = line.indexOf(":");
    if (ci === -1) continue;
    if (n(line.slice(0, ci)) === nk) return line.slice(ci + 1).trim();
  }
  return "";
}

/** Collect bullet items after the line that starts with KEY:. */
function bullets(lines: string[], afterKey: string): string[] {
  const nk = n(afterKey);
  let collecting = false;
  const result: string[] = [];
  for (const line of lines) {
    if (!collecting) {
      const ci = line.indexOf(":");
      if (ci !== -1 && n(line.slice(0, ci)) === nk) { collecting = true; continue; }
    }
    if (collecting) {
      if (line.startsWith("-")) { result.push(line.slice(1).trim()); continue; }
      // Stop collecting if we hit a new KEY: line (not a bullet, not blank)
      if (line.trim() && !line.startsWith("-") && line.includes(":")) break;
    }
  }
  return result.filter(Boolean);
}

/** All bullet items anywhere in the section. */
function allBullets(lines: string[]): string[] {
  return lines.filter(l => l.startsWith("-")).map(l => l.slice(1).trim()).filter(Boolean);
}

/** All non-empty, non-bullet, non-key lines joined as multiline text. */
function freeText(lines: string[]): string {
  return lines
    .filter(l => l && !l.startsWith("-") && !l.match(/^[^:]+:/))
    .join("\n")
    .trim();
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseTxtTemplate(
  text: string,
): Partial<Omit<ProductData, "id" | "createdAt" | "updatedAt">> {
  const sections = parseSections(text);
  const result: Partial<Omit<ProductData, "id" | "createdAt" | "updatedAt">> = {};

  // ── IDENTIFICAÇÃO ────────────────────────────────────────────────────────────
  const id = sec(sections, "IDENTIFICAÇÃO", "IDENTIFICACAO", "IDENTIFICAÇÃO");
  const tipo = n(kv(id, "TIPO"));
  result.type = (tipo === "IMERSAO" ? "imersao" : "pos") as ProductType;
  result.nome = kv(id, "NOME");
  result.expert = kv(id, "EXPERT");
  result.turmaVinculada = kv(id, "TURMA VINCULADA") || undefined;
  const curso = n(kv(id, "CURSO"));
  const cursoMap: Record<string, CourseGroupId> = {
    BIOMECANICA: "biomecanica", BM: "biomecanica",
    MUSCULACAO: "musculacao",   MPA: "musculacao",
    FISIOLOGIA: "fisiologia",  FE: "fisiologia",
    BODYBUILDING: "bodybuilding", BB: "bodybuilding",
    FEMININO: "feminino", SM: "feminino",
    FUNCIONAL: "funcional", TF: "funcional",
  };
  if (cursoMap[curso]) result.courseGroup = cursoMap[curso];

  // ── PROMESSA ─────────────────────────────────────────────────────────────────
  const prom = sec(sections, "PROMESSA");
  result.promessa = kv(prom, "PRINCIPAL") || kv(prom, "PROMESSA PRINCIPAL") || freeText(prom.slice(0, 3));
  const subs = bullets(prom, "SUB-PROMESSAS");
  if (subs.length > 0)
    result.subPromessas = subs.map((t): SubPromessa => ({ id: crypto.randomUUID(), text: t }));

  // ── EQUIPE ───────────────────────────────────────────────────────────────────
  const eq = sec(sections, "EQUIPE");
  result.coProdutores     = kv(eq, "CO-PRODUTORES")       || kv(eq, "COPRODUTORES");
  result.coordenador      = kv(eq, "COORDENADOR");
  result.debateProduto    = kv(eq, "DEBATE DO PRODUTO")   || kv(eq, "DEBATE");
  result.profSlides       = kv(eq, "PROF. SLIDES")        || kv(eq, "PROF SLIDES");
  result.headMarketing    = kv(eq, "HEAD DE MARKETING")   || kv(eq, "HEAD MARKETING");
  result.liderLancamentos = kv(eq, "LIDER DE LANCAMENTOS")|| kv(eq, "LÍDER DE LANÇAMENTOS");
  result.designer         = kv(eq, "DESIGNER");
  result.editorVideo      = kv(eq, "EDITOR DE VIDEO")     || kv(eq, "EDITOR DE VÍDEO");
  result.socialMedia      = kv(eq, "SOCIAL MEDIA");
  result.gestorTrafego    = kv(eq, "GESTOR DE TRAFEGO")   || kv(eq, "GESTOR DE TRÁFEGO");
  result.webDesigner      = kv(eq, "WEB DESIGNER");

  // ── PALAVRAS-CHAVE ───────────────────────────────────────────────────────────
  const pkSec = sec(sections, "PALAVRAS-CHAVE", "PALAVRAS CHAVE");
  const pkLine = pkSec.find(l => l.trim() && !l.startsWith("#"));
  if (pkLine) result.palavrasChave = pkLine.split(",").map(s => s.trim()).filter(Boolean);

  // ── AVATAR ───────────────────────────────────────────────────────────────────
  const avatarSec = sec(sections, "AVATAR");
  result.descricaoAvatar = avatarSec.filter(Boolean).join("\n").trim();

  // ── PROPOSTA DE VALOR ────────────────────────────────────────────────────────
  const prop = sec(sections, "PROPOSTA DE VALOR", "PROPOSTA");
  const aprender = bullets(prop, "O QUE VAI APRENDER");
  if (aprender.length > 0) result.oQueVaiAprender = aprender;
  result.temaAulaInaugural = kv(prop, "TEMA AULA INAUGURAL");
  result.temaImersao       = kv(prop, "TEMA IMERSAO") || kv(prop, "TEMA DA IMERSAO");

  // ── PRECIFICAÇÃO ─────────────────────────────────────────────────────────────
  const prec = sec(sections, "PRECIFICAÇÃO", "PRECIFICACAO", "PRECOS", "PREÇOS");
  result.valorBase = kv(prec, "VALOR BASE");
  const loteBullets = allBullets(prec);
  if (loteBullets.length > 0) {
    result.lotes = loteBullets.map((l, i): Lote => {
      const parts = l.split("|").map(s => s.trim());
      return {
        id: crypto.randomUUID(),
        label: parts[0] || `Lote ${i + 1}`,
        valor: (parts[1] || "").replace(/[Rr]\$\s*/g, ""),
        promo: (parts[2] || "").replace(/promo:\s*/i, "").replace(/[Rr]\$\s*/g, ""),
      };
    });
  }

  // ── ENTREGÁVEIS ──────────────────────────────────────────────────────────────
  const entSec = sec(sections, "ENTREGÁVEIS", "ENTREGAVEIS");
  if (entSec.length > 0) {
    const entregaveis: Entregavel[] = [];
    let cur: Entregavel | null = null;
    for (const line of entSec) {
      if (!line.trim()) { continue; }
      const ci = line.indexOf(":");
      if (ci !== -1 && (n(line.slice(0, ci)) === "MODULO" || n(line.slice(0, ci)) === "MÓDULO")) {
        if (cur) entregaveis.push(cur);
        cur = { id: crypto.randomUUID(), titulo: line.slice(ci + 1).trim(), itens: [] };
      } else if (line.startsWith("-") && cur) {
        cur.itens.push({ id: crypto.randomUUID(), text: line.slice(1).trim() } as EntregavelItem);
      }
    }
    if (cur) entregaveis.push(cur);
    if (entregaveis.length > 0) result.entregaveis = entregaveis;
  }

  // ── BÔNUS ────────────────────────────────────────────────────────────────────
  const bonSec = sec(sections, "BONUS", "BÔNUS");
  const bonItems = allBullets(bonSec);
  if (bonItems.length > 0) result.bonus = bonItems;

  // ── PÚBLICO-ALVO ─────────────────────────────────────────────────────────────
  const pubSec = sec(sections, "PUBLICO-ALVO", "PÚBLICO-ALVO", "PUBLICO ALVO", "PÚBLICO ALVO");
  result.paraQuemE = kv(pubSec, "PARA QUEM E") || kv(pubSec, "PARA QUEM É");
  const segmentos: PersonaSegmento[] = [];
  let curSeg: PersonaSegmento | null = null;
  for (const line of pubSec) {
    if (!line.trim()) continue;
    const ci = line.indexOf(":");
    if (ci !== -1 && n(line.slice(0, ci)) === "SEGMENTO") {
      if (curSeg) segmentos.push(curSeg);
      curSeg = { id: crypto.randomUUID(), titulo: line.slice(ci + 1).trim(), pontos: "" };
    } else if (line.startsWith("-") && curSeg) {
      curSeg.pontos = curSeg.pontos ? `${curSeg.pontos}\n${line.slice(1).trim()}` : line.slice(1).trim();
    }
  }
  if (curSeg) segmentos.push(curSeg);
  if (segmentos.length > 0) result.sofrimentoPersona = segmentos;

  // ── DORES E SOLUÇÕES ─────────────────────────────────────────────────────────
  const dorSec = sec(sections, "DORES E SOLUCOES", "DORES E SOLUÇÕES", "DORES");
  if (dorSec.length > 0) {
    const dores: DorSolucao[] = [];
    let curDor: Partial<DorSolucao> | null = null;
    for (const line of dorSec) {
      if (!line.trim()) {
        if (curDor?.dor) { dores.push({ id: crypto.randomUUID(), dor: curDor.dor, solucao: curDor.solucao || "" }); curDor = null; }
        continue;
      }
      const ci = line.indexOf(":");
      if (ci === -1) continue;
      const k = n(line.slice(0, ci));
      const v = line.slice(ci + 1).trim();
      if (k === "DOR") {
        if (curDor?.dor) dores.push({ id: crypto.randomUUID(), dor: curDor.dor, solucao: curDor.solucao || "" });
        curDor = { dor: v, solucao: "" };
      } else if ((k === "SOLUCAO" || k === "SOLUÇÃO" || k === "OBJECAO" || k === "OBJEÇÃO") && curDor) {
        curDor.solucao = v;
      }
    }
    if (curDor?.dor) dores.push({ id: crypto.randomUUID(), dor: curDor.dor, solucao: curDor.solucao || "" });
    if (dores.length > 0) result.doresESolucoes = dores;
  }

  // ── RECEITA TÉCNICA ──────────────────────────────────────────────────────────
  const recSec = sec(sections, "RECEITA TECNICA", "RECEITA TÉCNICA", "RECEITA");
  result.receitaTecnica = recSec.filter(Boolean).join("\n").trim();

  // ── LINKS DE VENDA ───────────────────────────────────────────────────────────
  const lnkSec = sec(sections, "LINKS DE VENDA", "LINKS");
  result.paginaCaptura = kv(lnkSec, "CAPTURA");
  result.paginaVendas  = kv(lnkSec, "VENDAS");
  const turmaLines = lnkSec.filter(l => n(l.slice(0, l.indexOf(":")|| 0)) === "TURMA");
  if (turmaLines.length > 0) {
    result.linksVenda = turmaLines.map((l): TurmaLink => {
      const parts = l.slice(l.indexOf(":") + 1).split("|").map(s => s.trim());
      return { id: crypto.randomUUID(), turma: parts[0] || "", valor: (parts[1] || "").replace(/[Rr]\$\s*/g, ""), link: parts[2] || "" };
    });
  }

  return result;
}

// ─── Template TXT ─────────────────────────────────────────────────────────────

export const PRODUCT_TXT_TEMPLATE = `# IDENTIFICAÇÃO
TIPO: pos
NOME:
EXPERT:
CURSO: musculacao
TURMA VINCULADA:

# PROMESSA
PRINCIPAL:
SUB-PROMESSAS:
-
-

# EQUIPE
CO-PRODUTORES:
COORDENADOR:
HEAD DE MARKETING:
LIDER DE LANCAMENTOS:
DESIGNER:
EDITOR DE VIDEO:
SOCIAL MEDIA:
GESTOR DE TRAFEGO:
WEB DESIGNER:

# PALAVRAS-CHAVE
palavra1, palavra2, palavra3

# AVATAR
Descreva aqui o avatar do produto — quem é o aluno ideal, o que ele sente, deseja e teme.

# PROPOSTA DE VALOR
O QUE VAI APRENDER:
-
-
TEMA AULA INAUGURAL:

# PRECIFICAÇÃO
VALOR BASE: 997,00
LOTES:
- Lote 1 | 997,00 | promo: 897,00
- Lote 2 | 1.197,00 | promo: 1.097,00

# ENTREGÁVEIS
MODULO: Título do Módulo 1
- Item 1
- Item 2

MODULO: Título do Módulo 2
- Item 3

# BONUS
- Bônus 1
- Bônus 2

# PUBLICO-ALVO
PARA QUEM E:

SEGMENTO: Nome do Segmento 1
- Característica / dor desse segmento
- Outra característica

SEGMENTO: Nome do Segmento 2
- Característica

# DORES E SOLUCOES
DOR: Descreva a dor ou objeção
SOLUCAO: Como o produto resolve essa dor

DOR: Segunda dor
SOLUCAO: Solução correspondente

# RECEITA TECNICA
Descreva aqui: carga horária, certificação, formato das aulas, diferenciais...

# LINKS DE VENDA
TURMA: T1 | 997,00 | https://link-aqui.com
CAPTURA: https://
VENDAS: https://
`;

// ─── Summary of parsed fields (for UI feedback) ───────────────────────────────

export function summarizeParsed(
  data: Partial<Omit<ProductData, "id" | "createdAt" | "updatedAt">>,
): string[] {
  const lines: string[] = [];
  if (data.nome)               lines.push(`✅ Nome: ${data.nome}`);
  if (data.expert)             lines.push(`✅ Expert: ${data.expert}`);
  if (data.promessa)           lines.push(`✅ Promessa principal`);
  if (data.subPromessas?.length)  lines.push(`✅ ${data.subPromessas.length} sub-promessa(s)`);
  if (data.palavrasChave?.length) lines.push(`✅ ${data.palavrasChave.length} palavras-chave`);
  if (data.descricaoAvatar)    lines.push(`✅ Avatar preenchido`);
  if (data.oQueVaiAprender?.length) lines.push(`✅ ${data.oQueVaiAprender.length} aprendizados`);
  if (data.entregaveis?.length) lines.push(`✅ ${data.entregaveis.length} módulo(s) entregável`);
  if (data.bonus?.length)      lines.push(`✅ ${data.bonus.length} bônus`);
  if (data.sofrimentoPersona?.length) lines.push(`✅ ${data.sofrimentoPersona.length} segmento(s) de persona`);
  if (data.doresESolucoes?.length) lines.push(`✅ ${data.doresESolucoes.length} dore(s) & solução`);
  if (data.lotes?.length)      lines.push(`✅ ${data.lotes.length} lote(s)`);
  if (data.receitaTecnica)     lines.push(`✅ Receita técnica`);
  if (data.paginaCaptura || data.linksVenda?.length) lines.push(`✅ Links de venda`);
  return lines;
}
