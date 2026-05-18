import { useState, useEffect } from "react";
import { getStorageBudget, deleteTileArea, listTileFiles } from "@/lib/maps/storage";
import { deleteMarkups } from "@/lib/persistence/idb";
import type { StorageBudget } from "@/lib/maps/storage";

export default function MapStorage() {
  const [budget, setBudget] = useState<StorageBudget | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);

  async function refresh() {
    const b = await getStorageBudget();
    setBudget(b);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleClearTiles(areaId: string) {
    setClearing(true);
    try {
      await deleteTileArea(areaId);
      await deleteMarkups(areaId);
      setAreas((prev) => prev.filter((a) => a !== areaId));
      await refresh();
    } finally {
      setClearing(false);
    }
  }

  // Discover areas that have tile files (best-effort; OPFS may be empty)
  useEffect(() => {
    listTileFiles("__probe__").then(() => {
      // If we get here, OPFS is available; real area discovery would need
      // listing the maps root directory — deferred until Sprint 5d
      setAreas([]);
    }).catch(() => {
      setAreas([]);
    });
  }, []);

  if (!budget) return null;

  const usedMB = (budget.usedBytes / 1024 / 1024).toFixed(1);
  const quotaMB = (budget.quotaBytes / 1024 / 1024).toFixed(0);
  const pct = Math.min(100, Math.round(budget.usedFraction * 100));
  const nearLimit = budget.usedFraction > 0.8;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Map tile storage</h2>

      {/* Budget bar */}
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{usedMB} MB used</span>
        <span>{quotaMB} MB quota</span>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${nearLimit ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {nearLimit && (
        <p className="mb-3 text-xs text-destructive">
          Storage is nearly full. Delete unused map areas to free space.
        </p>
      )}

      {/* Per-area delete list */}
      {areas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {areas.map((areaId) => (
            <li key={areaId} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{areaId}</span>
              <button
                disabled={clearing}
                onClick={() => handleClearTiles(areaId)}
                className="text-xs text-destructive hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No offline map areas stored yet.</p>
      )}
    </div>
  );
}
