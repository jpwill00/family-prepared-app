import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { parseContentMeta, parseArticle, BUILTIN_CONTENT_TYPES } from "@/lib/content/registry";

const SEED_LIBRARY = resolve(__dirname, "../../../seed/library");

// Enumerate every area folder (directories only)
const areas = readdirSync(SEED_LIBRARY, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

// ---------------------------------------------------------------------------
// _meta.yaml: every area must have one and resolve to a known content_type
// ---------------------------------------------------------------------------

describe("seed library _meta.yaml", () => {
  it("every area has a _meta.yaml", () => {
    expect(areas.length).toBeGreaterThan(0);
    for (const area of areas) {
      const metaPath = join(SEED_LIBRARY, area, "_meta.yaml");
      expect(() => readFileSync(metaPath, "utf8"), `${area}/_meta.yaml must exist`).not.toThrow();
    }
  });

  it("every _meta.yaml parses and has a known content_type", () => {
    for (const area of areas) {
      const raw = readFileSync(join(SEED_LIBRARY, area, "_meta.yaml"), "utf8");
      const meta = parseContentMeta(raw);
      expect(
        (BUILTIN_CONTENT_TYPES as readonly string[]).includes(meta.content_type),
        `${area}: unknown content_type "${meta.content_type}"`
      ).toBe(true);
    }
  });

  it("all seed areas are article_collection", () => {
    for (const area of areas) {
      const raw = readFileSync(join(SEED_LIBRARY, area, "_meta.yaml"), "utf8");
      const meta = parseContentMeta(raw);
      expect(meta.content_type).toBe("article_collection");
    }
  });

  it("every _meta.yaml has a non-empty title", () => {
    for (const area of areas) {
      const raw = readFileSync(join(SEED_LIBRARY, area, "_meta.yaml"), "utf8");
      const meta = parseContentMeta(raw);
      expect(meta.title.length).toBeGreaterThan(0);
    }
  });

  it("covers all 10 expected areas", () => {
    const expected = [
      "first-aid",
      "communications",
      "water",
      "food",
      "shelter",
      "evacuation",
      "documents",
      "power",
      "pets",
      "mental-health",
    ];
    for (const name of expected) {
      expect(areas, `area "${name}" missing from seed/library`).toContain(name);
    }
  });
});

// ---------------------------------------------------------------------------
// Articles: every .md file must parse with valid frontmatter
// ---------------------------------------------------------------------------

describe("seed library articles", () => {
  const articles: Array<{ area: string; slug: string; path: string }> = [];
  for (const area of areas) {
    const files = readdirSync(join(SEED_LIBRARY, area)).filter(
      (f) => f.endsWith(".md")
    );
    for (const f of files) {
      articles.push({
        area,
        slug: f.replace(/\.md$/, ""),
        path: join(SEED_LIBRARY, area, f),
      });
    }
  }

  it("at least 18 articles shipped in seed library", () => {
    expect(articles.length).toBeGreaterThanOrEqual(18);
  });

  it("every article has valid YAML frontmatter", () => {
    for (const { area, slug, path } of articles) {
      const raw = readFileSync(path, "utf8");
      expect(
        () => parseArticle(slug, raw),
        `${area}/${slug}.md frontmatter must parse`
      ).not.toThrow();
    }
  });

  it("every article frontmatter has a non-empty title", () => {
    for (const { area, slug, path } of articles) {
      const raw = readFileSync(path, "utf8");
      const parsed = parseArticle(slug, raw);
      expect(
        parsed.frontmatter.title.length,
        `${area}/${slug}.md must have a title`
      ).toBeGreaterThan(0);
    }
  });

  it("every article has a non-empty body", () => {
    for (const { area, slug, path } of articles) {
      const raw = readFileSync(path, "utf8");
      const parsed = parseArticle(slug, raw);
      expect(
        parsed.body.length,
        `${area}/${slug}.md must have body content`
      ).toBeGreaterThan(0);
    }
  });

  it("slug matches filename", () => {
    for (const { slug, path } of articles) {
      const parsed = parseArticle(slug, readFileSync(path, "utf8"));
      expect(parsed.slug).toBe(slug);
    }
  });
});

// ---------------------------------------------------------------------------
// Registry: read-only zone guard
// ---------------------------------------------------------------------------

describe("isReadOnlyZone", () => {
  it("library and packs are read-only", async () => {
    const { isReadOnlyZone } = await import("@/lib/content/registry");
    expect(isReadOnlyZone("library")).toBe(true);
    expect(isReadOnlyZone("packs")).toBe(true);
  });

  it("plan and custom are writable", async () => {
    const { isReadOnlyZone } = await import("@/lib/content/registry");
    expect(isReadOnlyZone("plan")).toBe(false);
    expect(isReadOnlyZone("custom")).toBe(false);
  });
});
