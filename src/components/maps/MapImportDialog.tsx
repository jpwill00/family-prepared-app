import { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Upload, X } from "lucide-react";
import { importMapFile, detectFormat } from "@/lib/maps/import";
import { saveMarkups } from "@/lib/persistence/idb";
import type { MapFileFormat } from "@/lib/maps/import";

interface Props {
  areaId: string;
  onImported: () => void;
  trigger: React.ReactNode;
}

const FORMAT_LABELS: Record<MapFileFormat, string> = {
  pmtiles: "PMTiles (offline basemap)",
  geojson: "GeoJSON (vector data)",
  kml: "KML (Google Earth)",
  gpx: "GPX (GPS track)",
};

export default function MapImportDialog({ areaId, onImported, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<MapFileFormat | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPending(null);
    setDetectedFormat(null);
    setFormatError(null);
    setImportError(null);
    setImporting(false);
  }

  function handleFile(file: File) {
    setImportError(null);
    try {
      const fmt = detectFormat(file.name);
      setPending(file);
      setDetectedFormat(fmt);
      setFormatError(null);
    } catch (err) {
      setPending(null);
      setDetectedFormat(null);
      setFormatError(err instanceof Error ? err.message : "Unrecognised file format");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!pending) return;
    setImporting(true);
    setImportError(null);
    try {
      const result = await importMapFile(pending, areaId);
      // Vector formats become markups for this area
      if (result.geojson) {
        await saveMarkups(areaId, result.geojson);
      }
      setOpen(false);
      reset();
      onImported();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Import map file
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </Dialog.Close>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            role="button"
            tabIndex={0}
            className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center hover:bg-accent/40 transition-colors"
          >
            <Upload size={24} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop a file here, or <span className="text-primary underline">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Supported: .pmtiles, .geojson, .kml, .gpx
            </p>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept=".pmtiles,.geojson,.json,.kml,.gpx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Selected file preview */}
          {pending && detectedFormat && (
            <div className="mb-4 rounded-md border border-border bg-card p-3 text-sm">
              <p className="font-medium text-foreground">{pending.name}</p>
              <p className="text-muted-foreground">{FORMAT_LABELS[detectedFormat]}</p>
              <p className="text-muted-foreground">
                {(pending.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {formatError && (
            <p className="mb-4 text-sm text-destructive">{formatError}</p>
          )}
          {importError && (
            <p className="mb-4 text-sm text-destructive">{importError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              disabled={!pending || importing}
              onClick={handleImport}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
