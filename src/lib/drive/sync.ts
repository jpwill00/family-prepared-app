import { getAccessToken, DriveAuthError } from "./auth";
import type { Repo } from "@/types/plan";
import { repoToZip, zipToRepo } from "@/lib/persistence/zip";
import { saveSyncMeta, loadSyncMeta } from "@/lib/persistence/idb";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const APP_FOLDER_NAME = "family-prepared-app";

export interface SnapshotMeta {
  id: string;
  name: string;
  createdTime: string;
  size: string;
}

export class DriveSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveSyncError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function driveRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });

  // 401 means the token was revoked externally — surface a DriveAuthError so
  // the UI can prompt re-auth rather than silently failing.
  if (response.status === 401) {
    throw new DriveAuthError("Drive access was revoked. Please reconnect your Google account.");
  }
  if (!response.ok) {
    throw new DriveSyncError(
      `Drive API error ${response.status}: ${response.statusText}`
    );
  }
  return response;
}

async function getOrCreateAppFolder(): Promise<string> {
  const token = await getAccessToken();
  const query = encodeURIComponent(
    `name = "${APP_FOLDER_NAME}" and mimeType = "application/vnd.google-apps.folder" and trashed = false`
  );
  const resp = await driveRequest(
    `${DRIVE_API}/files?q=${query}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = (await resp.json()) as { files: { id: string }[] };
  if (data.files.length > 0) {
    return data.files[0].id;
  }

  // Folder not found — create it
  const createResp = await driveRequest(`${DRIVE_API}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const created = (await createResp.json()) as { id: string };
  return created.id;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// pushSnapshot serializes the repo to a ZIP and uploads it to Drive.
// Returns the snapshot file ID and records sync metadata in IDB.
export async function pushSnapshot(repo: Repo): Promise<string> {
  const folderId = await getOrCreateAppFolder();
  const blob = await repoToZip(repo);
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;

  const metadataBlob = new Blob(
    [JSON.stringify({ name, parents: [folderId], mimeType: "application/zip" })],
    { type: "application/json" }
  );
  const form = new FormData();
  form.append("metadata", metadataBlob);
  form.append("file", blob, name);

  const uploadResp = await driveRequest(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
    { method: "POST", body: form }
  );
  const uploaded = (await uploadResp.json()) as { id: string };

  await saveSyncMeta({
    lastPushAt: new Date().toISOString(),
    lastPushSnapshotId: uploaded.id,
  });

  return uploaded.id;
}

// listSnapshots returns all ZIP snapshots in the app folder, newest first.
export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const folderId = await getOrCreateAppFolder();
  const query = encodeURIComponent(
    `"${folderId}" in parents and name contains ".zip" and trashed = false`
  );
  const resp = await driveRequest(
    `${DRIVE_API}/files?q=${query}&orderBy=createdTime+desc&fields=files(id,name,createdTime,size)`
  );
  const data = (await resp.json()) as { files: SnapshotMeta[] };
  return data.files;
}

// pullLatest downloads the most recent snapshot as a Repo.
export async function pullLatest(): Promise<Repo | null> {
  const snapshots = await listSnapshots();
  if (snapshots.length === 0) return null;
  return restoreFromSnapshot(snapshots[0].id);
}

// restoreFromSnapshot downloads a specific snapshot by ID and deserializes it.
export async function restoreFromSnapshot(id: string): Promise<Repo> {
  const resp = await driveRequest(`${DRIVE_API}/files/${id}?alt=media`);
  const buffer = await resp.arrayBuffer();
  return zipToRepo(new Blob([buffer], { type: "application/zip" }));
}

// getSyncMeta returns the last push metadata stored in IDB (or null).
export { loadSyncMeta as getSyncMeta };
