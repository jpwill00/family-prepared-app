import { z } from "zod";

export const BUILTIN_CONTENT_TYPES = [
  "structured_record_set",
  "article_collection",
  "geo_layer",
  "checklist",
] as const;

export type ContentType = (typeof BUILTIN_CONTENT_TYPES)[number];

// Shape of _meta.yaml colocated with each content area folder.
export const ContentMetaSchema = z.object({
  content_type: z.enum(BUILTIN_CONTENT_TYPES),
  title: z.string().min(1),
  icon: z.string().optional(),
  sources: z.array(z.string()).optional(),
  last_reviewed: z.string().optional(),
  description: z.string().optional(),
});

export type ContentMeta = z.infer<typeof ContentMetaSchema>;

// Shape of a parsed Markdown article's frontmatter.
export const ArticleFrontmatterSchema = z.object({
  title: z.string().min(1),
  last_reviewed: z.string().optional(),
  sources: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatterSchema>;

export interface ParsedArticle {
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
}
