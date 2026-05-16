// @vitest-environment node
// Node crypto.subtle is fully available and faster than jsdom's polyfill
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deriveKey,
  encrypt,
  decrypt,
  encryptRepo,
  decryptRepo,
  hasEncryptedData,
  getOrCreateSalt,
} from "@/lib/crypto/secure";
import type { Repo } from "@/types/plan";

vi.mock("@/lib/persistence/idb", () => ({
  saveCryptoSalt: vi.fn().mockResolvedValue(undefined),
  loadCryptoSalt: vi.fn().mockResolvedValue(null),
}));

import { saveCryptoSalt, loadCryptoSalt } from "@/lib/persistence/idb";

const mockSaveSalt = vi.mocked(saveCryptoSalt);
const mockLoadSalt = vi.mocked(loadCryptoSalt);

const PASSPHRASE = "correct-horse-battery-staple";
const SALT = new Uint8Array(16).fill(42);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// deriveKey
// ---------------------------------------------------------------------------

describe("deriveKey", () => {
  it("returns a CryptoKey", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    expect(key).toBeTruthy();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("same passphrase + salt produces equivalent key (can decrypt)", async () => {
    const k1 = await deriveKey(PASSPHRASE, SALT);
    const k2 = await deriveKey(PASSPHRASE, SALT);
    // Verify equivalence by round-tripping a value
    const ciphertext = await encrypt("hello", k1);
    const plaintext = await decrypt(ciphertext, k2);
    expect(plaintext).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// encrypt / decrypt
// ---------------------------------------------------------------------------

describe("encrypt + decrypt", () => {
  it("round-trips a plaintext value", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    const ct = await encrypt("my-secret-ssn", key);
    const pt = await decrypt(ct, key);
    expect(pt).toBe("my-secret-ssn");
  });

  it("produces different ciphertext on every call (random IV)", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    const ct1 = await encrypt("same value", key);
    const ct2 = await encrypt("same value", key);
    expect(ct1).not.toBe(ct2);
  });

  it("round-trips unicode / emoji", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    const value = "Héllo wörld 🔐";
    expect(await decrypt(await encrypt(value, key), key)).toBe(value);
  });

  it("throws DOMException when decrypting with wrong key", async () => {
    const k1 = await deriveKey(PASSPHRASE, SALT);
    const k2 = await deriveKey("wrong-passphrase", SALT);
    const ct = await encrypt("secret", k1);
    await expect(decrypt(ct, k2)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// encryptRepo / decryptRepo
// ---------------------------------------------------------------------------

const REPO_WITH_SECURE: Repo = {
  schemaVersion: 1,
  household: {
    schemaVersion: 1,
    members: [
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Alice",
        ssn: { value: "123-45-6789", secure: true },
        dateOfBirth: { value: "1985-03-14", secure: true },
      },
    ],
  },
  communicationPlan: {
    schemaVersion: 1,
    meetingWord: { value: "sparrow", secure: true },
    primary: { method: "cell" },
    alternate: { method: "text" },
    contingency: { method: "email" },
    emergency: { method: "radio" },
  },
};

describe("encryptRepo + decryptRepo", () => {
  it("round-trips a repo with secure fields", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    const encrypted = await encryptRepo(REPO_WITH_SECURE, key);
    const decrypted = await decryptRepo(encrypted, key);

    expect(decrypted.household?.members[0].ssn?.value).toBe("123-45-6789");
    expect(decrypted.household?.members[0].dateOfBirth?.value).toBe("1985-03-14");
    expect(decrypted.communicationPlan?.meetingWord?.value).toBe("sparrow");
  });

  it("encrypts secure field values (ciphertext != plaintext)", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    const encrypted = await encryptRepo(REPO_WITH_SECURE, key);
    expect(encrypted.household?.members[0].ssn?.value).not.toBe("123-45-6789");
    expect(encrypted.communicationPlan?.meetingWord?.value).not.toBe("sparrow");
  });

  it("preserves secure: true marker after encryption", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    const encrypted = await encryptRepo(REPO_WITH_SECURE, key);
    expect(encrypted.household?.members[0].ssn?.secure).toBe(true);
  });

  it("preserves non-secure fields unchanged", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    const encrypted = await encryptRepo(REPO_WITH_SECURE, key);
    expect(encrypted.household?.members[0].name).toBe("Alice");
    expect(encrypted.communicationPlan?.primary.method).toBe("cell");
  });

  it("round-trips a repo with NO secure fields unchanged", async () => {
    const key = await deriveKey(PASSPHRASE, SALT);
    const plain: Repo = { schemaVersion: 1 };
    const enc = await encryptRepo(plain, key);
    const dec = await decryptRepo(enc, key);
    expect(dec).toEqual(plain);
  });

  it("decryptRepo throws when wrong key is used", async () => {
    const k1 = await deriveKey(PASSPHRASE, SALT);
    const k2 = await deriveKey("wrong", SALT);
    const encrypted = await encryptRepo(REPO_WITH_SECURE, k1);
    await expect(decryptRepo(encrypted, k2)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Salt helpers
// ---------------------------------------------------------------------------

describe("getOrCreateSalt", () => {
  it("generates a new salt when none is stored", async () => {
    const salt = await getOrCreateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
    expect(mockSaveSalt).toHaveBeenCalledWith(expect.any(Array));
  });

  it("returns stored salt when one exists", async () => {
    mockLoadSalt.mockResolvedValueOnce([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const salt = await getOrCreateSalt();
    expect(Array.from(salt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(mockSaveSalt).not.toHaveBeenCalled();
  });
});

describe("hasEncryptedData", () => {
  it("returns false when no salt stored", async () => {
    expect(await hasEncryptedData()).toBe(false);
  });

  it("returns true when salt is stored", async () => {
    mockLoadSalt.mockResolvedValueOnce([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(await hasEncryptedData()).toBe(true);
  });
});
