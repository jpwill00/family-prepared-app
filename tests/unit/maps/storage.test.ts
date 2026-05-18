import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  writeTileFile,
  readTileFile,
  deleteTileArea,
  listTileFiles,
  getStorageBudget,
  requestPersistentStorage,
} from "@/lib/maps/storage";

// ---------------------------------------------------------------------------
// In-memory OPFS mock
// ---------------------------------------------------------------------------

type AreaStore = Map<string, ArrayBuffer>;
type FSStore = Map<string, AreaStore>;

function buildOPFSMock(store: FSStore) {
  function makeAreaHandle(areaId: string) {
    if (!store.has(areaId)) store.set(areaId, new Map());
    const files = store.get(areaId)!;
    return {
      getFileHandle: vi.fn(async (filename: string, opts?: { create?: boolean }) => {
        if (!files.has(filename) && !opts?.create) {
          throw Object.assign(new Error(filename), { name: "NotFoundError" });
        }
        return {
          getFile: vi.fn(async () => ({
            arrayBuffer: vi.fn(async () => files.get(filename) ?? new ArrayBuffer(0)),
          })),
          createWritable: vi.fn(async () => ({
            write: vi.fn(async (data: ArrayBuffer) => {
              files.set(filename, data);
            }),
            close: vi.fn(async () => {}),
          })),
        };
      }),
      keys: async function* () {
        for (const k of files.keys()) yield k;
      },
    };
  }

  const mapsHandle = {
    getDirectoryHandle: vi.fn(async (areaId: string) => makeAreaHandle(areaId)),
    removeEntry: vi.fn(async (areaId: string) => {
      store.delete(areaId);
    }),
  };

  return {
    getDirectory: vi.fn(async () => ({
      getDirectoryHandle: vi.fn(async () => mapsHandle),
    })),
    estimate: vi.fn(async () => ({ usage: 5_000, quota: 100_000 })),
    persist: vi.fn(async () => true),
  };
}

let store: FSStore;
let storageMock: ReturnType<typeof buildOPFSMock>;

beforeEach(() => {
  store = new Map();
  storageMock = buildOPFSMock(store);
  Object.defineProperty(navigator, "storage", {
    value: storageMock,
    writable: true,
    configurable: true,
  });
});

// ---------------------------------------------------------------------------
// writeTileFile / readTileFile
// ---------------------------------------------------------------------------

describe("writeTileFile + readTileFile", () => {
  it("roundtrips an ArrayBuffer through OPFS", async () => {
    const data = new TextEncoder().encode("hello tiles").buffer as ArrayBuffer;
    await writeTileFile("evac-routes", "region.pmtiles", data);
    const result = await readTileFile("evac-routes", "region.pmtiles");
    expect(result).not.toBeNull();
    expect(new TextDecoder().decode(result!)).toBe("hello tiles");
  });

  it("returns null for a missing file", async () => {
    const result = await readTileFile("evac-routes", "nonexistent.pmtiles");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteTileArea
// ---------------------------------------------------------------------------

describe("deleteTileArea", () => {
  it("removes the area from storage", async () => {
    const data = new Uint8Array([1, 2, 3]).buffer as ArrayBuffer;
    await writeTileFile("flood-zones", "tiles.pmtiles", data);
    await deleteTileArea("flood-zones");
    expect(store.has("flood-zones")).toBe(false);
  });

  it("is a no-op when area does not exist", async () => {
    await expect(deleteTileArea("ghost-area")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// listTileFiles
// ---------------------------------------------------------------------------

describe("listTileFiles", () => {
  it("returns sorted filenames for an existing area", async () => {
    const buf = new Uint8Array([0]).buffer as ArrayBuffer;
    await writeTileFile("shelter", "z.pmtiles", buf);
    await writeTileFile("shelter", "a.geojson", buf);
    await writeTileFile("shelter", "m.geojson", buf);
    const names = await listTileFiles("shelter");
    expect(names).toEqual(["a.geojson", "m.geojson", "z.pmtiles"]);
  });

  it("returns [] for a non-existent area", async () => {
    const names = await listTileFiles("nowhere");
    expect(names).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getStorageBudget
// ---------------------------------------------------------------------------

describe("getStorageBudget", () => {
  it("returns correct used/quota/fraction from estimate()", async () => {
    const budget = await getStorageBudget();
    expect(budget.usedBytes).toBe(5_000);
    expect(budget.quotaBytes).toBe(100_000);
    expect(budget.usedFraction).toBeCloseTo(0.05);
  });

  it("returns usedFraction 0 when quota is 0", async () => {
    storageMock.estimate.mockResolvedValueOnce({ usage: 0, quota: 0 });
    const budget = await getStorageBudget();
    expect(budget.usedFraction).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// requestPersistentStorage
// ---------------------------------------------------------------------------

describe("requestPersistentStorage", () => {
  it("calls persist() and returns true", async () => {
    const result = await requestPersistentStorage();
    expect(result).toBe(true);
    expect(storageMock.persist).toHaveBeenCalled();
  });

  it("returns false when persist() is not available", async () => {
    Object.defineProperty(navigator, "storage", {
      value: { ...storageMock, persist: undefined },
      writable: true,
      configurable: true,
    });
    const result = await requestPersistentStorage();
    expect(result).toBe(false);
  });
});
