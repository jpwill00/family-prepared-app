import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requestToken,
  getAccessToken,
  isDriveConnected,
  revokeDriveAccess,
  DriveAuthError,
  DRIVE_SCOPE,
} from "@/lib/drive/auth";

// Mock the IDB persistence layer
vi.mock("@/lib/persistence/idb", () => ({
  saveDriveTokens: vi.fn().mockResolvedValue(undefined),
  loadDriveTokens: vi.fn().mockResolvedValue(null),
}));

import { saveDriveTokens, loadDriveTokens } from "@/lib/persistence/idb";

const mockSave = vi.mocked(saveDriveTokens);
const mockLoad = vi.mocked(loadDriveTokens);

// Helper: install a mock GIS token client on window.google
function installGisMock(opts: {
  success?: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}) {
  const {
    success = true,
    accessToken = "test-access-token",
    expiresIn = 3600,
    error,
  } = opts;

  (window as Window & typeof globalThis).google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn((config) => ({
          requestAccessToken: vi.fn(() => {
            if (success) {
              config.callback({
                access_token: accessToken,
                token_type: "Bearer",
                expires_in: expiresIn,
                scope: DRIVE_SCOPE,
              });
            } else {
              config.callback({
                access_token: "",
                token_type: "Bearer",
                expires_in: 0,
                scope: "",
                error: error ?? "access_denied",
                error_description: "User denied access",
              });
            }
          }),
        })),
        revoke: vi.fn(),
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset env var
  import.meta.env.VITE_GOOGLE_CLIENT_ID = "test-client-id";
  // Remove GIS mock between tests
  delete (window as Window & typeof globalThis).google;
});

describe("DRIVE_SCOPE", () => {
  it("is strictly drive.file", () => {
    expect(DRIVE_SCOPE).toBe("https://www.googleapis.com/auth/drive.file");
  });
});

describe("requestToken", () => {
  it("resolves with tokens when GIS callback succeeds", async () => {
    installGisMock({ accessToken: "tok123", expiresIn: 3600 });
    const tokens = await requestToken();
    expect(tokens.access_token).toBe("tok123");
    expect(tokens.expiry).toBeGreaterThan(Date.now());
  });

  it("applies 60-second buffer to expiry", async () => {
    installGisMock({ expiresIn: 3600 });
    const before = Date.now();
    const tokens = await requestToken();
    const after = Date.now();
    // expiry should be approximately now + 3600s - 60s
    expect(tokens.expiry).toBeGreaterThanOrEqual(before + (3600 - 60) * 1000);
    expect(tokens.expiry).toBeLessThanOrEqual(after + (3600 - 60) * 1000 + 100);
  });

  it("rejects with DriveAuthError when GIS callback returns error", async () => {
    installGisMock({ success: false, error: "access_denied" });
    await expect(requestToken()).rejects.toThrow(DriveAuthError);
    await expect(requestToken()).rejects.toThrow(/access_denied|denied/i);
  });

  it("rejects with DriveAuthError when VITE_GOOGLE_CLIENT_ID is missing", async () => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = "";
    await expect(requestToken()).rejects.toThrow(DriveAuthError);
    await expect(requestToken()).rejects.toThrow(/VITE_GOOGLE_CLIENT_ID/i);
  });

  it("rejects with DriveAuthError when GIS script is not loaded", async () => {
    // window.google not installed
    await expect(requestToken()).rejects.toThrow(DriveAuthError);
    await expect(requestToken()).rejects.toThrow(/not loaded/i);
  });
});

describe("getAccessToken", () => {
  it("returns cached token when stored and not expired", async () => {
    mockLoad.mockResolvedValueOnce({
      access_token: "cached-tok",
      expiry: Date.now() + 300_000,
    } as unknown as ReturnType<typeof loadDriveTokens> extends Promise<infer T> ? T : never);
    const token = await getAccessToken();
    expect(token).toBe("cached-tok");
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("requests new token when stored token is expired", async () => {
    mockLoad.mockResolvedValueOnce({
      access_token: "old-tok",
      expiry: Date.now() - 1000, // expired
    } as unknown as ReturnType<typeof loadDriveTokens> extends Promise<infer T> ? T : never);
    installGisMock({ accessToken: "fresh-tok" });

    const token = await getAccessToken();
    expect(token).toBe("fresh-tok");
    expect(mockSave).toHaveBeenCalledOnce();
  });

  it("requests new token when no stored token", async () => {
    // mockLoad returns null by default
    installGisMock({ accessToken: "new-tok" });
    const token = await getAccessToken();
    expect(token).toBe("new-tok");
    expect(mockSave).toHaveBeenCalledOnce();
  });
});

describe("isDriveConnected", () => {
  it("returns true when valid token exists in IDB", async () => {
    mockLoad.mockResolvedValueOnce({
      access_token: "tok",
      expiry: Date.now() + 300_000,
    } as unknown as ReturnType<typeof loadDriveTokens> extends Promise<infer T> ? T : never);
    expect(await isDriveConnected()).toBe(true);
  });

  it("returns false when no token stored", async () => {
    expect(await isDriveConnected()).toBe(false);
  });

  it("returns false when token is expired", async () => {
    mockLoad.mockResolvedValueOnce({
      access_token: "tok",
      expiry: Date.now() - 1000,
    } as unknown as ReturnType<typeof loadDriveTokens> extends Promise<infer T> ? T : never);
    expect(await isDriveConnected()).toBe(false);
  });
});

describe("revokeDriveAccess", () => {
  it("revokes the token at Google and clears IDB", async () => {
    installGisMock({});
    mockLoad.mockResolvedValueOnce({
      access_token: "tok-to-revoke",
      expiry: Date.now() + 300_000,
    } as unknown as ReturnType<typeof loadDriveTokens> extends Promise<infer T> ? T : never);

    await revokeDriveAccess();

    const revokeCall = vi.mocked(window.google!.accounts!.oauth2!.revoke);
    expect(revokeCall).toHaveBeenCalledWith("tok-to-revoke");
    expect(mockSave).toHaveBeenCalledWith({});
  });

  it("still clears IDB even when no token was stored", async () => {
    await revokeDriveAccess();
    expect(mockSave).toHaveBeenCalledWith({});
  });
});
