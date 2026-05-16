import JSZip from "jszip";
import { serializePackManifest, PACK_MANIFEST_FILE } from "./manifest";
import type { PackManifest } from "@/types/pack";

export class PackExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackExportError";
  }
}

/**
 * Produces a downloadable ZIP containing pack.yaml + all provided files.
 * files is a map of relative path → string content (relative to the pack root).
 */
export async function exportPackToZip(
  manifest: PackManifest,
  files: Record<string, string>
): Promise<Blob> {
  if (Object.keys(files).length === 0) {
    throw new PackExportError("Cannot export a pack with no files.");
  }

  const zip = new JSZip();
  zip.file(PACK_MANIFEST_FILE, serializePackManifest(manifest));

  for (const [path, content] of Object.entries(files)) {
    if (path === PACK_MANIFEST_FILE) continue; // pack.yaml is always regenerated from manifest
    zip.file(path, content);
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

/** Triggers a browser file download for a ZIP blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
