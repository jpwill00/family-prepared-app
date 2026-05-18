import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { registerPMTilesProtocol } from "@/lib/maps/pmtiles";
import type { GeoLayerMeta } from "@/types/geo";

registerPMTilesProtocol(maplibregl);

interface Props {
  meta: GeoLayerMeta;
}

export default function GeoLayerMap({ meta }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(meta),
      center: [meta.default_view.lng, meta.default_view.lat],
      zoom: meta.default_view.zoom,
    });

    return () => {
      map.remove();
    };
  }, [meta]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ---------------------------------------------------------------------------
// Style builder — converts GeoLayerMeta into a MapLibre style object
// ---------------------------------------------------------------------------

function buildStyle(meta: GeoLayerMeta): maplibregl.StyleSpecification {
  const sources: maplibregl.StyleSpecification["sources"] = {};
  const layers: maplibregl.LayerSpecification[] = [];

  if (meta.basemap) {
    const srcId = "basemap";
    if (meta.basemap.type === "pmtiles") {
      sources[srcId] = {
        type: "raster",
        url: meta.basemap.url,
        tileSize: 256,
        attribution: meta.basemap.attribution,
      };
      layers.push({ id: `${srcId}-layer`, type: "raster", source: srcId });
    } else {
      sources[srcId] = { type: "geojson", data: meta.basemap.url };
      layers.push({ id: `${srcId}-layer`, type: "fill", source: srcId, paint: {} });
    }
  }

  meta.overlays?.forEach((overlay, i) => {
    const srcId = `overlay-${i}`;
    if (overlay.type === "pmtiles") {
      sources[srcId] = {
        type: "raster",
        url: overlay.url,
        tileSize: 256,
      };
      layers.push({
        id: `${srcId}-layer`,
        type: "raster",
        source: srcId,
        paint: { "raster-opacity": overlay.opacity ?? 1 },
      });
    } else {
      sources[srcId] = { type: "geojson", data: overlay.url };
      layers.push({
        id: `${srcId}-layer`,
        type: "fill",
        source: srcId,
        paint: { "fill-opacity": overlay.opacity ?? 0.6 },
      });
    }
  });

  return { version: 8, sources, layers };
}
