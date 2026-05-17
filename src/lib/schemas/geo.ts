import { z } from "zod";

export const MapViewSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  zoom: z.number().int().min(0).max(22),
});

export const TileSourceTypeSchema = z.enum(["pmtiles", "geojson"]);

export const GeoLayerBasemapSchema = z.object({
  type: TileSourceTypeSchema,
  url: z.string().min(1),
  attribution: z.string().optional(),
});

export const GeoLayerOverlaySchema = z.object({
  type: TileSourceTypeSchema,
  url: z.string().min(1),
  opacity: z.number().min(0).max(1).optional(),
});

export const GeoLayerMetaSchema = z.object({
  content_type: z.literal("geo_layer"),
  title: z.string().min(1),
  default_view: MapViewSchema,
  basemap: GeoLayerBasemapSchema.optional(),
  overlays: z.array(GeoLayerOverlaySchema).optional(),
});
