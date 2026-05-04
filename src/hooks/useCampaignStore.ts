"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductCategory } from "@/types/campaign";

const STORAGE_KEY = "pta_campaign_store_v1";

export interface CampaignConfig {
  adAccountId: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
}

interface StoreState {
  activeCampaigns: Record<string, boolean>;
  selectedGroup: string;
  selectedTurma: string;
  campaignConfigs: Record<string, CampaignConfig>;
  selectedCategory: ProductCategory | null;
  campaignsByGroup: Record<string, CampaignSummary[]>;
  selectedCampaign: string;
  enabledSections: ProductCategory[];
}

const ALL_SECTIONS: ProductCategory[] = ["pos", "livros", "ebooks", "perpetuo", "eventos"];

const DEFAULT_STATE: StoreState = {
  activeCampaigns: {},
  selectedGroup: "all",
  selectedTurma: "all",
  campaignConfigs: {},
  selectedCategory: null,
  campaignsByGroup: {},
  selectedCampaign: "all",
  enabledSections: ALL_SECTIONS,
};

function loadStore(): StoreState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function persist(state: StoreState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage unavailable */ }
}

export function useCampaignStore() {
  // Start with DEFAULT_STATE on both server and client to avoid hydration mismatch.
  // localStorage is loaded in useEffect (runs only after hydration, client-only).
  const [state, setState] = useState<StoreState>(DEFAULT_STATE);

  useEffect(() => {
    setState(loadStore());
  }, []);

  const setSelectedGroup = useCallback((group: string) => {
    setState((prev) => {
      const next = { ...prev, selectedGroup: group, selectedTurma: "all", selectedCampaign: "all" };
      persist(next);
      return next;
    });
  }, []);

  const setSelectedTurma = useCallback((turma: string) => {
    setState((prev) => {
      const next = { ...prev, selectedTurma: turma, selectedCampaign: "all" };
      persist(next);
      return next;
    });
  }, []);

  const toggleActive = useCallback((group: string, isActive: boolean) => {
    setState((prev) => {
      const next = {
        ...prev,
        activeCampaigns: { ...prev.activeCampaigns, [group]: isActive },
      };
      persist(next);
      return next;
    });
  }, []);

  const setCampaignConfig = useCallback((group: string, config: CampaignConfig) => {
    setState((prev) => {
      const next = {
        ...prev,
        campaignConfigs: { ...prev.campaignConfigs, [group]: config },
      };
      persist(next);
      return next;
    });
  }, []);

  const setSelectedCategory = useCallback((cat: ProductCategory | null) => {
    setState((prev) => {
      // Reset group/turma/campaign when switching category so stale filters don't linger
      const next = {
        ...prev,
        selectedCategory: cat,
        selectedGroup: "all",
        selectedTurma: "all",
        selectedCampaign: "all",
      };
      persist(next);
      return next;
    });
  }, []);

  const setCampaignsForGroup = useCallback((groupId: string, campaigns: CampaignSummary[]) => {
    setState((prev) => {
      const next = {
        ...prev,
        campaignsByGroup: { ...prev.campaignsByGroup, [groupId]: campaigns },
      };
      persist(next);
      return next;
    });
  }, []);

  const setSelectedCampaign = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, selectedCampaign: id };
      persist(next);
      return next;
    });
  }, []);

  const setEnabledSections = useCallback((sections: ProductCategory[]) => {
    setState((prev) => {
      const next = { ...prev, enabledSections: sections };
      persist(next);
      return next;
    });
  }, []);

  return {
    selectedGroup: state.selectedGroup,
    selectedTurma: state.selectedTurma,
    activeCampaigns: state.activeCampaigns,
    campaignConfigs: state.campaignConfigs,
    selectedCategory: state.selectedCategory,
    campaignsByGroup: state.campaignsByGroup,
    selectedCampaign: state.selectedCampaign,
    enabledSections: state.enabledSections,
    setSelectedGroup,
    setSelectedTurma,
    toggleActive,
    setCampaignConfig,
    setSelectedCategory,
    setCampaignsForGroup,
    setSelectedCampaign,
    setEnabledSections,
  };
}
