import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePlanStore } from "@/lib/store/plan";

// Mock the persistence layer so tests don't need a real IDB environment
vi.mock("@/lib/persistence/idb", () => ({
  loadRepo: vi.fn().mockResolvedValue({ schemaVersion: 1 }),
  saveRepo: vi.fn().mockResolvedValue(undefined),
}));

import { loadRepo, saveRepo } from "@/lib/persistence/idb";

const mockLoadRepo = vi.mocked(loadRepo);
const mockSaveRepo = vi.mocked(saveRepo);

beforeEach(() => {
  // Reset store to initial state between tests
  usePlanStore.setState({ repo: { schemaVersion: 1 }, hydrated: false });
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
