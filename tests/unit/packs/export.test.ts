// @vitest-environment node
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { exportPackToZip, PackExportError } from "@/lib/packs/export";
import { parsePackManifest } from "@/lib/packs/manifest";
import type { PackManifest } from "@/types/pack";

const MANIFEST: PackManifest = {
  id: "my-evac-guide",
  version: "1.0.0",
  title: "My Evacuation Guide",
  author: { name: "Alice" },
  license: "CC-BY-4.0",
  content_areas: [{ path: "content", content_type: "article_collection" }],
};

const FILES = {
  "content/intro.md": "# Intro\nThis is the intro.",
  "content/routes.md": "# Routes\nRoute A is fastest.",
};

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

describe("exportPackToZip", () => {
  it("produces a ZIP containing pack.yaml", async () => {
    const blob = await exportPackToZip(MANIFEST, FILES);
    const data = await blobToUint8Array(blob);
    const zip = await JSZip.loadAsync(data);
    expect(zip.file("pack.yaml")).not.toBeNull();
  });

  it("pack.yaml parses back to the original manifest", async () => {
    const blob = await exportPackToZip(MANIFEST, FILES);
    const data = await blobToUint8Array(blob);
    const zip = await JSZip.loadAsync(data);
    const raw = await zip.file("pack.yaml")!.async("string");
    const restored = parsePackManifest(raw);
    expect(restored).toEqual(MANIFEST);
  });

  it("includes all provided content files", async () => {
    const blob = await exportPackToZip(MANIFEST, FILES);
    const data = await blobToUint8Array(blob);
    const zip = await JSZip.loadAsync(data);
    expect(zip.file("content/intro.md")).not.toBeNull();
    expect(zip.file("content/routes.md")).not.toBeNull();
    const intro = await zip.file("content/intro.md")!.async("string");
    expect(intro).toBe("# Intro\nThis is the intro.");
  });

  it("does not include a duplicate pack.yaml from the files map", async () => {
    const filesWithManifest = {
      ...FILES,
      "pack.yaml": "id: stale\nversion: 0.0.0\ntitle: Old\nauthor:\n  name: Old\nlicense: MIT\ncontent_areas:\n  - path: content\n    content_type: article_collection",
    };
    const blob = await exportPackToZip(MANIFEST, filesWithManifest);
    const data = await blobToUint8Array(blob);
    const zip = await JSZip.loadAsync(data);
    const raw = await zip.file("pack.yaml")!.async("string");
    const restored = parsePackManifest(raw);
    // Should use the passed manifest, not the stale one in files
    expect(restored.id).toBe("my-evac-guide");
    expect(restored.version).toBe("1.0.0");
  });

  it("throws PackExportError when files map is empty", async () => {
    await expect(exportPackToZip(MANIFEST, {})).rejects.toThrow(PackExportError);
  });

  it("round-trip: export then re-import recovers manifest and files", async () => {
    const blob = await exportPackToZip(MANIFEST, FILES);
    const data = await blobToUint8Array(blob);
    const zip = await JSZip.loadAsync(data);

    const manifestRaw = await zip.file("pack.yaml")!.async("string");
    const roundTripped = parsePackManifest(manifestRaw);
    expect(roundTripped).toEqual(MANIFEST);

    const introRaw = await zip.file("content/intro.md")!.async("string");
    expect(introRaw).toBe(FILES["content/intro.md"]);
  });
});
