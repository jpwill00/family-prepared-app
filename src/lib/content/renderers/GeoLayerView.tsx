import { lazy, Suspense, useState } from "react";
import { Upload } from "lucide-react";
import MapImportDialog from "@/components/maps/MapImportDialog";
import type { GeoLayerMeta } from "@/types/geo";

// Lazy-load the MapLibre bundle (~700 KB) only when a geo_layer is rendered.
const GeoLayerMap = lazy(() => import("./GeoLayerMap"));

interface Props {
  meta: GeoLayerMeta;
  areaId: string;
}

export default function GeoLayerView({ meta, areaId }: Props) {
  // Bumping this remounts GeoLayerMap so it reloads markups from IDB after import.
  const [reloadToken, setReloadToken] = useState(0);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <MapImportDialog
          areaId={areaId}
          onImported={() => setReloadToken((t) => t + 1)}
          trigger={
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <Upload size={13} />
              Import file
            </button>
          }
        />
      </div>

      {/* Map */}
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading map…
            </div>
          }
        >
          <GeoLayerMap meta={meta} areaId={areaId} reloadToken={reloadToken} />
        </Suspense>
      </div>
    </div>
  );
}
