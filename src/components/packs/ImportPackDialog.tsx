import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle, X } from "lucide-react";
import { importPackFromBlob, PackImportError } from "@/lib/packs/import";
import type { PackManifest } from "@/types/pack";

interface ImportPackDialogProps {
  onClose: () => void;
  onImported: (manifest: PackManifest) => void;
}

export default function ImportPackDialog({ onClose, onImported }: ImportPackDialogProps) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".zip")) {
      setError("Please select a .zip pack file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const manifest = await importPackFromBlob(file);
      onImported(manifest);
    } catch (err) {
      if (err instanceof PackImportError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import pack"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Import Pack</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Drop a community pack <code>.zip</code> file below, or click to browse.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={[
            "flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/30",
            busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
        >
          <Upload size={28} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {busy ? "Importing…" : "Drop .zip here or click to browse"}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleInputChange}
          aria-label="Select pack zip file"
        />
      </div>
    </div>
  );
}

export function ImportSuccessBanner({
  manifest,
  onDismiss,
}: {
  manifest: PackManifest;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-green-500/40 bg-green-500/5 px-3 py-2 text-sm text-green-700">
      <CheckCircle size={14} className="mt-0.5 shrink-0" />
      <span className="flex-1">
        <strong>{manifest.title}</strong> v{manifest.version} imported successfully.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-green-600 hover:text-green-800"
      >
        <X size={14} />
      </button>
    </div>
  );
}
