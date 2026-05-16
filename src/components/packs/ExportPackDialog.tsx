import { useState } from "react";
import { X, AlertCircle, Download } from "lucide-react";
import { exportPackToZip, downloadBlob, PackExportError } from "@/lib/packs/export";
import type { PackManifest } from "@/types/pack";

interface ExportPackDialogProps {
  /** Files to bundle — relative path → string content */
  files: Record<string, string>;
  /** Suggested pack id derived from the area slug */
  suggestedId: string;
  onClose: () => void;
}

export default function ExportPackDialog({
  files,
  suggestedId,
  onClose,
}: ExportPackDialogProps) {
  const [id, setId] = useState(suggestedId);
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [license, setLicense] = useState("CC-BY-4.0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idValid = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id);
  const canSubmit = idValid && title.trim().length > 0 && authorName.trim().length > 0 && !busy;

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const manifest: PackManifest = {
        id,
        version: "1.0.0",
        title: title.trim(),
        author: { name: authorName.trim() },
        license,
        content_areas: [
          { path: "content", content_type: "article_collection" },
        ],
      };
      const blob = await exportPackToZip(manifest, files);
      downloadBlob(blob, `${id}.zip`);
      onClose();
    } catch (err) {
      if (err instanceof PackExportError) {
        setError(err.message);
      } else {
        setError("Export failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export pack"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Export as Pack</h2>
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
          Bundle this content area as a shareable <code>.zip</code> pack.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleExport} className="flex flex-col gap-3">
          <Field label="Pack ID" hint="lowercase-kebab-case, e.g. my-evac-guide">
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className={[
                "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1",
                idValid
                  ? "border-input focus:border-ring focus:ring-ring"
                  : "border-destructive focus:border-destructive focus:ring-destructive",
              ].join(" ")}
              autoComplete="off"
            />
          </Field>

          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Evacuation Guide"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              autoComplete="off"
            />
          </Field>

          <Field label="Author name">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              autoComplete="name"
            />
          </Field>

          <Field label="License">
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="CC-BY-4.0">CC-BY-4.0</option>
              <option value="CC-BY-SA-4.0">CC-BY-SA-4.0</option>
              <option value="CC0-1.0">CC0-1.0 (Public Domain)</option>
              <option value="MIT">MIT</option>
            </select>
          </Field>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Download size={15} />
            {busy ? "Exporting…" : "Download pack .zip"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground/70">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
