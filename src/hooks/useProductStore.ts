"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductData } from "@/types/product";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchProducts, upsertProduct, deleteProductRemote } from "@/utils/supabaseProducts";

// ─── Local cache ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "pta_products_v1";

function loadLocal(): ProductData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProductData[]) : [];
  } catch { return []; }
}

function saveLocal(products: ProductData[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }
  catch { /* unavailable */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type ProductSyncStatus = "local" | "loading" | "synced" | "error";

export function useProductStore() {
  const [products, setProductsRaw] = useState<ProductData[]>(loadLocal);
  const [syncStatus, setSyncStatus] = useState<ProductSyncStatus>(
    isSupabaseConfigured ? "loading" : "local",
  );

  // keep local state + localStorage in sync
  const setProducts = useCallback((next: ProductData[]) => {
    setProductsRaw(next);
    saveLocal(next);
  }, []);

  // ── Load from Supabase on mount ──
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setSyncStatus("loading");
    fetchProducts()
      .then((remote) => { setProducts(remote); setSyncStatus("synced"); })
      .catch(() => setSyncStatus("error"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addProduct = useCallback(async (p: ProductData) => {
    // optimistic update using latest local state
    const current = loadLocal();
    setProducts([p, ...current]);
    if (isSupabaseConfigured) {
      try { await upsertProduct(p); setSyncStatus("synced"); }
      catch { setSyncStatus("error"); }
    }
  }, [setProducts]);

  const updateProduct = useCallback(async (p: ProductData) => {
    const current = loadLocal();
    setProducts(current.map((x) => (x.id === p.id ? p : x)));
    if (isSupabaseConfigured) {
      try { await upsertProduct(p); setSyncStatus("synced"); }
      catch { setSyncStatus("error"); }
    }
  }, [setProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    const current = loadLocal();
    setProducts(current.filter((x) => x.id !== id));
    if (isSupabaseConfigured) {
      try { await deleteProductRemote(id); setSyncStatus("synced"); }
      catch { setSyncStatus("error"); }
    }
  }, [setProducts]);

  return { products, addProduct, updateProduct, deleteProduct, syncStatus };
}
