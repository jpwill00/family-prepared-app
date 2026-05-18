import yaml from "js-yaml";
import { ContentMetaSchema, ArticleFrontmatterSchema } from "./types";
import { GeoLayerMetaSchema } from "@/lib/schemas/geo";
import type { ContentMeta, ParsedArticle } from "./types";
import type { GeoLayerMeta } from "@/types/geo";

// ---------------------------------------------------------------------------
// Content-type registry
// ---------------------------------------------------------------------------
// Adding a new content_type is a deliberate code change that requires an ADR.
// Adding a new folder of an existing type is a GUI-only action (no code change).

export { BUILTIN_CONTENT_TYPES } from "./types";

// ---------------------------------------------------------------------------
// _meta.yaml parsing
// ---------------------------------------------------------------------------

export function parseContentMeta(raw: string): ContentMeta {
  const parsed = yaml.load(raw);
  const result = ContentMetaSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid _meta.yaml: ${result.error.message}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Markdown article parsing (frontmatter + body)
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseArticle(slug: string, raw: string): ParsedArticle {
  const match = FRONTMATTER_RE.exec(raw.trimStart());
  if (!match) {
    throw new Error(`Article "${slug}" is missing YAML frontmatter`);
  }
  const [, fmRaw, body] = match;
  const fm = yaml.load(fmRaw);
  const result = ArticleFrontmatterSchema.safeParse(fm);
  if (!result.success) {
    throw new Error(`Article "${slug}" frontmatter invalid: ${result.error.message}`);
  }
  return { slug, frontmatter: result.data, body: body.trim() };
}

// ---------------------------------------------------------------------------
// geo_layer _meta.yaml parsing
// ---------------------------------------------------------------------------

export function parseGeoLayerMeta(raw: string): GeoLayerMeta {
  const parsed = yaml.load(raw);
  const result = GeoLayerMetaSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid geo_layer _meta.yaml: ${result.error.message}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Zone read-only guard
// ---------------------------------------------------------------------------
// Returns true for zones the GUI must not write to directly.

export function isReadOnlyZone(zone: "plan" | "library" | "packs" | "custom"): boolean {
  return zone === "library" || zone === "packs";
}
