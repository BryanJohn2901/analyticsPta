"use client";

import { useMemo } from "react";
import { ImageIcon, Info, MousePointerClick, ShoppingCart } from "lucide-react";
import { AggregatedCampaign } from "@/types/campaign";
import { formatCurrency, formatPercent } from "@/utils/metrics";

interface BestCreativesProps {
  campaigns: AggregatedCampaign[];
}

interface CreativeRowProps {
  rank: number;
  campaign: AggregatedCampaign;
  highlight: string;
  highlightValue: string;
}

function CreativeRow({ rank, campaign: c, highlight, highlightValue }: CreativeRowProps) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rank === 1 ? "bg-amber-100 text-amber-700" : rank === 2 ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-500"}`}>
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800">{c.campaignName}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
          <span>CTR: {formatPercent(c.ctr)}</span>
          <span>Conv.: {formatPercent(c.conversionRate)}</span>
          <span>ROAS: {c.roas.toFixed(2)}x</span>
          <span>CPA: {c.conversions > 0 ? formatCurrency(c.cpa) : "—"}</span>
        </div>
      </div>
      <div className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-right">
        <p className="text-xs text-blue-500">{highlight}</p>
        <p className="text-sm font-bold text-blue-700">{highlightValue}</p>
      </div>
    </li>
  );
}

export function BestCreatives({ campaigns }: BestCreativesProps) {
  const byCtr = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.impressions > 500)
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 8),
    [campaigns],
  );

  const byConversion = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.clicks > 50 && c.conversions > 0)
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 8),
    [campaigns],
  );

  return (
    <div className="space-y-4">
      <article className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Proxy de criativos:</span> os dados atuais não têm o nome do criativo (imagem/vídeo) individualmente — a análise usa o nome da campanha como referência. Para ver performance por criativo real, será necessário adicionar uma coluna <code className="rounded bg-blue-100 px-1">Nome do Criativo</code> no CSV ou conectar via API do Meta/Google Ads.
        </p>
      </article>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MousePointerClick size={17} className="text-blue-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Maior CTR</h3>
              <p className="text-xs text-slate-500">Criativos que mais geram cliques</p>
            </div>
          </div>
          {byCtr.length === 0 ? (
            <p className="text-xs text-slate-400">Dados insuficientes para este filtro.</p>
          ) : (
            <ol className="space-y-2">
              {byCtr.map((c, idx) => (
                <CreativeRow
                  key={c.campaignName}
                  rank={idx + 1}
                  campaign={c}
                  highlight="CTR"
                  highlightValue={formatPercent(c.ctr)}
                />
              ))}
            </ol>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart size={17} className="text-violet-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Melhor Conversão</h3>
              <p className="text-xs text-slate-500">Criativos que mais convertem em vendas</p>
            </div>
          </div>
          {byConversion.length === 0 ? (
            <p className="text-xs text-slate-400">Dados insuficientes para este filtro.</p>
          ) : (
            <ol className="space-y-2">
              {byConversion.map((c, idx) => (
                <CreativeRow
                  key={c.campaignName}
                  rank={idx + 1}
                  campaign={c}
                  highlight="Tx. Conv."
                  highlightValue={formatPercent(c.conversionRate)}
                />
              ))}
            </ol>
          )}
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <ImageIcon size={17} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Próximos passos para análise de criativos reais</h3>
        </div>
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-medium">1</span>
            <span><span className="font-medium">Via CSV:</span> adicione as colunas <code className="rounded bg-slate-100 px-1">Nome do Criativo</code> e <code className="rounded bg-slate-100 px-1">ID do Criativo</code> na planilha. O dashboard agrupará os dados por criativo automaticamente.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-medium">2</span>
            <span><span className="font-medium">Via API:</span> conectar diretamente com a API do Meta Ads ou Google Ads permite puxar nomes de anúncios, thumbnails e métricas por variação criativa em tempo real.</span>
          </li>
        </ul>
      </article>
    </div>
  );
}
