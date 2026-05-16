import { saveCryptoSalt, loadCryptoSalt } from "@/lib/persistence/idb";
import type { Repo } from "@/types/plan";

// PBKDF2 parameters — OWASP 2024 recommendation
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-256";
const AES_KEY_LENGTH = 256;
const IV_BYTES = 12;

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt single values
// ---------------------------------------------------------------------------

export async function encrypt(value: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    key,
    new TextEncoder().encode(value)
  );
  // Encode as base64(IV + ciphertext) so the result is a plain string
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(blob: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_BYTES);
  const ciphertext = combined.slice(IV_BYTES);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}

// ---------------------------------------------------------------------------
// Repo-level encrypt / decrypt (traverses all { value, secure: true } fields)
// ---------------------------------------------------------------------------

function isSecureField(obj: unknown): obj is { value: string; secure: true } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "secure" in obj &&
    (obj as Record<string, unknown>).secure === true &&
    "value" in obj &&
    typeof (obj as Record<string, unknown>).value === "string"
  );
}

async function transformSecureFields(
  obj: unknown,
  transform: (v: string) => Promise<string>
): Promise<unknown> {
  if (isSecureField(obj)) {
    return { ...obj, value: await transform(obj.value) };
  }
  if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => transformSecureFields(item, transform)));
  }
  if (typeof obj === "object" && obj !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = await transformSecureFields(v, transform);
    }
    return out;
  }
  return obj;
}

export async function encryptRepo(repo: Repo, key: CryptoKey): Promise<Repo> {
  return (await transformSecureFields(repo, (v) => encrypt(v, key))) as Repo;
}

export async function decryptRepo(repo: Repo, key: CryptoKey): Promise<Repo> {
  return (await transformSecureFields(repo, (v) => decrypt(v, key))) as Repo;
}

// ---------------------------------------------------------------------------
// Salt helpers (stored in IDB as number[] — Uint8Array doesn't serialize)
// ---------------------------------------------------------------------------

export async function getOrCreateSalt(): Promise<Uint8Array> {
  const stored = await loadCryptoSalt();
  if (stored) return new Uint8Array(stored);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await saveCryptoSalt(Array.from(salt));
  return salt;
}

// hasEncryptedData returns true when a crypto salt exists in IDB, indicating
// the repo was saved with encryption enabled.
export async function hasEncryptedData(): Promise<boolean> {
  const salt = await loadCryptoSalt();
  return salt !== null && salt.length > 0;
}
