// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import { importPackFromBlob, PackImportError } from "@/lib/packs/import";

vi.mock("@/lib/persistence/idb", () => ({
  savePackContent: vi.fn().mockResolvedValue(undefined),
  loadInstalledPacks: vi.fn().mockResolvedValue(null),
  saveInstalledPacks: vi.fn().mockResolvedValue(undefined),
}));

import {
  savePackContent,
  loadInstalledPacks,
  saveInstalledPacks,
} from "@/lib/persistence/idb";

const VALID_MANIFEST_YAML = `
id: test-pack
version: 1.0.0
title: Test Pack
author:
  name: Alice
license: CC-BY-4.0
content_areas:
  - path: content/articles
    content_type: article_collection
`.trim();

async function makeZip(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "uint8array" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadInstalledPacks).mockResolvedValue(null);
});

describe("importPackFromBlob — success", () => {
  it("returns the parsed manifest on success", async () => {
    const blob = await makeZip({
      "pack.yaml": VALID_MANIFEST_YAML,
      "content/articles/intro.md": "# Intro",
    });
    const manifest = await importPackFromBlob(blob);
    expect(manifest.id).toBe("test-pack");
    expect(manifest.version).toBe("1.0.0");
  });

  it("saves pack content to IDB", async () => {
    const blob = await makeZip({
      "pack.yaml": VALID_MANIFEST_YAML,
      "content/articles/intro.md": "# Intro\nBody text.",
    });
    await importPackFromBlob(blob);
    expect(savePackContent).toHaveBeenCalledWith(
      "test-pack",
      expect.objectContaining({
        "pack.yaml": expect.any(String),
        "content/articles/intro.md": "# Intro\nBody text.",
      })
    );
  });

  it("saves updated _installed.yaml lockfile", async () => {
    const blob = await makeZip({ "pack.yaml": VALID_MANIFEST_YAML });
    await importPackFromBlob(blob);
    expect(saveInstalledPacks).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaVersion: 1,
        installed: expect.arrayContaining([
          expect.objectContaining({ id: "test-pack", version: "1.0.0" }),
        ]),
      })
    );
  });

  it("replaces an existing entry with the same id", async () => {
    vi.mocked(loadInstalledPacks).mockResolvedValue({
      schemaVersion: 1,
      installed: [
        { id: "test-pack", version: "0.9.0", installedAt: "2026-01-01T00:00:00Z" },
      ],
    });
    const blob = await makeZip({ "pack.yaml": VALID_MANIFEST_YAML });
    await importPackFromBlob(blob);
    const saved = vi.mocked(saveInstalledPacks).mock.calls[0][0];
    expect(saved.installed).toHaveLength(1);
    expect(saved.installed[0].version).toBe("1.0.0");
  });

  it("appends to existing installed packs without replacing others", async () => {
    vi.mocked(loadInstalledPacks).mockResolvedValue({
      schemaVersion: 1,
      installed: [
        { id: "other-pack", version: "2.0.0", installedAt: "2026-01-01T00:00:00Z" },
      ],
    });
    const blob = await makeZip({ "pack.yaml": VALID_MANIFEST_YAML });
    await importPackFromBlob(blob);
    const saved = vi.mocked(saveInstalledPacks).mock.calls[0][0];
    expect(saved.installed).toHaveLength(2);
    expect(saved.installed.map((e: { id: string }) => e.id)).toContain("other-pack");
    expect(saved.installed.map((e: { id: string }) => e.id)).toContain("test-pack");
  });
});

describe("importPackFromBlob — errors", () => {
  it("throws PackImportError for corrupt ZIP", async () => {
    const notAZip = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    await expect(importPackFromBlob(notAZip)).rejects.toThrow(PackImportError);
  });

  it("throws PackImportError when pack.yaml is missing", async () => {
    const data = await makeZip({ "README.md": "hello" });
    await expect(importPackFromBlob(data)).rejects.toThrow(PackImportError);
    await expect(importPackFromBlob(data)).rejects.toThrow(/missing pack\.yaml/i);
  });

  it("throws PackImportError when pack.yaml is invalid", async () => {
    const blob = await makeZip({ "pack.yaml": "id: INVALID ID WITH SPACES\nversion: 1.0.0" });
    await expect(importPackFromBlob(blob)).rejects.toThrow(PackImportError);
  });
});
