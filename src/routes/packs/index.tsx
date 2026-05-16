import { useState, useEffect } from "react";
import { Package, UploadCloud } from "lucide-react";
import { loadInstalledPacks } from "@/lib/persistence/idb";
import ImportPackDialog, { ImportSuccessBanner } from "@/components/packs/ImportPackDialog";
import type { InstalledPackEntry, PackManifest } from "@/types/pack";

export default function PacksRoute() {
  const [installedPacks, setInstalledPacks] = useState<InstalledPackEntry[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [lastImported, setLastImported] = useState<PackManifest | null>(null);

  useEffect(() => {
    loadInstalledPacks().then((data) => {
      setInstalledPacks(data?.installed ?? []);
    });
  }, []);

  function handleImported(manifest: PackManifest) {
    setShowImport(false);
    setLastImported(manifest);
    loadInstalledPacks().then((data) => {
      setInstalledPacks(data?.installed ?? []);
    });
  }

  return (
    <div className="max-w-xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Packs</h1>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <UploadCloud size={15} />
          Import Pack
        </button>
      </div>

      {lastImported && (
        <div className="mb-4">
          <ImportSuccessBanner manifest={lastImported} onDismiss={() => setLastImported(null)} />
        </div>
      )}

      {installedPacks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Package size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No packs installed yet.</p>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Import your first pack
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {installedPacks.map((pack) => (
            <li
              key={pack.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <Package size={18} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{pack.id}</p>
                <p className="text-xs text-muted-foreground">v{pack.version}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showImport && (
        <ImportPackDialog onClose={() => setShowImport(false)} onImported={handleImported} />
      )}
    </div>
  );
}
