import { z } from "zod";
import { BUILTIN_CONTENT_TYPES } from "@/lib/content/types";

export const ContentAreaRefSchema = z.object({
  path: z.string().min(1),
  content_type: z.enum(BUILTIN_CONTENT_TYPES),
});

export const PackAuthorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
});

export const PackManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Pack id must be lowercase kebab-case"),
  version: z.string().min(1),
  title: z.string().min(1),
  author: PackAuthorSchema,
  license: z.string().min(1),
  sources: z.array(z.string()).optional(),
  content_areas: z.array(ContentAreaRefSchema).min(1),
  requires: z.object({ app_min_version: z.string().min(1) }).optional(),
  checksum: z.string().optional(),
});

export const InstalledPackEntrySchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  installedAt: z.string().datetime({ offset: true }),
  source: z.string().optional(),
  checksum: z.string().optional(),
});

export const InstalledPacksSchema = z.object({
  schemaVersion: z.literal(1),
  installed: z.array(InstalledPackEntrySchema),
});
