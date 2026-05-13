"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductCategory } from "@/types/campaign";

const STORAGE_KEY = "pta_campaign_store_v2";

export interface CampaignConfig {
  adAccountId: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
}

export type GroupSection = "pos" | "livros" | "ebooks" | "perpetuo" | "eventos" | string;

export interface CustomGroup {
  id: string;
  label: string;
  section: GroupSection;
}

/** A user-created top-level category (max 3). Analogous to "pos", "livros", etc. */
export interface CustomSection {
  id: string;    // e.g. "csec-1716000000000"
  label: string; // e.g. "Perfil Instagram"
  icon: string;  // Lucide icon name, e.g. "Instagram"
  color: string; // tailwind color key, e.g. "pink"
}

const MAX_CUSTOM_SECTIONS = 3;

interface StoreState {
  activeCampaigns:          Record<string, boolean>;
  selectedGroup:            string;
  selectedTurma:            string;
  campaignConfigs:          Record<string, CampaignConfig>;
  selectedCategory:         ProductCategory | string | null;
  campaignsByGroup:         Record<string, CampaignSummary[]>;
  selectedCampaign:         string;
  selectedCampaignsByGroup: Record<string, string[]>;
  enabledSections:          ProductCategory[];
  customGroups:             CustomGroup[];
  customSections:           CustomSection[];
}

const ALL_SECTIONS: ProductCategory[] = ["pos", "livros", "ebooks", "perpetuo", "eventos"];

const DEFAULT_STATE: StoreState = {
  activeCampaigns:          {},
  selectedGroup:            "all",
  selectedTurma:            "all",
  campaignConfigs:          {},
  selectedCategory:         null,
  campaignsByGroup:         {},
  selectedCampaign:         "all",
  selectedCampaignsByGroup: {},
  enabledSections:          ALL_SECTIONS,
  customGroups:             [],
  customSections:           [],
};

function loadStore(): StoreState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    // Try new key first, fall back to old key for migration
    const raw = localStorage.getItem(STORAGE_KEY)
      ?? localStorage.getItem("pta_campaign_store_v1");
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

  const setSelectedCategory = useCallback((cat: ProductCategory | string | null) => {
    setState((prev) => {
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

  // ── Custom Sections ──────────────────────────────────────────────────────────

  const addCustomSection = useCallback((section: Omit<CustomSection, "id">) => {
    setState((prev) => {
      if (prev.customSections.length >= MAX_CUSTOM_SECTIONS) return prev;
      const newSection: CustomSection = {
        ...section,
        id: `csec-${Date.now()}`,
      };
      const next = { ...prev, customSections: [...prev.customSections, newSection] };
      persist(next);
      return next;
    });
  }, []);

  const updateCustomSection = useCallback((id: string, data: Partial<Omit<CustomSection, "id">>) => {
    setState((prev) => {
      const next = {
        ...prev,
        customSections: prev.customSections.map((s) =>
          s.id === id ? { ...s, ...data } : s,
        ),
      };
      persist(next);
      return next;
    });
  }, []);

  const removeCustomSection = useCallback((id: string) => {
    setState((prev) => {
      // Remove all groups belonging to this section too
      const removedGroups = prev.customGroups.filter((g) => g.section === id).map((g) => g.id);
      const newConfigs = { ...prev.campaignConfigs };
      removedGroups.forEach((gId) => delete newConfigs[gId]);

      const next = {
        ...prev,
        customSections: prev.customSections.filter((s) => s.id !== id),
        customGroups: prev.customGroups.filter((g) => g.section !== id),
        campaignConfigs: newConfigs,
      };
      persist(next);
      return next;
    });
  }, []);

  // ── Campaign selection per group ─────────────────────────────────────────────

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
    selectedGroup:            state.selectedGroup,
    selectedTurma:            state.selectedTurma,
    activeCampaigns:          state.activeCampaigns,
    campaignConfigs:          state.campaignConfigs,
    selectedCategory:         state.selectedCategory,
    campaignsByGroup:         state.campaignsByGroup,
    selectedCampaign:         state.selectedCampaign,
    enabledSections:          state.enabledSections,
    customGroups:             state.customGroups,
    customSections:           state.customSections,
    canAddCustomSection:      state.customSections.length < MAX_CUSTOM_SECTIONS,
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
    updateCustomSection,
    removeCustomSection,
    selectedCampaignsByGroup: state.selectedCampaignsByGroup,
    setCampaignSelectionForGroup,
    clearCampaignSelectionForGroup,
  };
}
