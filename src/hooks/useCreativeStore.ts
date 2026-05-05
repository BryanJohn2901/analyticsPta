"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pta_creatives_v1";

export interface CreativeData {
  mediaUrl: string;  // URL to image / video thumbnail
  adLink: string;    // click-through: the ad, landing page, or Meta Ads Manager link
  notes: string;
}

export const EMPTY_CREATIVE: CreativeData = { mediaUrl: "", adLink: "", notes: "" };

type CreativeStore = Record<string, CreativeData>; // key = campaignName

export function useCreativeStore() {
  const [store, setStore] = useState<CreativeStore>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStore(JSON.parse(raw));
    } catch {}
  }, []);

  const saveCreative = useCallback((campaignName: string, data: CreativeData) => {
    setStore((prev) => {
      const next = { ...prev, [campaignName]: data };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeCreative = useCallback((campaignName: string) => {
    setStore((prev) => {
      const next = { ...prev };
      delete next[campaignName];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { store, saveCreative, removeCreative };
}
