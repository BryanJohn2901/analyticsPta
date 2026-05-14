"use client";

import { useState } from "react";
import {
  BookOpen, CalendarDays, ChevronRight, Copy, Edit3, GraduationCap,
  Loader2, Package, Plus, Trash2, Users,
} from "lucide-react";
import { ProductData, ProductType, COURSE_GROUPS_PRODUCT } from "@/types/product";
import { useProductStore } from "@/hooks/useProductStore";
import { ProductForm } from "./ProductForm";
import { TabLanding } from "@/components/TabLanding";

// ─── Product card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: ProductData;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProductCard({ product: p, onEdit, onDuplicate, onDelete }: ProductCardProps) {
  const isPos    = p.type === "pos";
  const course   = COURSE_GROUPS_PRODUCT.find((g) => g.id === p.courseGroup);

  const colors = isPos
    ? { accent: "border-l-blue-400", badge: "bg-blue-100 text-blue-700", icon: "bg-blue-50 text-blue-500" }
    : { accent: "border-l-violet-400", badge: "bg-violet-100 text-violet-700", icon: "bg-violet-50 text-violet-500" };

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border border-slate-200 border-l-4 ${colors.accent} bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.badge} dark:opacity-80`}>
            {isPos ? "Pós Grad." : "Imersão"}
          </span>
          {course && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {course.label}
            </span>
          )}
          {p.turmaVinculada && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              {p.turmaVinculada}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            title="Editar"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <Edit3 size={12} />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicar"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Remover"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 text-red-400 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Name */}
      <h3 className="text-sm font-bold text-slate-900 leading-snug dark:text-slate-100">{p.nome || "Sem nome"}</h3>
      {p.expert && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{p.expert}</p>}

      {/* Promessa */}
      {p.promessa && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-500 leading-relaxed dark:text-slate-400">{p.promessa}</p>
      )}

      {/* Sub-promessas count + links count */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3 dark:border-slate-700">
        {p.subPromessas.filter((s) => s.text).length > 0 && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {p.subPromessas.filter((s) => s.text).length} sub-promessa{p.subPromessas.filter((s) => s.text).length !== 1 ? "s" : ""}
          </span>
        )}
        {p.linksVenda.length > 0 && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {p.linksVenda.length} link{p.linksVenda.length !== 1 ? "s" : ""} de venda
          </span>
        )}
        {p.lotes.length > 0 && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {p.lotes.length} lote{p.lotes.length !== 1 ? "s" : ""}
          </span>
        )}
        {p.attachments.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500">
            📎 {p.attachments.length} ref.
          </span>
        )}
      </div>

      {/* Open button */}
      <button
        type="button"
        onClick={onEdit}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-100 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        Abrir <ChevronRight size={12} />
      </button>
    </article>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, count, color,
}: {
  icon: React.ElementType; title: string; count: number; color: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        <Icon size={15} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{count} produto{count !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ type, onAdd }: { type: ProductType; onAdd: () => void }) {
  const isPos = type === "pos";
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isPos ? "bg-blue-50 dark:bg-blue-900/30" : "bg-violet-50 dark:bg-violet-900/30"}`}>
        {isPos ? <GraduationCap size={20} className="text-blue-400" /> : <CalendarDays size={20} className="text-violet-400" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Nenhuma {isPos ? "pós-graduação" : "imersão"} cadastrada
        </p>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Clique em <span className="font-semibold">+ Novo produto</span> para adicionar
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className={`mt-1 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${isPos ? "bg-brand hover:bg-brand-hover" : "bg-violet-600 hover:bg-violet-700"}`}
      >
        <Plus size={12} /> Adicionar {isPos ? "Pós Graduação" : "Imersão"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type View = "list" | "add" | "edit";

export function ProductBase() {
  const [view, setView]       = useState<View>("list");
  const [editing, setEditing] = useState<ProductData | null>(null);

  const { products, addProduct, updateProduct, deleteProduct, syncStatus } = useProductStore();

  const posList    = products.filter((p) => p.type === "pos");
  const imersaoList = products.filter((p) => p.type === "imersao");

  const handleAdd = () => {
    setEditing(null);
    setView("add");
  };

  const handleEdit = (p: ProductData) => {
    setEditing(p);
    setView("edit");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover este produto da base?")) return;
    deleteProduct(id);
  };

  const handleDuplicate = (p: ProductData) => {
    const now = new Date().toISOString();
    const copy: ProductData = {
      ...p,
      id: crypto.randomUUID(),
      nome: `${p.nome} (Cópia)`,
      createdAt: now,
      updatedAt: now,
    };
    addProduct(copy);
  };

  const handleSave = (p: ProductData) => {
    if (editing) updateProduct(p);
    else addProduct(p);
    setView("list");
    setEditing(null);
  };

  const handleCancel = () => {
    setView("list");
    setEditing(null);
  };

  // ── Form view ──────────────────────────────────────────────────────────────
  if (view === "add" || view === "edit") {
    return (
      <ProductForm
        product={editing}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  // ── Empty onboarding (no products yet) ────────────────────────────────────
  if (products.length === 0) {
    return (
      <TabLanding
        icon={Package}
        title="Base de Produtos"
        subtitle="Cadastre seus produtos — pós-graduações e imersões — com promessa, entregáveis e links de venda. Vincule cada produto às campanhas que o promovem."
        features={[
          { icon: Package,    label: "Catálogo Centralizado",    description: "Todos os produtos em um lugar: nome, tipo, turma, promessa e entregáveis." },
          { icon: Users,      label: "Vinculação com Campanhas", description: "Associe cada produto aos grupos de campanha que o promovem no Meta Ads." },
          { icon: BookOpen,   label: "Links de Venda",           description: "Organize as páginas de venda e materiais de cada produto com facilidade." },
        ]}
        steps={[
          { label: "Cadastre o produto",   description: "Nome, tipo (pós ou imersão), turma e promessa principal." },
          { label: "Adicione detalhes",    description: "Entregáveis, links de vendas e página de checkout." },
          { label: "Vincule campanhas",    description: "Relacione com os grupos de campanha do Meta Ads para cruzar dados." },
        ]}
        cta={{ label: "Cadastrar primeiro produto", onClick: handleAdd }}
      />
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-sm dark:bg-slate-700">
              <Package size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Base de Produtos</h1>
            {syncStatus === "loading" && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400"><Loader2 size={11} className="animate-spin" /> Sincronizando…</span>
            )}
            {syncStatus === "synced" && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">✓ Sincronizado</span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400 ml-11 dark:text-slate-500">
            Cadastre pós-graduações e imersões com promessa, entregáveis e links de venda
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
        >
          <Plus size={14} /> Novo produto
        </button>
      </div>

      {/* Stats summary */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total de produtos", value: products.length, color: "text-slate-900" },
            { label: "Pós Graduações",    value: posList.length,   color: "text-blue-700" },
            { label: "Imersões",          value: imersaoList.length, color: "text-violet-700" },
            { label: "Com links de venda",value: products.filter((p) => p.linksVenda.length > 0 || p.paginasVenda?.length > 0).length, color: "text-emerald-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Pós Graduação section ── */}
      <section>
        <SectionHeader
          icon={GraduationCap}
          title="Pós Graduação"
          count={posList.length}
          color="bg-blue-100 text-blue-600"
        />
        {posList.length === 0 ? (
          <EmptyState type="pos" onAdd={handleAdd} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {posList.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => handleEdit(p)}
                onDuplicate={() => handleDuplicate(p)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
            <button
              type="button"
              onClick={handleAdd}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/10"
            >
              <Plus size={18} className="text-slate-300 dark:text-slate-600" />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Nova Pós Graduação</span>
            </button>
          </div>
        )}
      </section>

      {/* ── Imersão section ── */}
      <section>
        <SectionHeader
          icon={CalendarDays}
          title="Imersões"
          count={imersaoList.length}
          color="bg-violet-100 text-violet-600"
        />
        {imersaoList.length === 0 ? (
          <EmptyState type="imersao" onAdd={handleAdd} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {imersaoList.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => handleEdit(p)}
                onDuplicate={() => handleDuplicate(p)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
            <button
              type="button"
              onClick={handleAdd}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:hover:border-violet-600 dark:hover:bg-violet-900/10"
            >
              <Plus size={18} className="text-slate-300 dark:text-slate-600" />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Nova Imersão</span>
            </button>
          </div>
        )}
      </section>

    </div>
  );
}
