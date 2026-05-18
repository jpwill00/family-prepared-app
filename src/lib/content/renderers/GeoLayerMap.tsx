import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { registerPMTilesProtocol } from "@/lib/maps/pmtiles";
import { loadMarkups } from "@/lib/persistence/idb";
import type { GeoLayerMeta } from "@/types/geo";

registerPMTilesProtocol(maplibregl);

interface Props {
  meta: GeoLayerMeta;
  areaId: string;
  // Bump this key to force the map to reload (e.g. after new markups are imported)
  reloadToken?: number;
}

export default function GeoLayerMap({ meta, areaId, reloadToken }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(meta),
      center: [meta.default_view.lng, meta.default_view.lat],
      zoom: meta.default_view.zoom,
    });

    map.on("load", () => {
      loadMarkups(areaId).then((fc) => {
        if (fc.features.length === 0) return;
        map.addSource("markups", { type: "geojson", data: fc });
        map.addLayer({
          id: "markups-fill",
          type: "fill",
          source: "markups",
          filter: ["==", "$type", "Polygon"],
          paint: { "fill-color": "#ef4444", "fill-opacity": 0.3 },
        });
        map.addLayer({
          id: "markups-line",
          type: "line",
          source: "markups",
          filter: ["in", "$type", "LineString", "Polygon"],
          paint: { "line-color": "#ef4444", "line-width": 2 },
        });
        map.addLayer({
          id: "markups-circle",
          type: "circle",
          source: "markups",
          filter: ["==", "$type", "Point"],
          paint: { "circle-radius": 6, "circle-color": "#ef4444" },
        });
      });
    });

    return () => {
      map.remove();
    };
  }, [meta, areaId, reloadToken]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ---------------------------------------------------------------------------
// Style builder
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
      sources[srcId] = { type: "raster", url: overlay.url, tileSize: 256 };
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
