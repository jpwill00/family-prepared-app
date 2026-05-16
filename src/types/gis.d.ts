// Minimal typings for Google Identity Services (accounts.google.com/gsi/client)
// Only the subset used by src/lib/drive/auth.ts is declared here.

interface GisTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GisTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
}

interface GisOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: GisTokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }): GisTokenClient;
  revoke(token: string, callback?: () => void): void;
}

interface Window {
  google?: {
    accounts?: {
      oauth2?: GisOAuth2;
    };
  };
}
