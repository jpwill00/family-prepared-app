import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import LockScreen from "@/components/LockScreen";
import { usePlanStore } from "@/lib/store/plan";

// Mock the crypto module so tests don't run real PBKDF2
vi.mock("@/lib/crypto/secure", () => ({
  hasEncryptedData: vi.fn().mockResolvedValue(false),
  deriveKey: vi.fn().mockResolvedValue({ type: "secret" } as unknown as CryptoKey),
  getOrCreateSalt: vi.fn().mockResolvedValue(new Uint8Array(16).fill(1)),
}));

// Mock the store so we control hydrate() behavior
vi.mock("@/lib/store/plan", () => {
  const hydrate = vi.fn().mockResolvedValue(undefined);
  const store = {
    repo: { schemaVersion: 1 },
    hydrated: false,
    cryptoKey: null as CryptoKey | null,
    hydrate,
    setPassphrase: vi.fn().mockResolvedValue(undefined),
    clearPassphrase: vi.fn(),
    setHousehold: vi.fn(),
    setCommunicationPlan: vi.fn(),
    setEvacuationPlan: vi.fn(),
    setResourceInventory: vi.fn(),
    setLegalDocuments: vi.fn(),
    setUtilityShutoffs: vi.fn(),
  };
  const usePlanStore = vi.fn((selector?: (s: typeof store) => unknown) =>
    selector ? selector(store) : store
  );
  (usePlanStore as unknown as { setState: (patch: Partial<typeof store>) => void }).setState =
    (patch) => Object.assign(store, patch);
  (usePlanStore as unknown as { getState: () => typeof store }).getState = () => store;
  return { usePlanStore };
});

import { hasEncryptedData, deriveKey } from "@/lib/crypto/secure";

const mockHasEncrypted = vi.mocked(hasEncryptedData);
const mockDeriveKey = vi.mocked(deriveKey);

beforeEach(() => {
  vi.clearAllMocks();
  // Reset store's cryptoKey
  (usePlanStore as unknown as { setState: (p: object) => void }).setState({ cryptoKey: null });
});

function renderLock() {
  return render(
    <LockScreen>
      <div data-testid="app-content">App loaded</div>
    </LockScreen>
  );
}

describe("LockScreen — no encryption", () => {
  it("renders children when no encrypted data exists", async () => {
    mockHasEncrypted.mockResolvedValueOnce(false);
    renderLock();
    await waitFor(() => {
      expect(screen.getByTestId("app-content")).toBeInTheDocument();
    });
  });

  it("does not show the passphrase form when unlocked", async () => {
    mockHasEncrypted.mockResolvedValueOnce(false);
    renderLock();
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Passphrase")).not.toBeInTheDocument();
    });
  });
});

describe("LockScreen — encrypted data present", () => {
  it("shows the passphrase form when encrypted data exists", async () => {
    mockHasEncrypted.mockResolvedValueOnce(true);
    renderLock();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Passphrase")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /unlock/i })).toBeInTheDocument();
  });

  it("hides app content while locked", async () => {
    mockHasEncrypted.mockResolvedValueOnce(true);
    renderLock();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Passphrase")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
  });

  it("unlocks and shows app content on correct passphrase", async () => {
    mockHasEncrypted.mockResolvedValueOnce(true);
    renderLock();

    await waitFor(() => expect(screen.getByPlaceholderText("Passphrase")).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
        target: { value: "correct-passphrase" },
      });
      fireEvent.click(screen.getByRole("button", { name: /unlock/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("app-content")).toBeInTheDocument();
    });
    expect(mockDeriveKey).toHaveBeenCalledWith("correct-passphrase", expect.any(Uint8Array));
  });

  it("shows an error message on wrong passphrase (DOMException thrown)", async () => {
    mockHasEncrypted.mockResolvedValueOnce(true);
    // Simulate wrong passphrase → hydrate throws after key is set
    const hydrate = usePlanStore.getState().hydrate;
    vi.mocked(hydrate).mockRejectedValueOnce(new DOMException("decryption failed", "OperationError"));

    renderLock();
    await waitFor(() => expect(screen.getByPlaceholderText("Passphrase")).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
        target: { value: "wrong-passphrase" },
      });
      fireEvent.click(screen.getByRole("button", { name: /unlock/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/incorrect passphrase/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
  });

  it("clears passphrase input after failed attempt", async () => {
    mockHasEncrypted.mockResolvedValueOnce(true);
    const hydrate = usePlanStore.getState().hydrate;
    vi.mocked(hydrate).mockRejectedValueOnce(new Error("bad"));

    renderLock();
    await waitFor(() => expect(screen.getByPlaceholderText("Passphrase")).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Passphrase"), {
        target: { value: "wrong" },
      });
      fireEvent.click(screen.getByRole("button", { name: /unlock/i }));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Passphrase")).toHaveValue("");
    });
  });
});
