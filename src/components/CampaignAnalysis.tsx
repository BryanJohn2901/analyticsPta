"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, XCircle, TrendingUp, ImageIcon,
  DollarSign, Globe, PauseCircle, Zap, Square, CheckSquare,
} from "lucide-react";
import { AggregatedCampaign } from "@/types/campaign";
import { CriticalPoints } from "@/components/CriticalPoints";
import { PositivePoints } from "@/components/PositivePoints";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/metrics";

interface CampaignAnalysisProps {
  campaigns: AggregatedCampaign[];
}

// ─── Task generation ──────────────────────────────────────────────────────────

type Priority = "alta" | "média" | "baixa";
type Category = "criativo" | "orçamento" | "landing" | "targeting" | "escalar" | "pausar";

interface TaskSuggestion {
  id: string;
  priority: Priority;
  category: Category;
  title: string;
  detail: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: React.ElementType; color: string }> = {
  pausar:    { label: "Pausar",      icon: PauseCircle, color: "text-red-500 bg-red-50" },
  criativo:  { label: "Criativo",    icon: ImageIcon,   color: "text-violet-600 bg-violet-50" },
  landing:   { label: "Landing",     icon: Globe,       color: "text-orange-500 bg-orange-50" },
  orçamento: { label: "Orçamento",   icon: DollarSign,  color: "text-amber-600 bg-amber-50" },
  targeting: { label: "Targeting",   icon: AlertTriangle, color: "text-blue-500 bg-blue-50" },
  escalar:   { label: "Escalar",     icon: TrendingUp,  color: "text-emerald-600 bg-emerald-50" },
};

const PRIORITY_STYLE: Record<Priority, string> = {
  alta:  "border-red-200 bg-red-50",
  média: "border-amber-200 bg-amber-50",
  baixa: "border-emerald-200 bg-emerald-50",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  alta:  "bg-red-100 text-red-700",
  média: "bg-amber-100 text-amber-700",
  baixa: "bg-emerald-100 text-emerald-700",
};

function generateTasks(campaigns: AggregatedCampaign[]): TaskSuggestion[] {
  const tasks: TaskSuggestion[] = [];

  for (const c of campaigns) {
    const name = `"${c.campaignName}"`;

    // ── Critical: ROAS < 1
    if (c.roas < 1 && c.investment > 100) {
      tasks.push({
        id: `roas-neg-${c.campaignName}`,
        priority: "alta",
        category: "pausar",
        title: `Pausar ou revisar ${name}`,
        detail: `ROAS de ${c.roas.toFixed(2)}x — cada R$ 1 investido gera apenas R$ ${c.roas.toFixed(2)} de retorno. Pause enquanto revisa público, oferta e criativo.`,
      });
    } else if (c.roas >= 1 && c.roas < 2 && c.investment > 100) {
      tasks.push({
        id: `roas-low-${c.campaignName}`,
        priority: "média",
        category: "orçamento",
        title: `Reduzir orçamento de ${name} até estabilizar`,
        detail: `ROAS de ${c.roas.toFixed(2)}x — margem estreita. Reduza o investimento diário em ~30% e teste ajustes de segmentação antes de escalar.`,
      });
    }

    // ── Critical: Sem conversões com gasto relevante
    if (c.conversions === 0 && c.investment > 100) {
      tasks.push({
        id: `no-conv-${c.campaignName}`,
        priority: "alta",
        category: "landing",
        title: `Revisar funil de compra de ${name}`,
        detail: `${formatCurrency(c.investment)} investidos e zero conversões. Teste o fluxo completo da landing page, cheque pixel e confirme se a oferta está clara.`,
      });
    } else if (c.conversionRate < 1 && c.clicks > 200 && c.conversions > 0) {
      tasks.push({
        id: `conv-low-${c.campaignName}`,
        priority: "média",
        category: "landing",
        title: `Otimizar landing page de ${name}`,
        detail: `${formatNumber(c.clicks)} cliques gerando apenas ${formatNumber(c.conversions)} conversões (${formatPercent(c.conversionRate)}). Revise headline, prova social e CTA da página.`,
      });
    }

    // ── Low CTR
    if (c.ctr < 0.3 && c.impressions > 1000) {
      tasks.push({
        id: `ctr-crit-${c.campaignName}`,
        priority: "alta",
        category: "criativo",
        title: `Trocar criativo urgente em ${name}`,
        detail: `CTR de ${formatPercent(c.ctr)} (crítico < 0.3%). O anúncio não desperta atenção. Substitua imagem/vídeo e teste copy diferente com gatilho de dor ou curiosidade.`,
      });
    } else if (c.ctr >= 0.3 && c.ctr < 0.5 && c.impressions > 1000) {
      tasks.push({
        id: `ctr-low-${c.campaignName}`,
        priority: "média",
        category: "criativo",
        title: `Testar variação de criativo em ${name}`,
        detail: `CTR de ${formatPercent(c.ctr)} (abaixo dos 0.5% ideais). Crie 2-3 variações com diferentes hooks e faça um A/B para identificar o que engaja mais.`,
      });
    }

    // ── Positive: escalar
    if (c.roas >= 3 && c.investment > 50) {
      tasks.push({
        id: `scale-${c.campaignName}`,
        priority: "baixa",
        category: "escalar",
        title: `Escalar orçamento de ${name}`,
        detail: `ROAS de ${c.roas.toFixed(2)}x — excelente retorno. Aumente o budget diário em 20-30% e monitore por 3-5 dias antes de escalar novamente.`,
      });
    }

    // ── Positive: CTR alto → replicar criativo
    if (c.ctr >= 2 && c.impressions > 500) {
      tasks.push({
        id: `ref-ctr-${c.campaignName}`,
        priority: "baixa",
        category: "criativo",
        title: `Replicar criativo de ${name} em outras campanhas`,
        detail: `CTR de ${formatPercent(c.ctr)} — muito acima da média. Identifique o que funciona nesse anúncio (formato, copy, hook) e teste em campanhas com baixo CTR.`,
      });
    }

    // ── High CPA relative to revenue
    if (c.cpa > 0 && c.revenue > 0 && c.cpa > c.revenue / c.conversions * 0.5) {
      tasks.push({
        id: `cpa-high-${c.campaignName}`,
        priority: "média",
        category: "targeting",
        title: `Revisar segmentação de ${name} para reduzir CPA`,
        detail: `CPA de ${formatCurrency(c.cpa)} representa uma parcela alta do ticket. Refine o público excluindo segmentos com baixa intenção de compra (ex: lookalike muito amplo).`,
      });
    }
  }

  // Deduplicate by id, sort: alta → média → baixa
  const seen = new Set<string>();
  const order: Record<Priority, number> = { alta: 0, média: 1, baixa: 2 };
  return tasks
    .filter((t) => { if (seen.has(t.id)) return false; seen.add(t.id); return true; })
    .sort((a, b) => order[a.priority] - order[b.priority]);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CampaignAnalysis({ campaigns }: CampaignAnalysisProps) {
  const tasks = useMemo(() => generateTasks(campaigns), [campaigns]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const critical = campaigns.filter((c) => c.roas < 1 || (c.conversions === 0 && c.investment > 100));
  const warnings = campaigns.filter((c) => c.roas >= 1 && c.roas < 2 && !critical.includes(c));
  const positive = campaigns.filter((c) => c.roas >= 2);

  const pending = tasks.filter((t) => !checked.has(t.id));
  const done = tasks.filter((t) => checked.has(t.id));

  return (
    <div className="space-y-6">
      {/* Health overview */}
      <div className="grid grid-cols-3 gap-3">
        <article className={`rounded-xl border p-4 text-center shadow-sm ${critical.length > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
          <XCircle size={20} className={`mx-auto mb-1 ${critical.length > 0 ? "text-red-500" : "text-slate-300"}`} />
          <p className="text-2xl font-bold text-slate-900">{critical.length}</p>
          <p className="text-xs text-slate-500">crítica{critical.length !== 1 ? "s" : ""}</p>
        </article>
        <article className={`rounded-xl border p-4 text-center shadow-sm ${warnings.length > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <AlertTriangle size={20} className={`mx-auto mb-1 ${warnings.length > 0 ? "text-amber-500" : "text-slate-300"}`} />
          <p className="text-2xl font-bold text-slate-900">{warnings.length}</p>
          <p className="text-xs text-slate-500">alerta{warnings.length !== 1 ? "s" : ""}</p>
        </article>
        <article className={`rounded-xl border p-4 text-center shadow-sm ${positive.length > 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <CheckCircle2 size={20} className={`mx-auto mb-1 ${positive.length > 0 ? "text-emerald-500" : "text-slate-300"}`} />
          <p className="text-2xl font-bold text-slate-900">{positive.length}</p>
          <p className="text-xs text-slate-500">saudável{positive.length !== 1 ? "is" : ""}</p>
        </article>
      </div>

      {/* Critical + Positive side by side */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <XCircle size={15} className="text-red-500" /> Pontos Críticos
          </h2>
          <CriticalPoints campaigns={campaigns} />
        </div>
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 size={15} className="text-emerald-500" /> Pontos Positivos
          </h2>
          <PositivePoints campaigns={campaigns} />
        </div>
      </div>

      {/* Task suggestions */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Sugestões de Tarefas</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {pending.length} pendente{pending.length !== 1 ? "s" : ""}{done.length > 0 ? ` · ${done.length} concluída${done.length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          {done.length > 0 && (
            <button
              onClick={() => setChecked(new Set())}
              className="text-xs text-slate-400 underline hover:text-slate-600"
            >
              Limpar concluídas
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 size={16} />
            <p className="text-sm font-medium">Nenhuma ação necessária — todas as campanhas estão saudáveis.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Pending tasks */}
            {pending.map((task) => {
              const cat = CATEGORY_META[task.category];
              const CatIcon = cat.icon;
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition ${PRIORITY_STYLE[task.priority]}`}
                >
                  <button
                    onClick={() => toggle(task.id)}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600"
                  >
                    <Square size={16} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[task.priority]}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cat.color}`}>
                        <CatIcon size={11} />
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{task.detail}</p>
                  </div>
                </div>
              );
            })}

            {/* Done tasks */}
            {done.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-medium text-slate-400">Concluídas</p>
                {done.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 opacity-60"
                  >
                    <button
                      onClick={() => toggle(task.id)}
                      className="mt-0.5 shrink-0 text-emerald-500 hover:text-slate-400"
                    >
                      <CheckSquare size={16} />
                    </button>
                    <p className="text-sm text-slate-500 line-through">{task.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
