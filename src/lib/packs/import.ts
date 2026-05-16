import JSZip from "jszip";
import {
  parsePackManifest,
  parseInstalledPacks,
  serializeInstalledPacks,
  PACK_MANIFEST_FILE,
  PackManifestError,
} from "./manifest";
import {
  loadInstalledPacks,
  saveInstalledPacks,
  savePackContent,
} from "@/lib/persistence/idb";
import type { PackManifest } from "@/types/pack";

export class PackImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackImportError";
  }
}

export async function importPackFromBlob(input: Blob | Uint8Array): Promise<PackManifest> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(input);
  } catch {
    throw new PackImportError("Could not read ZIP file — it may be corrupt or not a valid pack.");
  }

  const manifestFile = zip.file(PACK_MANIFEST_FILE);
  if (!manifestFile) {
    throw new PackImportError(`ZIP is missing ${PACK_MANIFEST_FILE} — not a valid pack.`);
  }

  const manifestRaw = await manifestFile.async("string");
  let manifest: PackManifest;
  try {
    manifest = parsePackManifest(manifestRaw);
  } catch (err) {
    if (err instanceof PackManifestError) throw new PackImportError(err.message);
    throw err;
  }

  // Extract all text files (skip directories and binary files)
  const files: Record<string, string> = {};
  const filePromises: Promise<void>[] = [];
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    filePromises.push(
      zipEntry.async("string").then((content) => {
        files[relativePath] = content;
      })
    );
  });
  await Promise.all(filePromises);

  await savePackContent(manifest.id, files);

  // Update _installed.yaml lockfile
  const existingRaw = await loadInstalledPacks();
  const installed = existingRaw ?? { schemaVersion: 1 as const, installed: [] };

  // Replace existing entry if same id, otherwise append
  const withoutOld = installed.installed.filter((e) => e.id !== manifest.id);
  const updatedInstalled = {
    ...installed,
    installed: [
      ...withoutOld,
      {
        id: manifest.id,
        version: manifest.version,
        installedAt: new Date().toISOString(),
        checksum: manifest.checksum,
      },
    ],
  };

  // Round-trip through serialize/parse to validate before saving
  const validated = parseInstalledPacks(serializeInstalledPacks(updatedInstalled));
  await saveInstalledPacks(validated);

  return manifest;
}
