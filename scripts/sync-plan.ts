#!/usr/bin/env tsx
/**
 * Validates plan/*.yaml, builds a Drive-compatible snapshot ZIP, and pushes
 * it to Google Drive (family-prepared-app/snapshots/).
 *
 * Auth: Google OAuth Device Flow. Token is cached in .env.local as
 * DRIVE_REFRESH_TOKEN after first use.
 *
 * Usage:
 *   pnpm run sync-plan          # validate + zip + push
 *   pnpm run sync-plan --dry    # validate + zip only (no push)
 *
 * Requires VITE_GOOGLE_CLIENT_ID in .env.local (same as the PWA uses).
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";
import JSZip from "jszip";
import { z } from "zod";

import {
  HouseholdSchema,
  CommunicationPlanSchema,
  EvacuationPlanSchema,
  ResourceInventorySchema,
  LegalDocumentsSchema,
  UtilityShutoffsSchema,
} from "../src/lib/schemas/plan.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dirname, "..");
const PLAN_DIR = join(ROOT, "plan");
const CUSTOM_DIR = join(ROOT, "custom");
const ENV_FILE = join(ROOT, ".env.local");

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const APP_FOLDER_NAME = "family-prepared-app";
const OAUTH_DEVICE_URL = "https://oauth2.googleapis.com/device/code";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const SCHEMA_MAP: Record<string, z.ZodSchema> = {
  "household.yaml": HouseholdSchema,
  "communications.yaml": CommunicationPlanSchema,
  "evacuation.yaml": EvacuationPlanSchema,
  "inventory.yaml": ResourceInventorySchema,
  "documents.yaml": LegalDocumentsSchema,
  "utilities.yaml": UtilityShutoffsSchema,
};

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(ENV_FILE)) return env;
  const lines = readFileSync(ENV_FILE, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return env;
}


// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validatePlanFiles(): { valid: boolean; files: string[] } {
  if (!existsSync(PLAN_DIR)) {
    console.error("✗ No plan/ directory found. Create plan files first.");
    return { valid: false, files: [] };
  }

  const yamlFiles = readdirSync(PLAN_DIR).filter((f) => f.endsWith(".yaml"));
  if (yamlFiles.length === 0) {
    console.error("✗ No .yaml files in plan/. Nothing to sync.");
    return { valid: false, files: [] };
  }

  let allValid = true;
  for (const file of yamlFiles) {
    const schema = SCHEMA_MAP[file];
    if (!schema) {
      console.error(`✗ ${file}: unknown plan file`);
      allValid = false;
      continue;
    }
    const raw = readFileSync(join(PLAN_DIR, file), "utf-8");
    let parsed: unknown;
    try {
      parsed = yaml.load(raw);
    } catch (err) {
      console.error(`✗ ${file}: YAML syntax error — ${err instanceof Error ? err.message : err}`);
      allValid = false;
      continue;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      console.error(`✗ ${file}:`);
      for (const issue of result.error.issues) {
        console.error(`    ${issue.path.join(".")}: ${issue.message}`);
      }
      allValid = false;
    } else {
      console.log(`✓ ${file}`);
    }
  }

  return { valid: allValid, files: yamlFiles };
}

// ---------------------------------------------------------------------------
// ZIP generation (same format as PWA's repoToZip)
// ---------------------------------------------------------------------------

async function buildSnapshotZip(planFiles: string[]): Promise<Uint8Array> {
  const zip = new JSZip();

  // manifest.json — matches the PWA's ZipManifest schema
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        appVersion: "1.0.0",
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  // plan/*.yaml
  for (const file of planFiles) {
    const content = readFileSync(join(PLAN_DIR, file), "utf-8");
    zip.file(`plan/${file}`, content);
  }

  // custom/**/*.md (if any)
  if (existsSync(CUSTOM_DIR)) {
    const addDir = (dir: string, prefix: string) => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const zipPath = `${prefix}/${entry.name}`;
        if (entry.isDirectory()) {
          addDir(fullPath, zipPath);
        } else {
          zip.file(zipPath, readFileSync(fullPath));
        }
      }
    };
    addDir(CUSTOM_DIR, "custom");
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

// ---------------------------------------------------------------------------
// Google OAuth Device Flow (CLI-friendly, no browser redirect needed)
// ---------------------------------------------------------------------------

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

async function startDeviceFlow(clientId: string): Promise<DeviceCodeResponse> {
  const resp = await fetch(OAUTH_DEVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope: DRIVE_SCOPE }),
  });
  if (!resp.ok) throw new Error(`Device flow start failed: ${resp.status}`);
  return resp.json() as Promise<DeviceCodeResponse>;
}

async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number,
  expiresIn: number
): Promise<string> {
  const deadline = Date.now() + expiresIn * 1000;
  let pollInterval = interval * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollInterval));
    const resp = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (data.access_token) return data.access_token as string;
    if (data.error === "slow_down") {
      pollInterval += 5000;
    } else if (data.error === "authorization_pending") {
      continue;
    } else {
      throw new Error(`OAuth error: ${data.error}`);
    }
  }
  throw new Error("Device flow expired — user did not authorize in time.");
}

async function getAccessToken(env: Record<string, string>): Promise<string> {
  const clientId = env["VITE_GOOGLE_CLIENT_ID"];
  if (!clientId) {
    throw new Error("VITE_GOOGLE_CLIENT_ID not set in .env.local");
  }

  // If we have a cached refresh token, exchange it
  const refreshToken = env["DRIVE_REFRESH_TOKEN"];
  if (refreshToken) {
    const resp = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { access_token: string };
      return data.access_token;
    }
    console.log("⚠  Cached refresh token expired. Re-authenticating...");
  }

  // No cached token — run Device Flow
  console.log("\n🔑 Google Drive authentication required.");
  const device = await startDeviceFlow(clientId);
  console.log(`\n   Open: ${device.verification_url}`);
  console.log(`   Enter code: ${device.user_code}\n`);
  console.log("   Waiting for authorization...");

  const accessToken = await pollForToken(
    clientId,
    device.device_code,
    device.interval,
    device.expires_in
  );

  console.log("✓ Authorized.\n");
  return accessToken;
}

// ---------------------------------------------------------------------------
// Drive upload
// ---------------------------------------------------------------------------

async function getOrCreateAppFolder(token: string): Promise<string> {
  const query = encodeURIComponent(
    `name = "${APP_FOLDER_NAME}" and mimeType = "application/vnd.google-apps.folder" and trashed = false`
  );
  const resp = await fetch(`${DRIVE_API}/files?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Drive list folders failed: ${resp.status}`);
  const data = (await resp.json()) as { files: { id: string }[] };
  if (data.files.length > 0) return data.files[0].id;

  // Create folder
  const createResp = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!createResp.ok) throw new Error(`Drive create folder failed: ${createResp.status}`);
  const created = (await createResp.json()) as { id: string };
  return created.id;
}

async function pushZipToDrive(
  zipData: Uint8Array,
  token: string
): Promise<string> {
  const folderId = await getOrCreateAppFolder(token);
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;

  const boundary = "---family-prepared-boundary";
  const metadata = JSON.stringify({
    name,
    parents: [folderId],
    mimeType: "application/zip",
  });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/zip\r\n\r\n`
    ),
    Buffer.from(zipData),
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const resp = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive upload failed (${resp.status}): ${text}`);
  }

  const uploaded = (await resp.json()) as { id: string };
  console.log(`✓ Snapshot pushed: ${name}`);
  console.log(`  Drive file ID: ${uploaded.id}`);
  return uploaded.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes("--dry");

  console.log("━━━ validate-plan ━━━\n");
  const { valid, files } = validatePlanFiles();
  if (!valid) {
    console.error("\n✗ Validation failed. Fix errors above before syncing.");
    process.exit(1);
  }

  console.log("\n━━━ build-zip ━━━\n");
  const zipData = await buildSnapshotZip(files);
  const sizeMB = (zipData.byteLength / 1024 / 1024).toFixed(2);
  console.log(`✓ Snapshot ZIP built (${sizeMB} MB)`);

  if (dryRun) {
    console.log("\n--dry flag set. Skipping Drive push.");
    process.exit(0);
  }

  console.log("\n━━━ push-to-drive ━━━\n");
  const env = loadEnv();
  const token = await getAccessToken(env);
  await pushZipToDrive(zipData, token);

  console.log("\n━━━ done ━━━");
  console.log("Family members can now open the PWA → Settings → Restore latest.");
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
