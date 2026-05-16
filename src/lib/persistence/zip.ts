import JSZip from "jszip";
import type { Repo } from "@/types/plan";
import {
  serializeHousehold,
  serializeCommunicationPlan,
  serializeEvacuationPlan,
  serializeResourceInventory,
  serializeLegalDocuments,
  serializeUtilityShutoffs,
  parseHousehold,
  parseCommunicationPlan,
  parseEvacuationPlan,
  parseResourceInventory,
  parseLegalDocuments,
  parseUtilityShutoffs,
} from "./yaml";

const MANIFEST_FILE = "manifest.json";

const PLAN_FILES = {
  "plan/household.yaml": {
    serialize: (repo: Repo) =>
      repo.household ? serializeHousehold(repo.household) : null,
    parse: (raw: string) => parseHousehold(raw),
    key: "household" as const,
  },
  "plan/communications.yaml": {
    serialize: (repo: Repo) =>
      repo.communicationPlan ? serializeCommunicationPlan(repo.communicationPlan) : null,
    parse: (raw: string) => parseCommunicationPlan(raw),
    key: "communicationPlan" as const,
  },
  "plan/evacuation.yaml": {
    serialize: (repo: Repo) =>
      repo.evacuationPlan ? serializeEvacuationPlan(repo.evacuationPlan) : null,
    parse: (raw: string) => parseEvacuationPlan(raw),
    key: "evacuationPlan" as const,
  },
  "plan/inventory.yaml": {
    serialize: (repo: Repo) =>
      repo.resourceInventory ? serializeResourceInventory(repo.resourceInventory) : null,
    parse: (raw: string) => parseResourceInventory(raw),
    key: "resourceInventory" as const,
  },
  "plan/documents.yaml": {
    serialize: (repo: Repo) =>
      repo.legalDocuments ? serializeLegalDocuments(repo.legalDocuments) : null,
    parse: (raw: string) => parseLegalDocuments(raw),
    key: "legalDocuments" as const,
  },
  "plan/utilities.yaml": {
    serialize: (repo: Repo) =>
      repo.utilityShutoffs ? serializeUtilityShutoffs(repo.utilityShutoffs) : null,
    parse: (raw: string) => parseUtilityShutoffs(raw),
    key: "utilityShutoffs" as const,
  },
} as const;

export interface ZipManifest {
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
}

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipError";
  }
}

export async function repoToZip(repo: Repo): Promise<Blob> {
  const zip = new JSZip();

  const manifest: ZipManifest = {
    schemaVersion: 1,
    appVersion: "1.0.0",
    createdAt: new Date().toISOString(),
  };
  zip.file(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  for (const [path, { serialize }] of Object.entries(PLAN_FILES)) {
    const content = serialize(repo);
    if (content !== null) {
      zip.file(path, content);
    }
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function zipToRepo(blob: Blob): Promise<Repo> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(blob);
  } catch {
    throw new ZipError("Could not read ZIP file — it may be corrupt or not a valid snapshot.");
  }

  const manifestFile = zip.file(MANIFEST_FILE);
  if (!manifestFile) {
    throw new ZipError("ZIP is missing manifest.json — not a valid family-prepared snapshot.");
  }

  const repo: Repo = { schemaVersion: 1 };

  for (const [path, { parse, key }] of Object.entries(PLAN_FILES)) {
    const file = zip.file(path);
    if (!file) continue;
    const raw = await file.async("string");
    try {
      // TypeScript needs a cast here because the key→value type is computed dynamically
      (repo as Record<string, unknown>)[key] = parse(raw);
    } catch (err) {
      throw new ZipError(
        `Failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return repo;
}
