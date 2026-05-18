import type { z } from "zod";
import type {
  GeoLayerMetaSchema,
  MapViewSchema,
  GeoLayerBasemapSchema,
  GeoLayerOverlaySchema,
} from "@/lib/schemas/geo";

export type GeoLayerMeta = z.infer<typeof GeoLayerMetaSchema>;
export type MapView = z.infer<typeof MapViewSchema>;
export type GeoLayerBasemap = z.infer<typeof GeoLayerBasemapSchema>;
export type GeoLayerOverlay = z.infer<typeof GeoLayerOverlaySchema>;
