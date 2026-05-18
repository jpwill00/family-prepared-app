import { lazy, Suspense } from "react";
import type { GeoLayerMeta } from "@/types/geo";

// Lazy-load the MapLibre bundle (~700 KB) only when a geo_layer is rendered.
const GeoLayerMap = lazy(() => import("./GeoLayerMap"));

interface Props {
  meta: GeoLayerMeta;
}

export default function GeoLayerView({ meta }: Props) {
  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading map…
          </div>
        }
      >
        <GeoLayerMap meta={meta} />
      </Suspense>
    </div>
  );
}
