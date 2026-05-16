import { create } from "zustand";
import { loadRepo, saveRepo } from "@/lib/persistence/idb";
import type { Repo, Household, CommunicationPlan, EvacuationPlan, ResourceInventory, LegalDocuments, UtilityShutoffs } from "@/types/plan";

interface PlanState {
  repo: Repo;
  hydrated: boolean;
  // Hydrate from IDB on app mount
  hydrate: () => Promise<void>;
  // Per-zone setters — each persists the full repo immediately
  setHousehold: (data: Household) => Promise<void>;
  setCommunicationPlan: (data: CommunicationPlan) => Promise<void>;
  setEvacuationPlan: (data: EvacuationPlan) => Promise<void>;
  setResourceInventory: (data: ResourceInventory) => Promise<void>;
  setLegalDocuments: (data: LegalDocuments) => Promise<void>;
  setUtilityShutoffs: (data: UtilityShutoffs) => Promise<void>;
}

export const usePlanStore = create<PlanState>()((set, get) => ({
  repo: { schemaVersion: 1 },
  hydrated: false,

  hydrate: async () => {
    const repo = await loadRepo();
    set({ repo, hydrated: true });
  },

  setHousehold: async (data) => {
    const repo = { ...get().repo, household: data };
    set({ repo });
    await saveRepo(repo);
  },

  setCommunicationPlan: async (data) => {
    const repo = { ...get().repo, communicationPlan: data };
    set({ repo });
    await saveRepo(repo);
  },

  setEvacuationPlan: async (data) => {
    const repo = { ...get().repo, evacuationPlan: data };
    set({ repo });
    await saveRepo(repo);
  },

  setResourceInventory: async (data) => {
    const repo = { ...get().repo, resourceInventory: data };
    set({ repo });
    await saveRepo(repo);
  },

  setLegalDocuments: async (data) => {
    const repo = { ...get().repo, legalDocuments: data };
    set({ repo });
    await saveRepo(repo);
  },

  setUtilityShutoffs: async (data) => {
    const repo = { ...get().repo, utilityShutoffs: data };
    set({ repo });
    await saveRepo(repo);
  },
}));
