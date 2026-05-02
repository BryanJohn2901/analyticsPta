"use client";

import { useCallback, useState } from "react";
import { ProductData } from "@/types/product";

const STORAGE_KEY = "pta_products_v1";

function load(): ProductData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProductData[]) : [];
  } catch {
    return [];
  }
}

function save(products: ProductData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch { /* storage unavailable */ }
}

export function useProductStore() {
  const [products, setProducts] = useState<ProductData[]>(load);

  const addProduct = useCallback((p: ProductData) => {
    setProducts((prev) => {
      const next = [p, ...prev];
      save(next);
      return next;
    });
  }, []);

  const updateProduct = useCallback((p: ProductData) => {
    setProducts((prev) => {
      const next = prev.map((x) => (x.id === p.id ? p : x));
      save(next);
      return next;
    });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => {
      const next = prev.filter((x) => x.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { products, addProduct, updateProduct, deleteProduct };
}
