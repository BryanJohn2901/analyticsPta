"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft, ChevronDown, Image as ImageIcon, Link2, Loader2,
  Plus, Save, Trash2, Users, X,
} from "lucide-react";
import {
  COURSE_GROUPS_PRODUCT, DorSolucao, Entregavel, EntregavelItem,
  Lote, PersonaSegmento, ProductData, ProductType, SubPromessa,
  TurmaLink, emptyProduct,
} from "@/types/product";

// ─── Shared input styles ──────────────────────────────────────────────────────

const cls = {
  input:    "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300",
  textarea: "w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300",
  label:    "block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5",
  addBtn:   "flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition",
  removeBtn:"flex-shrink-0 rounded-md p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500",
};

const uid = () => crypto.randomUUID();

// ─── Accordion section ────────────────────────────────────────────────────────

function Section({
  title, icon: Icon, defaultOpen = false, children,
}: {
  title: string; icon?: React.ElementType; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={13} className="text-slate-400" />}
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
        </div>
        <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-4 p-4">{children}</div>}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className={cls.label}>
        {label}{required && <span className="ml-0.5 text-blue-500">*</span>}
      </p>
      {children}
    </div>
  );
}

// ─── Dynamic string list ──────────────────────────────────────────────────────

function DynamicList({
  items, onChange, placeholder, addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const update = (i: number, val: string) => {
    const next = [...items]; next[i] = val; onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add    = () => onChange([...items, ""]);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input value={item} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} className={cls.input} />
          <button type="button" onClick={() => remove(i)} className={cls.removeBtn}><X size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className={cls.addBtn}>
        <Plus size={12} /> {addLabel ?? "Adicionar"}
      </button>
    </div>
  );
}

// ─── Tags input ───────────────────────────────────────────────────────────────

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) { onChange([...tags, v]); setDraft(""); }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="opacity-60 hover:opacity-100"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Digite e pressione Enter"
          className={cls.input}
        />
        <button type="button" onClick={add} className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Lotes table ──────────────────────────────────────────────────────────────

function LotesTable({ lotes, onChange }: { lotes: Lote[]; onChange: (l: Lote[]) => void }) {
  const update = (id: string, key: keyof Lote, val: string) =>
    onChange(lotes.map((l) => (l.id === id ? { ...l, [key]: val } : l)));
  const remove = (id: string) => onChange(lotes.filter((l) => l.id !== id));
  const add    = () =>
    onChange([...lotes, { id: uid(), label: `Lote ${lotes.length + 1}`, valor: "", promo: "" }]);

  return (
    <div className="space-y-2">
      {lotes.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
          <span>Lote</span><span>Valor</span><span>Promoção</span><span />
        </div>
      )}
      {lotes.map((l) => (
        <div key={l.id} className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 items-center">
          <input value={l.label} onChange={(e) => update(l.id, "label", e.target.value)} className={cls.input} />
          <input value={l.valor} onChange={(e) => update(l.id, "valor", e.target.value)} placeholder="R$ 0,00" className={cls.input} />
          <input value={l.promo} onChange={(e) => update(l.id, "promo", e.target.value)} placeholder="—" className={cls.input} />
          <button type="button" onClick={() => remove(l.id)} className={cls.removeBtn}><X size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className={cls.addBtn}><Plus size={12} /> Adicionar lote</button>
    </div>
  );
}

// ─── Entregável block ─────────────────────────────────────────────────────────

function EntregavelBlock({
  entregaveis, onChange,
}: { entregaveis: Entregavel[]; onChange: (e: Entregavel[]) => void }) {
  const updateTitulo = (id: string, v: string) =>
    onChange(entregaveis.map((e) => (e.id === id ? { ...e, titulo: v } : e)));
  const updateItens = (id: string, itens: EntregavelItem[]) =>
    onChange(entregaveis.map((e) => (e.id === id ? { ...e, itens } : e)));
  const addItem = (id: string) =>
    updateItens(id, [...(entregaveis.find((e) => e.id === id)?.itens ?? []), { id: uid(), text: "" }]);
  const updateItem = (eid: string, iid: string, text: string) =>
    updateItens(eid, entregaveis.find((e) => e.id === eid)!.itens.map((i) => (i.id === iid ? { ...i, text } : i)));
  const removeItem = (eid: string, iid: string) =>
    updateItens(eid, entregaveis.find((e) => e.id === eid)!.itens.filter((i) => i.id !== iid));
  const remove = (id: string) => onChange(entregaveis.filter((e) => e.id !== id));
  const add    = () => onChange([...entregaveis, { id: uid(), titulo: `Entregável ${entregaveis.length + 1}`, itens: [] }]);

  return (
    <div className="space-y-4">
      {entregaveis.map((e) => (
        <div key={e.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input
              value={e.titulo}
              onChange={(ev) => updateTitulo(e.id, ev.target.value)}
              placeholder="Título do entregável"
              className={`${cls.input} font-semibold`}
            />
            <button type="button" onClick={() => remove(e.id)} className={cls.removeBtn}><Trash2 size={13} /></button>
          </div>
          <div className="ml-2 space-y-1.5">
            {e.itens.map((item) => (
              <div key={item.id} className="flex gap-2 items-center">
                <input
                  value={item.text}
                  onChange={(ev) => updateItem(e.id, item.id, ev.target.value)}
                  placeholder="Item incluído"
                  className={cls.input}
                />
                <button type="button" onClick={() => removeItem(e.id, item.id)} className={cls.removeBtn}><X size={12} /></button>
              </div>
            ))}
            <button type="button" onClick={() => addItem(e.id)} className={`${cls.addBtn} text-[11px]`}>
              <Plus size={11} /> item
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className={cls.addBtn}><Plus size={12} /> Adicionar entregável</button>
    </div>
  );
}

// ─── Dores & Soluções table ───────────────────────────────────────────────────

function DoresSolucoes({
  pairs, onChange,
}: { pairs: DorSolucao[]; onChange: (p: DorSolucao[]) => void }) {
  const update = (id: string, key: keyof DorSolucao, v: string) =>
    onChange(pairs.map((p) => (p.id === id ? { ...p, [key]: v } : p)));
  const remove = (id: string) => onChange(pairs.filter((p) => p.id !== id));
  const add    = () => onChange([...pairs, { id: uid(), dor: "", solucao: "" }]);

  return (
    <div className="space-y-2">
      {pairs.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_28px] gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
          <span>Dor / Objeção</span><span>Solução</span><span />
        </div>
      )}
      {pairs.map((p) => (
        <div key={p.id} className="grid grid-cols-[1fr_1fr_28px] gap-2 items-start">
          <textarea
            value={p.dor}
            onChange={(e) => update(p.id, "dor", e.target.value)}
            placeholder="Dor ou objeção…"
            rows={2}
            className={cls.textarea}
          />
          <textarea
            value={p.solucao}
            onChange={(e) => update(p.id, "solucao", e.target.value)}
            placeholder="Como o produto resolve…"
            rows={2}
            className={cls.textarea}
          />
          <button type="button" onClick={() => remove(p.id)} className={`${cls.removeBtn} mt-1`}><X size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className={cls.addBtn}><Plus size={12} /> Adicionar par</button>
    </div>
  );
}

// ─── Turma links table ────────────────────────────────────────────────────────

function TurmaLinks({ links, onChange }: { links: TurmaLink[]; onChange: (l: TurmaLink[]) => void }) {
  const update = (id: string, key: keyof TurmaLink, v: string) =>
    onChange(links.map((l) => (l.id === id ? { ...l, [key]: v } : l)));
  const remove = (id: string) => onChange(links.filter((l) => l.id !== id));
  const add    = () =>
    onChange([...links, { id: uid(), turma: `T${links.length + 1}`, valor: "", link: "" }]);

  return (
    <div className="space-y-2">
      {links.length > 0 && (
        <div className="grid grid-cols-[80px_1fr_2fr_28px] gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
          <span>Turma</span><span>Valor</span><span>Link de pagamento</span><span />
        </div>
      )}
      {links.map((l) => (
        <div key={l.id} className="grid grid-cols-[80px_1fr_2fr_28px] gap-2 items-center">
          <input value={l.turma}  onChange={(e) => update(l.id, "turma",  e.target.value)} placeholder="T1" className={cls.input} />
          <input value={l.valor}  onChange={(e) => update(l.id, "valor",  e.target.value)} placeholder="R$" className={cls.input} />
          <input value={l.link}   onChange={(e) => update(l.id, "link",   e.target.value)} placeholder="https://…" className={cls.input} />
          <button type="button" onClick={() => remove(l.id)} className={cls.removeBtn}><X size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className={cls.addBtn}><Plus size={12} /> Adicionar turma</button>
    </div>
  );
}

// ─── Persona segmentos ────────────────────────────────────────────────────────

function PersonaSegmentos({
  segments, onChange,
}: { segments: PersonaSegmento[]; onChange: (s: PersonaSegmento[]) => void }) {
  const update = (id: string, key: keyof PersonaSegmento, v: string) =>
    onChange(segments.map((s) => (s.id === id ? { ...s, [key]: v } : s)));
  const remove = (id: string) => onChange(segments.filter((s) => s.id !== id));
  const add    = () => onChange([...segments, { id: uid(), titulo: `Segmento ${segments.length + 1}`, pontos: "" }]);

  return (
    <div className="space-y-3">
      {segments.map((s) => (
        <div key={s.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input value={s.titulo} onChange={(e) => update(s.id, "titulo", e.target.value)} placeholder="Ex: Profissional iniciante" className={`${cls.input} font-semibold`} />
            <button type="button" onClick={() => remove(s.id)} className={cls.removeBtn}><X size={13} /></button>
          </div>
          <textarea
            value={s.pontos}
            onChange={(e) => update(s.id, "pontos", e.target.value)}
            placeholder="Descreva os sofrimentos desse segmento…"
            rows={3}
            className={cls.textarea}
          />
        </div>
      ))}
      <button type="button" onClick={add} className={cls.addBtn}><Plus size={12} /> Adicionar segmento</button>
    </div>
  );
}

// ─── Main form component ──────────────────────────────────────────────────────

interface ProductFormProps {
  product?: ProductData | null;
  onSave: (p: ProductData) => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const isEdit = !!product;

  // ── Type selection step (only when adding) ──────────────────────────────────
  const [typeChosen, setTypeChosen] = useState<ProductType | null>(
    isEdit ? product!.type : null,
  );

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<Omit<ProductData, "id" | "createdAt" | "updatedAt">>(() =>
    isEdit ? { ...product! } : emptyProduct("pos"),
  );

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const setSub = (subs: SubPromessa[]) => set("subPromessas", subs);
  const addSub = () => setSub([...form.subPromessas, { id: uid(), text: "" }]);
  const updateSub = (id: string, text: string) =>
    setSub(form.subPromessas.map((s) => (s.id === id ? { ...s, text } : s)));
  const removeSub = (id: string) =>
    setSub(form.subPromessas.filter((s) => s.id !== id));

  // ── Image upload ────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("imageRef", ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Handle type selection ────────────────────────────────────────────────────
  const handleChooseType = (t: ProductType) => {
    setTypeChosen(t);
    setForm({ ...emptyProduct(t), type: t });
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nome.trim()) { alert("O nome do produto é obrigatório."); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 200)); // visual feedback
    const now = new Date().toISOString();
    const saved: ProductData = isEdit
      ? { ...product!, ...form, updatedAt: now }
      : { ...form, id: uid(), createdAt: now, updatedAt: now };
    onSave(saved);
    setSaving(false);
  };

  // ── Type selection screen ────────────────────────────────────────────────────
  if (!typeChosen) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <button onClick={onCancel} className="mb-8 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800">
            <ArrowLeft size={15} /> Voltar
          </button>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Tipo de produto</h2>
          <p className="mb-8 text-sm text-slate-500">Selecione o formato antes de preencher os detalhes</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleChooseType("pos")}
              className="group flex flex-col items-start rounded-2xl border-2 border-blue-100 bg-blue-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-lg">🎓</div>
              <p className="font-bold text-blue-900">Pós Graduação</p>
              <p className="mt-1 text-[11px] text-slate-500">Lançamento de turma com currículo completo, entregáveis e imersão</p>
            </button>
            <button
              onClick={() => handleChooseType("imersao")}
              className="group flex flex-col items-start rounded-2xl border-2 border-violet-100 bg-violet-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg">⚡</div>
              <p className="font-bold text-violet-900">Imersão</p>
              <p className="mt-1 text-[11px] text-slate-500">Evento intensivo presencial ou online com tema e público específico</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPos = form.type === "pos";
  const typeBadge = isPos
    ? "bg-blue-100 text-blue-700"
    : "bg-violet-100 text-violet-700";

  return (
    <div className="flex flex-col">

      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeBadge}`}>
              {isPos ? "Pós Graduação" : "Imersão"}
            </span>
            <p className="mt-0.5 text-sm font-bold text-slate-900 leading-none">
              {form.nome || (isEdit ? "Editar produto" : "Novo produto")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Salvando…" : "Salvar produto"}
        </button>
      </div>

      {/* ── Form body ───────────────────────────────────────────────────────── */}
      <div className="flex gap-6 p-6">

        {/* Left — image reference panel */}
        <aside className="hidden w-48 flex-shrink-0 xl:block">
          <div className="sticky top-[72px]">
            <p className={cls.label}>Referência visual</p>
            {form.imageRef ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageRef} alt="referência" className="w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set("imageRef", undefined)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm transition hover:bg-red-50 hover:text-red-500"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50"
              >
                <ImageIcon size={20} className="text-slate-300" />
                <p className="text-[10px] font-medium text-slate-400">Adicionar print / referência</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>
        </aside>

        {/* Right — form fields */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* ══ IDENTIDADE (always open) ══ */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Identidade do produto</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do produto" required>
                <input
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Ex: Pós-graduação em Musculação e Periodização"
                  className={cls.input}
                />
              </Field>
              <Field label="Expert / Autor">
                <input
                  value={form.expert}
                  onChange={(e) => set("expert", e.target.value)}
                  placeholder="Prof. Nome Sobrenome"
                  className={cls.input}
                />
              </Field>
            </div>

            <Field label="Promessa principal" required>
              <textarea
                value={form.promessa}
                onChange={(e) => set("promessa", e.target.value)}
                placeholder="A grande transformação que o produto entrega…"
                rows={2}
                className={cls.textarea}
              />
            </Field>

            <Field label="Sub-promessas" required>
              <div className="space-y-2">
                {form.subPromessas.map((s, i) => (
                  <div key={s.id} className="flex gap-2">
                    <input
                      value={s.text}
                      onChange={(e) => updateSub(s.id, e.target.value)}
                      placeholder={`Sub-promessa ${i + 1}`}
                      className={cls.input}
                    />
                    {form.subPromessas.length > 1 && (
                      <button type="button" onClick={() => removeSub(s.id)} className={cls.removeBtn}><X size={13} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addSub} className={cls.addBtn}>
                  <Plus size={12} /> Adicionar sub-promessa
                </button>
              </div>
            </Field>
          </div>

          {/* ══ EQUIPE ══ */}
          <Section title="Equipe" defaultOpen={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Co-produtores">
                <input value={form.coProdutores} onChange={(e) => set("coProdutores", e.target.value)} placeholder="Nomes separados por vírgula" className={cls.input} />
              </Field>
              <Field label="Coordenador do Pós">
                <input value={form.coordenador} onChange={(e) => set("coordenador", e.target.value)} placeholder="Nome do coordenador" className={cls.input} />
              </Field>
              <Field label="Debate do produto">
                <input value={form.debateProduto} onChange={(e) => set("debateProduto", e.target.value)} placeholder="Responsável pelo debate" className={cls.input} />
              </Field>
              {isPos && (
                <>
                  <Field label="Prof. demais slides">
                    <input value={form.profSlides} onChange={(e) => set("profSlides", e.target.value)} placeholder="Nomes" className={cls.input} />
                  </Field>
                  <Field label="Pto Digital">
                    <input value={form.ptoDigital} onChange={(e) => set("ptoDigital", e.target.value)} placeholder="Nome" className={cls.input} />
                  </Field>
                </>
              )}
            </div>
          </Section>

          {/* ══ PALAVRAS-CHAVE ══ */}
          <Section title="Palavras-chave">
            <Field label="Tags do produto">
              <TagsInput tags={form.palavrasChave} onChange={(t) => set("palavrasChave", t)} />
            </Field>
          </Section>

          {/* ══ AVATAR ══ */}
          <Section title="Avatar & Posicionamento">
            <Field label="Descrição do avatar / do produto">
              <textarea
                value={form.descricaoAvatar}
                onChange={(e) => set("descricaoAvatar", e.target.value)}
                placeholder="Quem é o aluno ideal? O que ele sente, deseja e teme? Como o produto transforma a vida dele?"
                rows={5}
                className={cls.textarea}
              />
            </Field>
          </Section>

          {/* ══ PROPOSTA DE VALOR ══ */}
          <Section title={isPos ? "Proposta de Valor & Aula Inaugural" : "Tema da Imersão"}>
            {isPos ? (
              <>
                <Field label="O que o aluno vai aprender">
                  <DynamicList
                    items={form.oQueVaiAprender}
                    onChange={(v) => set("oQueVaiAprender", v)}
                    placeholder="Ex: Estratégias de periodização aplicada"
                    addLabel="Adicionar item"
                  />
                </Field>
                <Field label="Tema da Aula Inaugural (para promover a imersão)">
                  <textarea
                    value={form.temaAulaInaugural}
                    onChange={(e) => set("temaAulaInaugural", e.target.value)}
                    placeholder="Ex: Transforme Seu Treinamento — como profissionais de alta performance prescrevem…"
                    rows={3}
                    className={cls.textarea}
                  />
                </Field>
              </>
            ) : (
              <Field label="Tema e descrição da imersão">
                <textarea
                  value={form.temaImersao}
                  onChange={(e) => set("temaImersao", e.target.value)}
                  placeholder="Qual é o tema central? O que os participantes vão vivenciar?"
                  rows={4}
                  className={cls.textarea}
                />
              </Field>
            )}
          </Section>

          {/* ══ PRECIFICAÇÃO ══ */}
          <Section title="Precificação">
            <Field label="Valor base">
              <input
                value={form.valorBase}
                onChange={(e) => set("valorBase", e.target.value)}
                placeholder="R$ 0,00"
                className={`${cls.input} max-w-xs`}
              />
            </Field>
            <Field label="Lotes e promoções">
              <LotesTable lotes={form.lotes} onChange={(l) => set("lotes", l)} />
            </Field>
          </Section>

          {/* ══ ENTREGÁVEIS & BÔNUS — pos only ══ */}
          {isPos && (
            <Section title="Entregáveis & Bônus">
              <Field label="Entregáveis">
                <EntregavelBlock entregaveis={form.entregaveis} onChange={(e) => set("entregaveis", e)} />
              </Field>
              <Field label="Bônus">
                <DynamicList
                  items={form.bonus}
                  onChange={(b) => set("bonus", b)}
                  placeholder="Ex: Apostila exclusiva"
                  addLabel="Adicionar bônus"
                />
              </Field>
            </Section>
          )}

          {/* ══ PÚBLICO-ALVO ══ */}
          <Section title="Público-Alvo">
            <Field label="Para quem é">
              <textarea
                value={form.paraQuemE}
                onChange={(e) => set("paraQuemE", e.target.value)}
                placeholder="Descreva o público ideal — profissão, estágio de carreira, objetivos…"
                rows={3}
                className={cls.textarea}
              />
            </Field>
            <Field label="Sofrimento da persona (por segmento)">
              <PersonaSegmentos
                segments={form.sofrimentoPersona}
                onChange={(s) => set("sofrimentoPersona", s)}
              />
            </Field>
          </Section>

          {/* ══ DORES & SOLUÇÕES ══ */}
          <Section title="Dores & Soluções">
            <DoresSolucoes
              pairs={form.doresESolucoes}
              onChange={(p) => set("doresESolucoes", p)}
            />
          </Section>

          {/* ══ RECEITA TÉCNICA — pos only ══ */}
          {isPos && (
            <Section title="Receita Técnica">
              <Field label="Descrição técnica do produto">
                <textarea
                  value={form.receitaTecnica}
                  onChange={(e) => set("receitaTecnica", e.target.value)}
                  placeholder="Aqui vai a receita técnica completa do produto — módulos, carga horária, metodologia…"
                  rows={6}
                  className={cls.textarea}
                />
              </Field>
            </Section>
          )}

          {/* ══ LINKS DE VENDA ══ */}
          <Section title="Links de Venda" icon={Link2}>
            <Field label="Links por turma">
              <TurmaLinks links={form.linksVenda} onChange={(l) => set("linksVenda", l)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Página de Captura">
                <input
                  value={form.paginaCaptura}
                  onChange={(e) => set("paginaCaptura", e.target.value)}
                  placeholder="https://…"
                  className={cls.input}
                />
              </Field>
              <Field label="Página de Vendas">
                <input
                  value={form.paginaVendas}
                  onChange={(e) => set("paginaVendas", e.target.value)}
                  placeholder="https://…"
                  className={cls.input}
                />
              </Field>
            </div>
          </Section>

          {/* ══ VINCULAÇÃO ══ */}
          <Section title="Vinculação ao Curso / Turma" icon={Users}>
            <p className="text-xs text-slate-400">Opcional — vincule este produto a um curso e turma específicos para cruzar com os dados das campanhas</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Curso vinculado">
                <select
                  value={form.courseGroup ?? ""}
                  onChange={(e) => set("courseGroup", (e.target.value as any) || undefined)}
                  className={cls.input}
                >
                  <option value="">— Nenhum —</option>
                  {COURSE_GROUPS_PRODUCT.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Turma vinculada">
                <input
                  value={form.turmaVinculada ?? ""}
                  onChange={(e) => set("turmaVinculada", e.target.value || undefined)}
                  placeholder="Ex: Turma 5, T3…"
                  className={cls.input}
                />
              </Field>
            </div>
          </Section>

          {/* Bottom save */}
          <div className="flex justify-end gap-3 pt-2 pb-6">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Salvando…" : "Salvar produto"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
