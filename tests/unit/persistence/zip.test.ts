import { describe, it, expect } from "vitest";
import { repoToZip, zipToRepo, ZipError } from "@/lib/persistence/zip";
import type { Repo } from "@/types/plan";

// Minimal but valid zone fixtures
const HOUSEHOLD: Repo["household"] = {
  schemaVersion: 1,
  members: [
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Alice",
    },
  ],
};

const COMM_PLAN: Repo["communicationPlan"] = {
  schemaVersion: 1,
  primary: { method: "Cell phone" },
  alternate: { method: "Text message" },
  contingency: { method: "Email" },
  emergency: { method: "Ham radio" },
};

const FULL_REPO: Repo = {
  schemaVersion: 1,
  household: HOUSEHOLD,
  communicationPlan: COMM_PLAN,
  evacuationPlan: {
    schemaVersion: 1,
    primaryRoute: { label: "Primary" },
    rendezvousPoints: [],
  },
  resourceInventory: {
    schemaVersion: 1,
    items: [],
  },
  legalDocuments: {
    schemaVersion: 1,
    documents: [],
  },
  utilityShutoffs: {
    schemaVersion: 1,
    shutoffs: [],
  },
};

describe("repoToZip + zipToRepo round-trip", () => {
  it("empty repo produces valid ZIP that round-trips to schemaVersion:1", async () => {
    const repo: Repo = { schemaVersion: 1 };
    const blob = await repoToZip(repo);
    expect(blob.size).toBeGreaterThan(0);

    const restored = await zipToRepo(blob);
    expect(restored.schemaVersion).toBe(1);
    expect(restored.household).toBeUndefined();
  });

  it("partial repo (household only) round-trips correctly", async () => {
    const repo: Repo = { schemaVersion: 1, household: HOUSEHOLD };
    const blob = await repoToZip(repo);
    const restored = await zipToRepo(blob);

    expect(restored.household?.members[0].name).toBe("Alice");
    expect(restored.communicationPlan).toBeUndefined();
  });

  it("full repo round-trips all six zones", async () => {
    const blob = await repoToZip(FULL_REPO);
    const restored = await zipToRepo(blob);

    expect(restored.household?.members[0].name).toBe("Alice");
    expect(restored.communicationPlan?.primary.method).toBe("Cell phone");
    expect(restored.evacuationPlan?.rendezvousPoints).toEqual([]);
    expect(restored.resourceInventory?.items).toEqual([]);
    expect(restored.legalDocuments?.documents).toEqual([]);
    expect(restored.utilityShutoffs?.shutoffs).toEqual([]);
  });

  it("ZIP blob contains manifest.json", async () => {
    const JSZip = (await import("jszip")).default;
    const blob = await repoToZip({ schemaVersion: 1 });
    const zip = await JSZip.loadAsync(blob);
    const manifest = zip.file("manifest.json");
    expect(manifest).not.toBeNull();
    const content = JSON.parse(await manifest!.async("string"));
    expect(content.schemaVersion).toBe(1);
    expect(content.createdAt).toBeTruthy();
  });

  it("ZIP blob contains only defined zone files", async () => {
    const JSZip = (await import("jszip")).default;
    const blob = await repoToZip({ schemaVersion: 1, household: HOUSEHOLD });
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file("plan/household.yaml")).not.toBeNull();
    expect(zip.file("plan/communications.yaml")).toBeNull();
  });
});

describe("zipToRepo error handling", () => {
  it("throws ZipError for corrupt input", async () => {
    const bad = new Blob(["not a zip"], { type: "application/zip" });
    await expect(zipToRepo(bad)).rejects.toThrow(ZipError);
    await expect(zipToRepo(bad)).rejects.toThrow(/corrupt|not a valid/i);
  });

  it("throws ZipError for ZIP missing manifest.json", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("random.txt", "hello");
    const blob = await zip.generateAsync({ type: "blob" });
    await expect(zipToRepo(blob)).rejects.toThrow(ZipError);
    await expect(zipToRepo(blob)).rejects.toThrow(/manifest/i);
  });
});
