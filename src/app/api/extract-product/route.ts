import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const EXTRACTION_PROMPT = `
Você é um extrator de dados de produtos de educação física e esportes.
Analise este documento — pode ser uma imagem de tela (print do Milanote) ou um PDF.
O documento contém informações sobre um produto educacional (pós-graduação ou imersão).

Extraia as informações e retorne SOMENTE um JSON válido, sem markdown, sem texto adicional.

Estrutura esperada:
{
  "nome": string | null,
  "expert": string | null,
  "promessa": string | null,
  "subPromessas": string[] | null,
  "coProdutores": string | null,
  "coordenador": string | null,
  "debateProduto": string | null,
  "palavrasChave": string[] | null,
  "descricaoAvatar": string | null,
  "oQueVaiAprender": string[] | null,
  "temaAulaInaugural": string | null,
  "valorBase": string | null,
  "lotes": [{ "label": string, "valor": string, "promo": string }] | null,
  "paraQuemE": string | null,
  "doresESolucoes": [{ "dor": string, "solucao": string }] | null,
  "receitaTecnica": string | null,
  "paginaCaptura": string | null,
  "paginaVendas": string | null
}

Instruções:
- "nome": nome completo do produto/curso
- "expert": nome do especialista/professor principal (campo NOME DO EXPERT ou similar)
- "promessa": texto do campo PROMESSA (a grande transformação que o produto entrega)
- "subPromessas": lista de sub-promessas — textos do campo SUB PROMESSA
- "coProdutores": nomes no campo CO-PRODUTORES
- "coordenador": nome no campo COORDENADOR DO POS
- "palavrasChave": lista de palavras do campo PALAVRAS CHAVES
- "descricaoAvatar": descrição completa do avatar/persona
- "oQueVaiAprender": cada item da lista "O QUE VAI APRENDER"
- "temaAulaInaugural": texto do campo TEMA DA AULA INAUGURAL
- "valorBase": valor do campo VALOR (ex: "R$ 2.000,00")
- "lotes": linhas da tabela LOTES com valor e promoção por lote
- "paraQuemE": texto do campo PARA QUEM É
- "doresESolucoes": pares da tabela DORES E SOLUÇÕES
- "receitaTecnica": texto da RECEITA TÉCNICA
- "paginaCaptura": URL da página de captura
- "paginaVendas": URL da página de vendas

Se um campo não estiver visível ou legível no documento, use null.
Retorne APENAS o JSON. Nenhum texto antes ou depois.
`.trim();

// ─── POST /api/extract-product ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json() as { dataUrl: string; mimeType: string };
    const { dataUrl, mimeType } = body;

    if (!dataUrl || !mimeType) {
      return NextResponse.json({ error: "dataUrl e mimeType são obrigatórios." }, { status: 400 });
    }

    // Strip the "data:<mime>;base64," prefix
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      { inlineData: { data: base64, mimeType } },
    ]);

    const raw = result.response.text().trim();

    // Parse JSON — strip any accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(clean);
    } catch {
      // Try to grab JSON substring
      const match = clean.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Resposta da IA não contém JSON válido.");
      extracted = JSON.parse(match[0]);
    }

    return NextResponse.json({ ok: true, data: extracted });
  } catch (err) {
    console.error("[extract-product]", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
