import { get, set, del } from "idb-keyval";
import { RepoSchema } from "@/lib/schemas/plan";
import type { Repo } from "@/types/plan";
import type { InstalledPacks } from "@/types/pack";

const REPO_KEY = "repo";
const DRIVE_TOKENS_KEY = "driveTokens";
const SYNC_META_KEY = "syncMeta";
const SALT_KEY = "cryptoSalt";
const INSTALLED_PACKS_KEY = "installedPacks";

export interface SyncMeta {
  lastPushAt: string;
  lastPushSnapshotId: string;
}

// All IDB access lives in this file. No component or store may import idb-keyval directly.

export async function loadRepo(): Promise<Repo> {
  const raw = await get<unknown>(REPO_KEY);
  if (raw == null) {
    return { schemaVersion: 1 };
  }
  const result = RepoSchema.safeParse(raw);
  if (!result.success) {
    console.warn("IDB repo failed schema validation; returning empty repo", result.error);
    return { schemaVersion: 1 };
  }
  return result.data;
}

export async function saveRepo(repo: Repo): Promise<void> {
  await set(REPO_KEY, repo);
}

// Drive tokens — stored in IDB only, never localStorage (CLAUDE.md rule)
export async function saveDriveTokens(tokens: Record<string, unknown>): Promise<void> {
  await set(DRIVE_TOKENS_KEY, tokens);
}

export async function loadDriveTokens(): Promise<Record<string, unknown> | null> {
  const raw = await get<Record<string, unknown>>(DRIVE_TOKENS_KEY);
  return raw ?? null;
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  await set(SYNC_META_KEY, meta);
}

export async function loadSyncMeta(): Promise<SyncMeta | null> {
  const raw = await get<SyncMeta>(SYNC_META_KEY);
  return raw ?? null;
}

// Crypto salt — stored as number[] because IDB cannot serialize Uint8Array directly
export async function saveCryptoSalt(salt: number[]): Promise<void> {
  await set(SALT_KEY, salt);
}

export async function loadCryptoSalt(): Promise<number[] | null> {
  const raw = await get<number[]>(SALT_KEY);
  return raw ?? null;
}

// Installed packs lockfile — tracks which packs are installed and at what version
export async function saveInstalledPacks(packs: InstalledPacks): Promise<void> {
  await set(INSTALLED_PACKS_KEY, packs);
}

export async function loadInstalledPacks(): Promise<InstalledPacks | null> {
  const raw = await get<InstalledPacks>(INSTALLED_PACKS_KEY);
  return raw ?? null;
}

// Pack file content — stores all files from an installed pack ZIP
const PACK_FILES_PREFIX = "packFiles:";

export async function savePackContent(id: string, files: Record<string, string>): Promise<void> {
  await set(`${PACK_FILES_PREFIX}${id}`, files);
}

export async function loadPackContent(id: string): Promise<Record<string, string> | null> {
  const raw = await get<Record<string, string>>(`${PACK_FILES_PREFIX}${id}`);
  return raw ?? null;
}

export async function deletePackContent(id: string): Promise<void> {
  await del(`${PACK_FILES_PREFIX}${id}`);
}
