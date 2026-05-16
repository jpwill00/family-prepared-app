import { create } from "zustand";
import { loadRepo, saveRepo } from "@/lib/persistence/idb";
import { deriveKey, encryptRepo, decryptRepo, getOrCreateSalt } from "@/lib/crypto/secure";
import type { Repo, Household, CommunicationPlan, EvacuationPlan, ResourceInventory, LegalDocuments, UtilityShutoffs } from "@/types/plan";

interface PlanState {
  repo: Repo;
  hydrated: boolean;
  // cryptoKey lives in memory only — never persisted (Sprint 3)
  cryptoKey: CryptoKey | null;

  // Hydrate from IDB on app mount; decrypts if cryptoKey is set
  hydrate: () => Promise<void>;

  // Derive key from passphrase + stored/new salt; re-encrypts repo
  setPassphrase: (passphrase: string) => Promise<void>;

  // Clear the crypto key (lock the app)
  clearPassphrase: () => void;

  // Per-zone setters — each persists the full repo (encrypted if key is set)
  setHousehold: (data: Household) => Promise<void>;
  setCommunicationPlan: (data: CommunicationPlan) => Promise<void>;
  setEvacuationPlan: (data: EvacuationPlan) => Promise<void>;
  setResourceInventory: (data: ResourceInventory) => Promise<void>;
  setLegalDocuments: (data: LegalDocuments) => Promise<void>;
  setUtilityShutoffs: (data: UtilityShutoffs) => Promise<void>;
}

async function persistRepo(repo: Repo, cryptoKey: CryptoKey | null): Promise<void> {
  const toSave = cryptoKey ? await encryptRepo(repo, cryptoKey) : repo;
  await saveRepo(toSave);
}

export const usePlanStore = create<PlanState>()((set, get) => ({
  repo: { schemaVersion: 1 },
  hydrated: false,
  cryptoKey: null,

  hydrate: async () => {
    const { cryptoKey } = get();
    const raw = await loadRepo();
    const repo = cryptoKey ? await decryptRepo(raw, cryptoKey) : raw;
    set({ repo, hydrated: true });
  },

  setPassphrase: async (passphrase) => {
    const { repo } = get();
    const salt = await getOrCreateSalt();
    const cryptoKey = await deriveKey(passphrase, salt);
    await persistRepo(repo, cryptoKey);
    set({ cryptoKey });
  },

  clearPassphrase: () => {
    set({ cryptoKey: null });
  },

  setHousehold: async (data) => {
    const { repo, cryptoKey } = get();
    const updated = { ...repo, household: data };
    set({ repo: updated });
    await persistRepo(updated, cryptoKey);
  },

  setCommunicationPlan: async (data) => {
    const { repo, cryptoKey } = get();
    const updated = { ...repo, communicationPlan: data };
    set({ repo: updated });
    await persistRepo(updated, cryptoKey);
  },

  setEvacuationPlan: async (data) => {
    const { repo, cryptoKey } = get();
    const updated = { ...repo, evacuationPlan: data };
    set({ repo: updated });
    await persistRepo(updated, cryptoKey);
  },

  setResourceInventory: async (data) => {
    const { repo, cryptoKey } = get();
    const updated = { ...repo, resourceInventory: data };
    set({ repo: updated });
    await persistRepo(updated, cryptoKey);
  },

  setLegalDocuments: async (data) => {
    const { repo, cryptoKey } = get();
    const updated = { ...repo, legalDocuments: data };
    set({ repo: updated });
    await persistRepo(updated, cryptoKey);
  },

  setUtilityShutoffs: async (data) => {
    const { repo, cryptoKey } = get();
    const updated = { ...repo, utilityShutoffs: data };
    set({ repo: updated });
    await persistRepo(updated, cryptoKey);
  },
}));
