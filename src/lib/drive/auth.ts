import { saveDriveTokens, loadDriveTokens } from "@/lib/persistence/idb";

// Scope is pinned to drive.file per ADR-001. Never widen without a new ADR.
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export interface DriveTokens {
  access_token: string;
  expiry: number; // Unix ms; 60 s buffer applied on store
}

export class DriveAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveAuthError";
  }
}

// requestToken opens the GIS popup and resolves with fresh tokens.
// The GIS library must already be loaded (script tag in index.html).
export function requestToken(): Promise<DriveTokens> {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      reject(new DriveAuthError("VITE_GOOGLE_CLIENT_ID is not set. Configure it in .env.local."));
      return;
    }

    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new DriveAuthError("Google Identity Services script is not loaded."));
      return;
    }

    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(
            new DriveAuthError(
              `Google auth failed: ${response.error_description ?? response.error}`
            )
          );
          return;
        }
        resolve({
          access_token: response.access_token,
          expiry: Date.now() + response.expires_in * 1000 - 60_000,
        });
      },
      error_callback: (err) => {
        reject(new DriveAuthError(`Google auth error: ${err.message ?? err.type}`));
      },
    });

    client.requestAccessToken();
  });
}

// getAccessToken returns a valid access token, refreshing via popup if needed.
export async function getAccessToken(): Promise<string> {
  const stored = (await loadDriveTokens()) as DriveTokens | null;
  if (stored?.access_token && stored.expiry > Date.now()) {
    return stored.access_token;
  }
  const tokens = await requestToken();
  await saveDriveTokens(tokens as unknown as Record<string, unknown>);
  return tokens.access_token;
}

// isDriveConnected returns true when a non-expired token is in IDB.
export async function isDriveConnected(): Promise<boolean> {
  const stored = (await loadDriveTokens()) as DriveTokens | null;
  return !!stored?.access_token && stored.expiry > Date.now();
}

// revokeDriveAccess revokes the token at Google and clears it from IDB.
export async function revokeDriveAccess(): Promise<void> {
  const stored = (await loadDriveTokens()) as DriveTokens | null;
  if (stored?.access_token) {
    window.google?.accounts?.oauth2?.revoke(stored.access_token);
  }
  await saveDriveTokens({});
}
