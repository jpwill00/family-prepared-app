import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  pushSnapshot,
  listSnapshots,
  pullLatest,
  restoreFromSnapshot,
} from "@/lib/drive/sync";
import { DriveAuthError } from "@/lib/drive/auth";
import type { Repo } from "@/types/plan";

// Mock auth module so we never touch real GIS
vi.mock("@/lib/drive/auth", () => ({
  getAccessToken: vi.fn().mockResolvedValue("test-token"),
  DriveAuthError: class DriveAuthError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "DriveAuthError";
    }
  },
}));

// Mock IDB persistence
vi.mock("@/lib/persistence/idb", () => ({
  saveSyncMeta: vi.fn().mockResolvedValue(undefined),
  loadSyncMeta: vi.fn().mockResolvedValue(null),
}));

import { saveSyncMeta } from "@/lib/persistence/idb";

const EMPTY_REPO: Repo = { schemaVersion: 1 };

const FOLDER_ID = "folder-abc";
const FILE_ID = "file-xyz";

// Minimal Drive API response shapes
const mkFolderListResp = (found: boolean) =>
  new Response(
    JSON.stringify({ files: found ? [{ id: FOLDER_ID }] : [] }),
    { status: 200 }
  );

const mkFolderCreateResp = () =>
  new Response(JSON.stringify({ id: FOLDER_ID }), { status: 200 });

const mkUploadResp = () =>
  new Response(JSON.stringify({ id: FILE_ID }), { status: 200 });

const mkListResp = (files: object[]) =>
  new Response(JSON.stringify({ files }), { status: 200 });

const mk401 = () => new Response("Unauthorized", { status: 401 });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pushSnapshot", () => {
  it("creates folder if not found, uploads ZIP, saves sync meta", async () => {
    let callIdx = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      const responses = [
        mkFolderListResp(false),  // folder search → not found
        mkFolderCreateResp(),      // folder create
        mkUploadResp(),            // file upload
      ];
      return Promise.resolve(responses[callIdx++]);
    }));

    const id = await pushSnapshot(EMPTY_REPO);
    expect(id).toBe(FILE_ID);
    expect(vi.mocked(saveSyncMeta)).toHaveBeenCalledOnce();
    expect(vi.mocked(saveSyncMeta).mock.calls[0][0].lastPushSnapshotId).toBe(FILE_ID);
  });

  it("reuses existing folder on second push", async () => {
    let callIdx = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      const responses = [
        mkFolderListResp(true),  // folder search → found
        mkUploadResp(),           // file upload
      ];
      return Promise.resolve(responses[callIdx++]);
    }));

    const id = await pushSnapshot(EMPTY_REPO);
    expect(id).toBe(FILE_ID);
    // Only 2 calls: list + upload (no create)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("surfaces DriveAuthError on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mk401()));
    await expect(pushSnapshot(EMPTY_REPO)).rejects.toThrow(DriveAuthError);
    await expect(pushSnapshot(EMPTY_REPO)).rejects.toThrow(/revoked/i);
  });
});

describe("listSnapshots", () => {
  it("returns snapshots ordered by createdTime desc", async () => {
    const snapshots = [
      { id: "f2", name: "2026-05-16.zip", createdTime: "2026-05-16T10:00:00Z", size: "1024" },
      { id: "f1", name: "2026-05-15.zip", createdTime: "2026-05-15T10:00:00Z", size: "900" },
    ];
    let callIdx = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      const responses = [mkFolderListResp(true), mkListResp(snapshots)];
      return Promise.resolve(responses[callIdx++]);
    }));

    const result = await listSnapshots();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("f2");
  });

  it("returns empty array when folder has no snapshots", async () => {
    let callIdx = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      const responses = [mkFolderListResp(true), mkListResp([])];
      return Promise.resolve(responses[callIdx++]);
    }));

    const result = await listSnapshots();
    expect(result).toHaveLength(0);
  });
});

describe("restoreFromSnapshot", () => {
  it("downloads file by ID and deserializes to Repo", async () => {
    // Build a real ZIP and pass it as ArrayBuffer (what arrayBuffer() returns)
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({ schemaVersion: 1, appVersion: "1.0.0", createdAt: new Date().toISOString() }));
    const uint8Array = await zip.generateAsync({ type: "uint8array" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(uint8Array.buffer as ArrayBuffer, { status: 200 })
    ));

    const repo = await restoreFromSnapshot(FILE_ID);
    expect(repo.schemaVersion).toBe(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining(FILE_ID),
      expect.objectContaining({})
    );
  });

  it("surfaces DriveAuthError on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mk401()));
    await expect(restoreFromSnapshot(FILE_ID)).rejects.toThrow(DriveAuthError);
  });
});

describe("pullLatest", () => {
  it("returns null when no snapshots exist", async () => {
    let callIdx = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      const responses = [mkFolderListResp(true), mkListResp([])];
      return Promise.resolve(responses[callIdx++]);
    }));

    const result = await pullLatest();
    expect(result).toBeNull();
  });

  it("restores the most recent snapshot", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({ schemaVersion: 1, appVersion: "1.0.0", createdAt: new Date().toISOString() }));
    const uint8Array = await zip.generateAsync({ type: "uint8array" });

    const snapshots = [
      { id: "newest", name: "2026-05-16.zip", createdTime: "2026-05-16T10:00:00Z", size: "1024" },
    ];
    let callIdx = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      const responses = [
        mkFolderListResp(true),
        mkListResp(snapshots),
        new Response(uint8Array.buffer as ArrayBuffer, { status: 200 }),
      ];
      return Promise.resolve(responses[callIdx++]);
    }));

    const repo = await pullLatest();
    expect(repo?.schemaVersion).toBe(1);
  });
});
