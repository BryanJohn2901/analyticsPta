"use client";

import { useState } from "react";
import {
  X, Plus, Trash2, Pencil, Check, Instagram, Youtube, ShoppingBag,
  Megaphone, Users, Globe, Star, Zap, Rocket, Heart, TrendingUp,
  Monitor, Smartphone, Camera, Music, Gamepad2, BookOpen, DollarSign,
  BarChart3, Target, Settings2, Link2, FileUp, ChevronRight,
} from "lucide-react";
import type { CustomSection } from "@/hooks/useCampaignStore";

// ─── Icon library (closed set) ────────────────────────────────────────────────

const ICON_OPTIONS: Array<{ name: string; icon: React.ElementType; label: string }> = [
  { name: "Instagram",    icon: Instagram,   label: "Instagram" },
  { name: "Youtube",      icon: Youtube,     label: "YouTube" },
  { name: "ShoppingBag",  icon: ShoppingBag, label: "E-commerce" },
  { name: "Megaphone",    icon: Megaphone,   label: "Anúncio" },
  { name: "Users",        icon: Users,       label: "Audiência" },
  { name: "Globe",        icon: Globe,       label: "Web" },
  { name: "Star",         icon: Star,        label: "Destaque" },
  { name: "Zap",          icon: Zap,         label: "Performance" },
  { name: "Rocket",       icon: Rocket,      label: "Lançamento" },
  { name: "Heart",        icon: Heart,       label: "Engajamento" },
  { name: "TrendingUp",   icon: TrendingUp,  label: "Crescimento" },
  { name: "Monitor",      icon: Monitor,     label: "Display" },
  { name: "Smartphone",   icon: Smartphone,  label: "Mobile" },
  { name: "Camera",       icon: Camera,      label: "Criativos" },
  { name: "Music",        icon: Music,       label: "Áudio" },
  { name: "Gamepad2",     icon: Gamepad2,    label: "Games" },
  { name: "BookOpen",     icon: BookOpen,    label: "Conteúdo" },
  { name: "DollarSign",   icon: DollarSign,  label: "Vendas" },
  { name: "BarChart3",    icon: BarChart3,   label: "Analytics" },
  { name: "Target",       icon: Target,      label: "Conversão" },
];

const COLOR_OPTIONS: Array<{ key: string; bg: string; text: string; border: string; dot: string }> = [
  { key: "pink",   bg: "bg-pink-50 dark:bg-pink-900/20",   text: "text-pink-600 dark:text-pink-400",   border: "border-pink-200 dark:border-pink-800",   dot: "#ec4899" },
  { key: "violet", bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800", dot: "#7c3aed" },
  { key: "cyan",   bg: "bg-cyan-50 dark:bg-cyan-900/20",   text: "text-cyan-600 dark:text-cyan-400",   border: "border-cyan-200 dark:border-cyan-800",   dot: "#0891b2" },
  { key: "orange", bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800", dot: "#ea580c" },
  { key: "lime",   bg: "bg-lime-50 dark:bg-lime-900/20",   text: "text-lime-600 dark:text-lime-400",   border: "border-lime-200 dark:border-lime-800",   dot: "#65a30d" },
  { key: "rose",   bg: "bg-rose-50 dark:bg-rose-900/20",   text: "text-rose-600 dark:text-rose-400",   border: "border-rose-200 dark:border-rose-800",   dot: "#e11d48" },
];

export function getIconComponent(name: string): React.ElementType {
  return ICON_OPTIONS.find((i) => i.name === name)?.icon ?? Target;
}

export function getColorConfig(key: string) {
  return COLOR_OPTIONS.find((c) => c.key === key) ?? COLOR_OPTIONS[0];
}

// ─── Section Form ─────────────────────────────────────────────────────────────

interface SectionFormProps {
  initial?: { label: string; icon: string; color: string };
  onSave: (data: { label: string; icon: string; color: string }) => void;
  onCancel: () => void;
}

function SectionForm({ initial, onSave, onCancel }: SectionFormProps) {
  const [label, setLabel]   = useState(initial?.label ?? "");
  const [icon,  setIcon]    = useState(initial?.icon  ?? "Instagram");
  const [color, setColor]   = useState(initial?.color ?? "pink");

  return (
    <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
      {/* Name */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          Nome da categoria
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Perfil Instagram"
          maxLength={32}
          className="h-9 w-full rounded-lg border px-3 text-xs outline-none transition"
          style={{
            borderColor: "var(--dm-border-default)",
            backgroundColor: "var(--dm-bg-surface)",
            color: "var(--dm-text-primary)",
          }}
        />
      </div>

      {/* Icon */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          Ícone
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {ICON_OPTIONS.map(({ name, icon: Icon, label: tip }) => (
            <button
              key={name}
              type="button"
              title={tip}
              onClick={() => setIcon(name)}
              className={`flex h-9 w-full items-center justify-center rounded-lg border transition ${
                icon === name
                  ? "border-[var(--dm-brand-500)] bg-[var(--dm-brand-50)]"
                  : "border-[var(--dm-border-default)] hover:border-[var(--dm-brand-300)]"
              }`}
            >
              <Icon size={16} style={{ color: icon === name ? "var(--dm-brand-500)" : "var(--dm-text-tertiary)" }} />
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
          Cor
        </label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              className={`h-6 w-6 rounded-full border-2 transition ${
                color === c.key ? "scale-125 border-slate-700 dark:border-slate-300" : "border-transparent"
              }`}
              style={{ backgroundColor: c.dot }}
              title={c.key}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      {label && (() => {
        const IconComp = getIconComponent(icon);
        const col = getColorConfig(color);
        return (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${col.bg} ${col.border}`}>
            <IconComp size={14} className={col.text} />
            <span className={`text-xs font-semibold ${col.text}`}>{label}</span>
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border py-2 text-xs font-semibold transition"
          style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-secondary)" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!label.trim()}
          onClick={() => { if (label.trim()) onSave({ label: label.trim(), icon, color }); }}
          className="flex-1 rounded-lg py-2 text-xs font-bold text-white transition disabled:opacity-40"
          style={{ backgroundColor: "var(--dm-brand-500)" }}
        >
          <Check size={13} className="inline mr-1" />
          Salvar
        </button>
      </div>
    </div>
  );
}

// ─── Control Panel ────────────────────────────────────────────────────────────

type Tab = "categorias" | "integracoes" | "perfil";

interface ControlPanelProps {
  onClose: () => void;
  customSections: CustomSection[];
  canAddCustomSection: boolean;
  onAddCustomSection:    (data: { label: string; icon: string; color: string }) => void;
  onUpdateCustomSection: (id: string, data: { label?: string; icon?: string; color?: string }) => void;
  onRemoveCustomSection: (id: string) => void;
  // Integrations
  dataSourceType?: string;
  dataSourceLabel?: string;
  onOpenImport: (tab: "meta" | "csv" | "sheets") => void;
  onClearData?: () => void;
  // Profile
  userName: string;
  userEmail: string;
  onUpdateProfile: (name: string) => Promise<void>;
  onSignOut: () => void;
}

export function ControlPanel({
  onClose,
  customSections, canAddCustomSection,
  onAddCustomSection, onUpdateCustomSection, onRemoveCustomSection,
  dataSourceType, dataSourceLabel,
  onOpenImport, onClearData,
  userName, userEmail, onUpdateProfile, onSignOut,
}: ControlPanelProps) {
  const [tab, setTab]             = useState<Tab>("categorias");
  const [adding, setAdding]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(userName);
  const [savingProfile, setSavingProfile] = useState(false);

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "categorias",  label: "Categorias",   icon: Settings2 },
    { id: "integracoes", label: "Integrações",  icon: Link2 },
    { id: "perfil",      label: "Perfil",        icon: Users },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col shadow-2xl"
        style={{ backgroundColor: "var(--dm-bg-surface)", borderLeft: "1px solid var(--dm-border-default)" }}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-5" style={{ borderColor: "var(--dm-border-default)" }}>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--dm-text-primary)" }}>Painel de Controle</p>
            <p className="text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>Configurações centralizadas</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-700"
            style={{ color: "var(--dm-text-secondary)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--dm-border-default)" }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition border-b-2 ${
                tab === id
                  ? "border-[var(--dm-brand-500)] text-[var(--dm-brand-500)]"
                  : "border-transparent text-[var(--dm-text-tertiary)] hover:text-[var(--dm-text-secondary)]"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Categorias ── */}
          {tab === "categorias" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--dm-text-primary)" }}>
                  Categorias personalizadas
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
                  Até 3 categorias. Aparecem na barra lateral junto com as 5 padrão.
                </p>
              </div>

              {/* Existing custom sections */}
              {customSections.map((sec) => {
                const IconComp = getIconComponent(sec.icon);
                const col      = getColorConfig(sec.color);
                return (
                  <div key={sec.id}>
                    {editingId === sec.id ? (
                      <SectionForm
                        initial={{ label: sec.label, icon: sec.icon, color: sec.color }}
                        onSave={(data) => { onUpdateCustomSection(sec.id, data); setEditingId(null); }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${col.bg} ${col.border}`}>
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${col.bg}`}>
                          <IconComp size={16} className={col.text} />
                        </div>
                        <span className={`flex-1 text-sm font-semibold ${col.text}`}>{sec.label}</span>
                        <button
                          onClick={() => setEditingId(sec.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-black/10 dark:hover:bg-white/10"
                          style={{ color: "var(--dm-text-tertiary)" }}
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => onRemoveCustomSection(sec.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Remover"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add form */}
              {adding ? (
                <SectionForm
                  onSave={(data) => { onAddCustomSection(data); setAdding(false); }}
                  onCancel={() => setAdding(false)}
                />
              ) : canAddCustomSection ? (
                <button
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-xs font-semibold transition hover:border-[var(--dm-brand-400)] hover:text-[var(--dm-brand-500)]"
                  style={{ borderColor: "var(--dm-border-default)", color: "var(--dm-text-tertiary)" }}
                >
                  <Plus size={14} />
                  Nova categoria personalizada
                  <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">
                    {customSections.length}/3
                  </span>
                </button>
              ) : (
                <p className="text-center text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
                  Limite de 3 categorias atingido. Remova uma para criar outra.
                </p>
              )}

              {/* Fixed categories info */}
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--dm-text-tertiary)" }}>
                  Categorias padrão (fixas)
                </p>
                {[
                  "📚 Pós-graduação",
                  "📖 Livros",
                  "💻 Ebooks",
                  "🔄 Perpétua",
                  "🎫 Eventos",
                ].map((c) => (
                  <div key={c} className="flex items-center gap-1.5 py-1 text-xs" style={{ color: "var(--dm-text-secondary)" }}>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Integrações ── */}
          {tab === "integracoes" && (
            <div className="space-y-3">
              <p className="text-xs font-bold" style={{ color: "var(--dm-text-primary)" }}>Fonte de dados ativa</p>

              {dataSourceType ? (
                <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}>
                  <Zap size={16} style={{ color: "var(--dm-brand-500)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "var(--dm-text-primary)" }}>
                      {dataSourceType === "meta" ? "Meta Ads" : dataSourceType === "google_sheets" ? "Google Sheets" : "CSV"}
                    </p>
                    <p className="truncate text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>
                      {dataSourceLabel}
                    </p>
                  </div>
                  {onClearData && (
                    <button
                      onClick={onClearData}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Desconectar"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>
                  Nenhuma fonte conectada.
                </p>
              )}

              <p className="pt-2 text-xs font-bold" style={{ color: "var(--dm-text-primary)" }}>Conectar</p>

              {[
                { id: "meta" as const, label: "Meta Ads", desc: "Sincroniza campanhas automaticamente", icon: Zap, color: "text-blue-500" },
                { id: "sheets" as const, label: "Google Sheets", desc: "Importa de planilha pública", icon: Link2, color: "text-green-500" },
                { id: "csv" as const, label: "CSV",  desc: "Upload de arquivo local", icon: FileUp, color: "text-slate-500" },
              ].map(({ id, label, desc, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => { onOpenImport(id); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-[var(--dm-brand-300)] hover:bg-[var(--dm-brand-50)]"
                  style={{ borderColor: "var(--dm-border-default)", backgroundColor: "var(--dm-bg-elevated)" }}
                >
                  <Icon size={18} className={color} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: "var(--dm-text-primary)" }}>{label}</p>
                    <p className="text-[10px]" style={{ color: "var(--dm-text-tertiary)" }}>{desc}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: "var(--dm-text-tertiary)" }} />
                </button>
              ))}
            </div>
          )}

          {/* ── Perfil ── */}
          {tab === "perfil" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold" style={{ color: "var(--dm-text-secondary)" }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="h-9 w-full rounded-lg border px-3 text-xs outline-none transition"
                  style={{
                    borderColor: "var(--dm-border-default)",
                    backgroundColor: "var(--dm-bg-elevated)",
                    color: "var(--dm-text-primary)",
                  }}
                />
                <p className="mt-1 text-[11px]" style={{ color: "var(--dm-text-tertiary)" }}>{userEmail}</p>
              </div>

              <button
                onClick={async () => {
                  setSavingProfile(true);
                  await onUpdateProfile(profileName.trim() || userName);
                  setSavingProfile(false);
                }}
                disabled={savingProfile || profileName.trim() === userName}
                className="w-full rounded-lg py-2 text-xs font-bold text-white transition disabled:opacity-40"
                style={{ backgroundColor: "var(--dm-brand-500)" }}
              >
                {savingProfile ? "Salvando…" : "Salvar nome"}
              </button>

              <hr style={{ borderColor: "var(--dm-border-default)" }} />

              <button
                onClick={onSignOut}
                className="w-full rounded-lg border py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                style={{ borderColor: "var(--dm-border-default)" }}
              >
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
