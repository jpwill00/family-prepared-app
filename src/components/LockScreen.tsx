import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { hasEncryptedData, deriveKey, getOrCreateSalt } from "@/lib/crypto/secure";
import { usePlanStore } from "@/lib/store/plan";

interface LockScreenProps {
  children: React.ReactNode;
}

type LockState = "checking" | "locked" | "unlocked";

export default function LockScreen({ children }: LockScreenProps) {
  const [lockState, setLockState] = useState<LockState>("checking");
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hydrate = usePlanStore((s) => s.hydrate);
  const storeCryptoKey = usePlanStore((s) => s.cryptoKey);

  useEffect(() => {
    hasEncryptedData().then((encrypted) => {
      setLockState(encrypted ? "locked" : "unlocked");
    });
  }, []);

  // If the key was set externally (e.g. via settings), unlock
  useEffect(() => {
    if (storeCryptoKey && lockState === "locked") {
      setLockState("unlocked");
    }
  }, [storeCryptoKey, lockState]);

  // Focus the passphrase input when the lock screen becomes visible
  useEffect(() => {
    if (lockState === "locked") {
      inputRef.current?.focus();
    }
  }, [lockState]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase) return;
    setBusy(true);
    setError(null);
    try {
      const salt = await getOrCreateSalt();
      const key = await deriveKey(passphrase, salt);
      // Verify the key by attempting hydration with it — wrong key throws DOMException
      usePlanStore.setState({ cryptoKey: key });
      await hydrate();
      setLockState("unlocked");
    } catch {
      usePlanStore.setState({ cryptoKey: null });
      setError("Incorrect passphrase. Please try again.");
    } finally {
      setBusy(false);
      setPassphrase("");
    }
  }

  if (lockState === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (lockState === "locked") {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Lock size={28} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Family Prepared</h1>
            <p className="text-sm text-muted-foreground">
              Enter your passphrase to unlock your plan.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="relative">
              <input
                ref={inputRef}
                type={showPass ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Passphrase"
                autoComplete="current-password"
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={busy || !passphrase}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Unlocking…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// PassphraseStatus is a small indicator shown in the Settings page
export function PassphraseStatus() {
  const [encrypted, setEncrypted] = useState(false);

  useEffect(() => {
    hasEncryptedData().then(setEncrypted);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <ShieldCheck size={14} className={encrypted ? "text-green-600" : "text-muted-foreground"} />
      <span className={encrypted ? "text-foreground" : "text-muted-foreground"}>
        {encrypted ? "Passphrase set — plan is encrypted at rest" : "No passphrase set"}
      </span>
    </div>
  );
}
