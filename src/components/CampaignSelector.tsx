"use client";

import { Activity, BookOpen, Dumbbell, Trophy, Users, Zap } from "lucide-react";

type GroupId = "biomecanica" | "musculacao" | "fisiologia" | "bodybuilding" | "feminino" | "funcional";

interface GroupConfig {
  id: GroupId;
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  selectedCard: string;
  dotActive: string;
}

const GROUPS: GroupConfig[] = [
  {
    id: "biomecanica",
    label: "Biomecânica",
    icon: BookOpen,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    selectedCard: "border-blue-500 bg-blue-50 ring-1 ring-blue-400",
    dotActive: "bg-blue-500",
  },
  {
    id: "musculacao",
    label: "Musculação",
    icon: Dumbbell,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    selectedCard: "border-purple-500 bg-purple-50 ring-1 ring-purple-400",
    dotActive: "bg-purple-500",
  },
  {
    id: "fisiologia",
    label: "Fisiologia",
    icon: Activity,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    selectedCard: "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400",
    dotActive: "bg-emerald-500",
  },
  {
    id: "bodybuilding",
    label: "Bodybuilding",
    icon: Trophy,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    selectedCard: "border-orange-500 bg-orange-50 ring-1 ring-orange-400",
    dotActive: "bg-orange-500",
  },
  {
    id: "feminino",
    label: "Trein. Feminino",
    icon: Users,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    selectedCard: "border-pink-500 bg-pink-50 ring-1 ring-pink-400",
    dotActive: "bg-pink-500",
  },
  {
    id: "funcional",
    label: "Trein. Funcional",
    icon: Zap,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    selectedCard: "border-teal-500 bg-teal-50 ring-1 ring-teal-400",
    dotActive: "bg-teal-500",
  },
];

interface CampaignSelectorProps {
  turmasByGroup: Record<string, string[]>;
  selectedGroup: string;
  selectedTurma: string;
  activeCampaigns: Record<string, boolean>;
  onSelectGroup: (group: string) => void;
  onSelectTurma: (turma: string) => void;
  onToggleActive: (group: string, active: boolean) => void;
}

export function CampaignSelector({
  turmasByGroup,
  selectedGroup,
  selectedTurma,
  activeCampaigns,
  onSelectGroup,
  onSelectTurma,
  onToggleActive,
}: CampaignSelectorProps) {
  const selectedConfig = GROUPS.find((g) => g.id === selectedGroup);
  const turmaList = selectedGroup !== "all" ? (turmasByGroup[selectedGroup] ?? []) : [];

  return (
    <div className="space-y-3">
      {/* Campaign blocks */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          const isSelected = selectedGroup === group.id;
          const isActive = activeCampaigns[group.id] ?? false;

          return (
            <div
              key={group.id}
              onClick={() => onSelectGroup(isSelected ? "all" : group.id)}
              className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition select-none ${
                isSelected
                  ? group.selectedCard
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {/* Active status dot */}
              <span
                title={isActive ? "Campanha ativa" : "Campanha inativa"}
                className={`absolute right-2.5 top-2.5 h-2 w-2 rounded-full transition-colors ${
                  isActive ? group.dotActive : "bg-slate-300"
                }`}
              />

              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${group.iconBg}`}>
                <Icon size={16} className={group.iconColor} />
              </div>

              <p className="text-xs font-semibold leading-tight text-slate-800">{group.label}</p>

              {/* Active checkbox — stops propagation so it doesn't also toggle card selection */}
              <label
                className="flex items-center gap-1 text-xs text-slate-500"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => onToggleActive(group.id, e.target.checked)}
                  className="h-3 w-3 rounded accent-blue-600"
                />
                Ativa
              </label>
            </div>
          );
        })}
      </div>

      {/* Turma selector — only when a specific group is selected */}
      {selectedGroup !== "all" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <span className="text-xs font-semibold text-slate-500">
            {selectedConfig?.label}:
          </span>
          <button
            type="button"
            onClick={() => onSelectTurma("all")}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
              selectedTurma === "all"
                ? "border-blue-200 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Todas
          </button>

          {turmaList.length > 0 ? (
            turmaList.map((turma) => (
              <button
                key={turma}
                type="button"
                onClick={() => onSelectTurma(turma)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  selectedTurma === turma
                    ? "border-blue-200 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {turma}
              </button>
            ))
          ) : (
            <span className="text-xs italic text-slate-400">
              Nenhuma turma detectada nos dados carregados
            </span>
          )}
        </div>
      )}
    </div>
  );
}
