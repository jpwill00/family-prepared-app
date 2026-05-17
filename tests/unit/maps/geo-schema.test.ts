import { describe, it, expect } from "vitest";
import { GeoLayerMetaSchema } from "@/lib/schemas/geo";

const VALID_META = {
  content_type: "geo_layer" as const,
  title: "Evacuation Routes",
  default_view: { lat: 47.6, lng: -122.3, zoom: 11 },
};

describe("GeoLayerMetaSchema", () => {
  it("accepts minimal valid meta", () => {
    expect(GeoLayerMetaSchema.safeParse(VALID_META).success).toBe(true);
  });

  it("accepts full meta with basemap and overlays", () => {
    const input = {
      ...VALID_META,
      basemap: {
        type: "pmtiles",
        url: "./tiles/topo.pmtiles",
        attribution: "USGS (public domain)",
      },
      overlays: [
        { type: "pmtiles", url: "./tiles/hillshade.pmtiles", opacity: 0.4 },
        { type: "geojson", url: "./hydrography.geojson" },
      ],
    };
    expect(GeoLayerMetaSchema.safeParse(input).success).toBe(true);
  });

  it("rejects missing default_view", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { default_view: _dv, ...noView } = VALID_META;
    expect(GeoLayerMetaSchema.safeParse(noView).success).toBe(false);
  });

  it("rejects wrong content_type literal", () => {
    expect(
      GeoLayerMetaSchema.safeParse({ ...VALID_META, content_type: "article_collection" }).success
    ).toBe(false);
  });

  it("rejects zoom out of range", () => {
    const input = { ...VALID_META, default_view: { lat: 0, lng: 0, zoom: 23 } };
    expect(GeoLayerMetaSchema.safeParse(input).success).toBe(false);
  });

  it("rejects overlay opacity > 1", () => {
    const input = {
      ...VALID_META,
      overlays: [{ type: "geojson", url: "./data.geojson", opacity: 1.5 }],
    };
    expect(GeoLayerMetaSchema.safeParse(input).success).toBe(false);
  });

  it("rejects invalid basemap type", () => {
    const input = {
      ...VALID_META,
      basemap: { type: "mbtiles", url: "./tiles/foo.mbtiles" },
    };
    expect(GeoLayerMetaSchema.safeParse(input).success).toBe(false);
  });

  it("rejects empty title", () => {
    expect(GeoLayerMetaSchema.safeParse({ ...VALID_META, title: "" }).success).toBe(false);
  });
});
