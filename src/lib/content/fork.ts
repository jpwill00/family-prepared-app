import { isReadOnlyZone } from "./registry";

export interface ForkedArticle {
  areaSlug: string;
  slug: string;
  content: string;
}

export class ForkGuardError extends Error {
  constructor(zone: string) {
    super(`Zone "${zone}" is read-only. Use "Fork to edit" to copy into custom/ first.`);
    this.name = "ForkGuardError";
  }
}

/**
 * Asserts that `zone` is writable before any edit operation.
 * Throws ForkGuardError if the zone is library or packs.
 */
export function assertWritable(zone: "plan" | "library" | "packs" | "custom"): void {
  if (isReadOnlyZone(zone)) {
    throw new ForkGuardError(zone);
  }
}

/**
 * Produces the destination path for a forked article.
 * Source: library/<areaSlug>/<slug>.md
 * Dest:   custom/<areaSlug>/<slug>.md
 */
export function forkDestination(areaSlug: string, slug: string): string {
  return `custom/${areaSlug}/${slug}.md`;
}
