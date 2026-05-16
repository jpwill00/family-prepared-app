import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePlanStore } from "@/lib/store/plan";

// Mock the persistence layer so tests don't need a real IDB environment
vi.mock("@/lib/persistence/idb", () => ({
  loadRepo: vi.fn().mockResolvedValue({ schemaVersion: 1 }),
  saveRepo: vi.fn().mockResolvedValue(undefined),
  loadCryptoSalt: vi.fn().mockResolvedValue(null),
  saveCryptoSalt: vi.fn().mockResolvedValue(undefined),
}));

// Mock crypto layer — store tests don't test crypto primitives, just integration
vi.mock("@/lib/crypto/secure", () => ({
  deriveKey: vi.fn().mockResolvedValue(
    { type: "secret", algorithm: { name: "AES-GCM" } } as unknown as CryptoKey
  ),
  encryptRepo: vi.fn().mockImplementation((repo: unknown) => Promise.resolve(repo)),
  decryptRepo: vi.fn().mockImplementation((repo: unknown) => Promise.resolve(repo)),
  getOrCreateSalt: vi.fn().mockResolvedValue(new Uint8Array(16).fill(1)),
}));

import { loadRepo, saveRepo } from "@/lib/persistence/idb";
import { deriveKey, encryptRepo } from "@/lib/crypto/secure";

const mockLoadRepo = vi.mocked(loadRepo);
const mockSaveRepo = vi.mocked(saveRepo);

beforeEach(() => {
  // Reset store to initial state between tests
  usePlanStore.setState({ repo: { schemaVersion: 1 }, hydrated: false, cryptoKey: null });
  vi.clearAllMocks();
});

describe("usePlanStore — hydrate", () => {
  it("loads repo from IDB and sets hydrated=true", async () => {
    const stored = {
      schemaVersion: 1 as const,
      household: { schemaVersion: 1 as const, members: [] },
    };
    mockLoadRepo.mockResolvedValueOnce(stored);

    await usePlanStore.getState().hydrate();

    expect(usePlanStore.getState().hydrated).toBe(true);
    expect(usePlanStore.getState().repo.household).toEqual(stored.household);
  });

  it("starts with hydrated=false before hydrate() is called", () => {
    expect(usePlanStore.getState().hydrated).toBe(false);
  });
});

describe("usePlanStore — setHousehold", () => {
  it("updates repo.household in store", async () => {
    const household = {
      schemaVersion: 1 as const,
      members: [{ id: "00000000-0000-0000-0000-000000000001", name: "Alice" }],
    };

    await usePlanStore.getState().setHousehold(household);

    expect(usePlanStore.getState().repo.household).toEqual(household);
  });

  it("persists via saveRepo", async () => {
    const household = { schemaVersion: 1 as const, members: [] };

    await usePlanStore.getState().setHousehold(household);

    expect(mockSaveRepo).toHaveBeenCalledOnce();
    expect(mockSaveRepo).toHaveBeenCalledWith(
      expect.objectContaining({ household })
    );
  });
});

describe("usePlanStore — setCommunicationPlan", () => {
  it("updates repo.communicationPlan and persists", async () => {
    const plan = {
      schemaVersion: 1 as const,
      primary: { method: "Cell phone" },
      alternate: { method: "Text" },
      contingency: { method: "Radio" },
      emergency: { method: "Landline" },
    };

    await usePlanStore.getState().setCommunicationPlan(plan);

    expect(usePlanStore.getState().repo.communicationPlan).toEqual(plan);
    expect(mockSaveRepo).toHaveBeenCalledOnce();
  });
});

describe("usePlanStore — setEvacuationPlan", () => {
  it("updates repo.evacuationPlan and persists", async () => {
    const ep = {
      schemaVersion: 1 as const,
      primaryRoute: { label: "North via I-5" },
      rendezvousPoints: [],
    };

    await usePlanStore.getState().setEvacuationPlan(ep);

    expect(usePlanStore.getState().repo.evacuationPlan).toEqual(ep);
    expect(mockSaveRepo).toHaveBeenCalledOnce();
  });
});

describe("usePlanStore — setResourceInventory", () => {
  it("updates repo.resourceInventory and persists", async () => {
    const inv = { schemaVersion: 1 as const, items: [] };

    await usePlanStore.getState().setResourceInventory(inv);

    expect(usePlanStore.getState().repo.resourceInventory).toEqual(inv);
    expect(mockSaveRepo).toHaveBeenCalledOnce();
  });
});

describe("usePlanStore — setLegalDocuments", () => {
  it("updates repo.legalDocuments and persists", async () => {
    const docs = { schemaVersion: 1 as const, documents: [] };

    await usePlanStore.getState().setLegalDocuments(docs);

    expect(usePlanStore.getState().repo.legalDocuments).toEqual(docs);
    expect(mockSaveRepo).toHaveBeenCalledOnce();
  });
});

describe("usePlanStore — setUtilityShutoffs", () => {
  it("updates repo.utilityShutoffs and persists", async () => {
    const us = { schemaVersion: 1 as const, shutoffs: [] };

    await usePlanStore.getState().setUtilityShutoffs(us);

    expect(usePlanStore.getState().repo.utilityShutoffs).toEqual(us);
    expect(mockSaveRepo).toHaveBeenCalledOnce();
  });
});

describe("usePlanStore — mutation immutability", () => {
  it("each setter creates a new repo object (does not mutate in place)", async () => {
    const before = usePlanStore.getState().repo;

    await usePlanStore.getState().setHousehold({ schemaVersion: 1, members: [] });

    const after = usePlanStore.getState().repo;
    expect(after).not.toBe(before);
  });
});

describe("usePlanStore — setPassphrase", () => {
  it("derives a key and stores it in the store", async () => {
    await usePlanStore.getState().setPassphrase("my-passphrase");
    expect(deriveKey).toHaveBeenCalledWith("my-passphrase", expect.any(Uint8Array));
    // The stored key is whatever deriveKey resolved to
    expect(usePlanStore.getState().cryptoKey).not.toBeNull();
  });

  it("re-encrypts and persists the repo after setting passphrase", async () => {
    await usePlanStore.getState().setPassphrase("my-passphrase");
    expect(encryptRepo).toHaveBeenCalledOnce();
    expect(saveRepo).toHaveBeenCalledOnce();
  });
});

describe("usePlanStore — clearPassphrase", () => {
  it("clears the cryptoKey from the store", async () => {
    // Set a key first via setPassphrase
    await usePlanStore.getState().setPassphrase("my-passphrase");
    expect(usePlanStore.getState().cryptoKey).not.toBeNull();

    usePlanStore.getState().clearPassphrase();
    expect(usePlanStore.getState().cryptoKey).toBeNull();
  });
});

describe("usePlanStore — crypto-aware setters", () => {
  it("encryptRepo is called when cryptoKey is set", async () => {
    await usePlanStore.getState().setPassphrase("my-passphrase");
    vi.clearAllMocks(); // clear the setPassphrase-triggered call
    await usePlanStore.getState().setHousehold({ schemaVersion: 1, members: [] });
    expect(encryptRepo).toHaveBeenCalledOnce();
  });

  it("encryptRepo is NOT called when cryptoKey is null", async () => {
    await usePlanStore.getState().setHousehold({ schemaVersion: 1, members: [] });
    expect(encryptRepo).not.toHaveBeenCalled();
  });
});
