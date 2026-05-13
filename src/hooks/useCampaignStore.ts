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

/** Built-in section IDs + any custom section string. */
export type GroupSection = "pos" | "livros" | "ebooks" | "perpetuo" | "eventos" | (string & {});

export type ColorKey = "blue" | "emerald" | "violet" | "amber" | "rose" | "pink" | "cyan" | "orange";

/** User-created top-level category (e.g. "Perfis de Instagram"). */
export interface CustomSection {
  id: string;
  label: string;
  description: string;
  iconName: string;   // lucide icon name
  colorKey: ColorKey;
}

export interface CustomGroup {
  id: string;
  label: string;
  section: GroupSection;
}

interface StoreState {
  activeCampaigns: Record<string, boolean>;
  selectedGroup: string;
  selectedTurma: string;
  campaignConfigs: Record<string, CampaignConfig>;
  selectedCategory: ProductCategory | null;
  campaignsByGroup: Record<string, CampaignSummary[]>;
  selectedCampaign: string;
  selectedCampaignsByGroup: Record<string, string[]>;
  enabledSections: ProductCategory[];
  customGroups: CustomGroup[];
  customSections: CustomSection[];
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
  selectedCampaignsByGroup: {},
  enabledSections: ALL_SECTIONS,
  customGroups: [],
  customSections: [],
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

  const addCustomGroup = useCallback((group: CustomGroup) => {
    setState((prev) => {
      if (prev.customGroups.some((g) => g.id === group.id)) return prev;
      const next = { ...prev, customGroups: [...prev.customGroups, group] };
      persist(next);
      return next;
    });
  }, []);

  const removeCustomGroup = useCallback((id: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        customGroups: prev.customGroups.filter((g) => g.id !== id),
        campaignConfigs: Object.fromEntries(
          Object.entries(prev.campaignConfigs).filter(([k]) => k !== id),
        ),
      };
      persist(next);
      return next;
    });
  }, []);

  const addCustomSection = useCallback((section: CustomSection) => {
    setState((prev) => {
      if (prev.customSections.some((s) => s.id === section.id)) return prev;
      const next = { ...prev, customSections: [...prev.customSections, section] };
      persist(next);
      return next;
    });
  }, []);

  const removeCustomSection = useCallback((id: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        customSections: prev.customSections.filter((s) => s.id !== id),
        // Also remove all groups belonging to this section
        customGroups: prev.customGroups.filter((g) => g.section !== id),
      };
      persist(next);
      return next;
    });
  }, []);

  const updateCustomSection = useCallback((id: string, data: Partial<Omit<CustomSection, "id">>) => {
    setState((prev) => {
      const next = {
        ...prev,
        customSections: prev.customSections.map((s) => s.id === id ? { ...s, ...data } : s),
      };
      persist(next);
      return next;
    });
  }, []);

  const setCampaignSelectionForGroup = useCallback((groupId: string, ids: string[]) => {
    setState((prev) => {
      const next = {
        ...prev,
        selectedCampaignsByGroup: { ...prev.selectedCampaignsByGroup, [groupId]: ids },
      };
      persist(next);
      return next;
    });
  }, []);

  const clearCampaignSelectionForGroup = useCallback((groupId: string) => {
    setState((prev) => {
      const newMap = { ...prev.selectedCampaignsByGroup };
      delete newMap[groupId];
      const next = { ...prev, selectedCampaignsByGroup: newMap };
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
    customGroups: state.customGroups,
    customSections: state.customSections,
    setSelectedGroup,
    setSelectedTurma,
    toggleActive,
    setCampaignConfig,
    setSelectedCategory,
    setCampaignsForGroup,
    setSelectedCampaign,
    setEnabledSections,
    addCustomGroup,
    removeCustomGroup,
    addCustomSection,
    removeCustomSection,
    updateCustomSection,
    selectedCampaignsByGroup: state.selectedCampaignsByGroup,
    setCampaignSelectionForGroup,
    clearCampaignSelectionForGroup,
  };
}
