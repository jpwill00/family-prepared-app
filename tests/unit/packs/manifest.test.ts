// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  parsePackManifest,
  serializePackManifest,
  parseInstalledPacks,
  serializeInstalledPacks,
  PackManifestError,
} from "@/lib/packs/manifest";
import type { PackManifest, InstalledPacks } from "@/types/pack";

const VALID_MANIFEST_YAML = `
id: wilderness-medicine
version: 1.2.0
title: Wilderness Medicine Essentials
author:
  name: Jane Doe
  url: https://github.com/janedoe
license: CC-BY-4.0
sources:
  - MIT OpenCourseWare HST.121
content_areas:
  - path: content/trauma-triage
    content_type: article_collection
  - path: content/wound-care
    content_type: article_collection
requires:
  app_min_version: 0.4.0
checksum: sha256:abc123def456
`.trim();

const VALID_MANIFEST: PackManifest = {
  id: "wilderness-medicine",
  version: "1.2.0",
  title: "Wilderness Medicine Essentials",
  author: { name: "Jane Doe", url: "https://github.com/janedoe" },
  license: "CC-BY-4.0",
  sources: ["MIT OpenCourseWare HST.121"],
  content_areas: [
    { path: "content/trauma-triage", content_type: "article_collection" },
    { path: "content/wound-care", content_type: "article_collection" },
  ],
  requires: { app_min_version: "0.4.0" },
  checksum: "sha256:abc123def456",
};

const VALID_INSTALLED_YAML = `
schemaVersion: 1
installed:
  - id: wilderness-medicine
    version: 1.2.0
    installedAt: "2026-05-16T12:00:00Z"
    source: https://example.com/pack.zip
    checksum: sha256:abc123def456
`.trim();

describe("parsePackManifest", () => {
  it("parses a valid pack manifest", () => {
    const result = parsePackManifest(VALID_MANIFEST_YAML);
    expect(result.id).toBe("wilderness-medicine");
    expect(result.version).toBe("1.2.0");
    expect(result.title).toBe("Wilderness Medicine Essentials");
    expect(result.author.name).toBe("Jane Doe");
    expect(result.content_areas).toHaveLength(2);
    expect(result.requires?.app_min_version).toBe("0.4.0");
  });

  it("accepts a manifest without optional fields", () => {
    const minimal = `
id: my-pack
version: 1.0.0
title: My Pack
author:
  name: Alice
license: MIT
content_areas:
  - path: content/articles
    content_type: article_collection
`.trim();
    const result = parsePackManifest(minimal);
    expect(result.id).toBe("my-pack");
    expect(result.sources).toBeUndefined();
    expect(result.requires).toBeUndefined();
    expect(result.checksum).toBeUndefined();
  });

  it("throws PackManifestError for invalid YAML", () => {
    expect(() => parsePackManifest("id: [unclosed")).toThrow(PackManifestError);
  });

  it("throws PackManifestError when id is missing", () => {
    const bad = VALID_MANIFEST_YAML.replace("id: wilderness-medicine\n", "");
    expect(() => parsePackManifest(bad)).toThrow(PackManifestError);
  });

  it("throws PackManifestError when id contains uppercase", () => {
    const bad = VALID_MANIFEST_YAML.replace("id: wilderness-medicine", "id: Wilderness-Medicine");
    expect(() => parsePackManifest(bad)).toThrow(PackManifestError);
  });

  it("throws PackManifestError when content_areas is empty", () => {
    const bad = VALID_MANIFEST_YAML.replace(
      /content_areas:[\s\S]*?checksum:/,
      "content_areas: []\nchecksum:"
    );
    expect(() => parsePackManifest(bad)).toThrow(PackManifestError);
  });

  it("throws PackManifestError for unknown content_type", () => {
    const bad = VALID_MANIFEST_YAML.replace(
      "content_type: article_collection",
      "content_type: magic_type"
    );
    expect(() => parsePackManifest(bad)).toThrow(PackManifestError);
  });
});

describe("serializePackManifest / round-trip", () => {
  it("round-trips a valid manifest through serialize → parse", () => {
    const serialized = serializePackManifest(VALID_MANIFEST);
    const restored = parsePackManifest(serialized);
    expect(restored).toEqual(VALID_MANIFEST);
  });

  it("produces YAML string", () => {
    const serialized = serializePackManifest(VALID_MANIFEST);
    expect(typeof serialized).toBe("string");
    expect(serialized).toContain("id: wilderness-medicine");
    expect(serialized).toContain("version: 1.2.0");
  });
});

describe("parseInstalledPacks", () => {
  it("parses a valid _installed.yaml", () => {
    const result = parseInstalledPacks(VALID_INSTALLED_YAML);
    expect(result.schemaVersion).toBe(1);
    expect(result.installed).toHaveLength(1);
    expect(result.installed[0].id).toBe("wilderness-medicine");
    expect(result.installed[0].version).toBe("1.2.0");
  });

  it("returns empty installed list for null/empty YAML", () => {
    expect(parseInstalledPacks("")).toEqual({ schemaVersion: 1, installed: [] });
    expect(parseInstalledPacks("~")).toEqual({ schemaVersion: 1, installed: [] });
  });

  it("throws PackManifestError for invalid YAML", () => {
    expect(() => parseInstalledPacks("schemaVersion: [unclosed")).toThrow(PackManifestError);
  });

  it("throws PackManifestError when entry is missing required fields", () => {
    const bad = `
schemaVersion: 1
installed:
  - id: my-pack
`.trim();
    expect(() => parseInstalledPacks(bad)).toThrow(PackManifestError);
  });
});

describe("serializeInstalledPacks / round-trip", () => {
  it("round-trips installed packs through serialize → parse", () => {
    const packs: InstalledPacks = {
      schemaVersion: 1,
      installed: [
        {
          id: "wilderness-medicine",
          version: "1.2.0",
          installedAt: "2026-05-16T12:00:00Z",
          source: "https://example.com/pack.zip",
          checksum: "sha256:abc123",
        },
      ],
    };
    const serialized = serializeInstalledPacks(packs);
    const restored = parseInstalledPacks(serialized);
    expect(restored).toEqual(packs);
  });

  it("round-trips an empty installed list", () => {
    const packs: InstalledPacks = { schemaVersion: 1, installed: [] };
    const restored = parseInstalledPacks(serializeInstalledPacks(packs));
    expect(restored).toEqual(packs);
  });
});
