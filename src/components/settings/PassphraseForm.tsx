import { useState, useEffect } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { hasEncryptedData } from "@/lib/crypto/secure";
import { usePlanStore } from "@/lib/store/plan";
import { PassphraseStatus } from "@/components/LockScreen";

export default function PassphraseForm() {
  const [isSet, setIsSet] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const setPassphraseInStore = usePlanStore((s) => s.setPassphrase);

  useEffect(() => {
    hasEncryptedData().then(setIsSet);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passphrase.length < 8) {
      setErrorMsg("Passphrase must be at least 8 characters.");
      setStatus("error");
      return;
    }
    if (passphrase !== confirm) {
      setErrorMsg("Passphrases do not match.");
      setStatus("error");
      return;
    }
    setBusy(true);
    setStatus("idle");
    setErrorMsg(null);
    try {
      await setPassphraseInStore(passphrase);
      setIsSet(true);
      setStatus("success");
      setPassphrase("");
      setConfirm("");
    } catch {
      setErrorMsg("Failed to set passphrase. Please try again.");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-3 text-base font-semibold text-foreground">
        {isSet ? "Change Passphrase" : "Set Passphrase"}
      </h2>
      <div className="mb-4">
        <PassphraseStatus />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {isSet
          ? "Enter a new passphrase to re-encrypt your plan. Your existing data will be re-encrypted with the new passphrase."
          : "Add a passphrase to encrypt sensitive fields (SSN, DOB, medication dosages) at rest on this device."}
      </p>

      {status === "error" && errorMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle size={14} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {status === "success" && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/5 px-3 py-2 text-sm text-green-700">
          <CheckCircle size={14} className="shrink-0" />
          Passphrase set. Your plan is now encrypted at rest.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <PassField
          label="New passphrase"
          value={passphrase}
          onChange={setPassphrase}
          show={showPass}
          onToggleShow={() => setShowPass((v) => !v)}
          autoComplete="new-password"
        />
        <PassField
          label="Confirm passphrase"
          value={confirm}
          onChange={setConfirm}
          show={showPass}
          onToggleShow={() => setShowPass((v) => !v)}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={busy || !passphrase || !confirm}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Encrypting…" : isSet ? "Change passphrase" : "Set passphrase"}
        </button>
      </form>
    </div>
  );
}

function PassField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide passphrase" : "Show passphrase"}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}
