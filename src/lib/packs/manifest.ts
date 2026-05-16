import yaml from "js-yaml";
import { PackManifestSchema, InstalledPacksSchema } from "@/lib/schemas/pack";
import type { PackManifest, InstalledPacks } from "@/types/pack";

export class PackManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackManifestError";
  }
}

export function parsePackManifest(raw: string): PackManifest {
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new PackManifestError(
      `Invalid YAML: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  const result = PackManifestSchema.safeParse(parsed);
  if (!result.success) {
    throw new PackManifestError(
      `Invalid pack manifest: ${result.error.issues[0]?.message ?? "unknown error"}`
    );
  }
  return result.data;
}

export function serializePackManifest(manifest: PackManifest): string {
  return yaml.dump(manifest, { lineWidth: 120 });
}

export function parseInstalledPacks(raw: string): InstalledPacks {
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new PackManifestError(
      `Invalid YAML in _installed.yaml: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (parsed == null) {
    return { schemaVersion: 1, installed: [] };
  }
  const result = InstalledPacksSchema.safeParse(parsed);
  if (!result.success) {
    throw new PackManifestError(
      `Invalid _installed.yaml: ${result.error.issues[0]?.message ?? "unknown error"}`
    );
  }
  return result.data;
}

export function serializeInstalledPacks(packs: InstalledPacks): string {
  return yaml.dump(packs, { lineWidth: 120 });
}

export const INSTALLED_PACKS_FILE = "packs/_installed.yaml";
export const PACK_MANIFEST_FILE = "pack.yaml";
