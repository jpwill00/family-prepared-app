import { describe, it, expect, vi, beforeEach } from "vitest";
import { gpx as parseGpx, kml as parseKml } from "@tmcw/togeojson";
import { detectFormat, importMapFile, MapImportError } from "@/lib/maps/import";
import { geojsonToGpx, geojsonToKml } from "@/lib/maps/export";
import type { FeatureCollection, Feature, Point, LineString } from "geojson";

// importMapFile calls writeTileFile for pmtiles — mock OPFS storage
vi.mock("@/lib/maps/storage", () => ({
  writeTileFile: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// detectFormat
// ---------------------------------------------------------------------------

describe("detectFormat", () => {
  it.each([
    ["route.gpx", "gpx"],
    ["data.kml", "kml"],
    ["area.geojson", "geojson"],
    ["area.json", "geojson"],
    ["tiles.pmtiles", "pmtiles"],
  ] as const)("detects %s → %s", (filename, expected) => {
    expect(detectFormat(filename)).toBe(expected);
  });

  it("throws MapImportError for unsupported extension", () => {
    expect(() => detectFormat("map.xyz")).toThrow(MapImportError);
    expect(() => detectFormat("map.xyz")).toThrow(/unsupported/i);
  });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const POINT_FEATURE: Feature<Point> = {
  type: "Feature",
  properties: { name: "Rendezvous" },
  geometry: { type: "Point", coordinates: [-122.3, 47.6] },
};

const LINE_FEATURE: Feature<LineString> = {
  type: "Feature",
  properties: { name: "Evacuation Route" },
  geometry: { type: "LineString", coordinates: [[-122.3, 47.6], [-122.4, 47.7]] },
};

const FC: FeatureCollection = {
  type: "FeatureCollection",
  features: [POINT_FEATURE, LINE_FEATURE],
};

const GPX_FIXTURE = `<?xml version="1.0"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="47.6" lon="-122.3"><name>Shelter</name></wpt>
  <trk><name>Route</name><trkseg>
    <trkpt lat="47.6" lon="-122.3"/>
    <trkpt lat="47.7" lon="-122.4"/>
  </trkseg></trk>
</gpx>`;

const KML_FIXTURE = `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <Placemark><name>Shelter</name><Point><coordinates>-122.3,47.6,0</coordinates></Point></Placemark>
  <Placemark><name>Route</name><LineString><coordinates>-122.3,47.6 -122.4,47.7</coordinates></LineString></Placemark>
</Document></kml>`;

// ---------------------------------------------------------------------------
// geojsonToGpx
// ---------------------------------------------------------------------------

describe("geojsonToGpx", () => {
  it("produces a valid GPX string with wpt and trk elements", () => {
    const gpxStr = geojsonToGpx(FC);
    expect(gpxStr).toContain("<gpx");
    expect(gpxStr).toContain("<wpt");
    expect(gpxStr).toContain("47.6");
    expect(gpxStr).toContain("-122.3");
    expect(gpxStr).toContain("<trk>");
  });

  it("round-trips: GeoJSON → GPX → GeoJSON preserves point coordinates", () => {
    const gpxStr = geojsonToGpx(FC);
    const dom = new DOMParser().parseFromString(gpxStr, "text/xml");
    const roundTripped = parseGpx(dom);
    const point = roundTripped.features.find(
      (f) => f.geometry?.type === "Point"
    );
    expect(point).toBeTruthy();
    const coords = (point!.geometry as Point).coordinates;
    expect(coords[0]).toBeCloseTo(-122.3, 4);
    expect(coords[1]).toBeCloseTo(47.6, 4);
  });

  it("round-trips: GeoJSON → GPX → GeoJSON preserves line coordinates", () => {
    const gpxStr = geojsonToGpx(FC);
    const dom = new DOMParser().parseFromString(gpxStr, "text/xml");
    const roundTripped = parseGpx(dom);
    const line = roundTripped.features.find(
      (f) => f.geometry?.type === "LineString"
    );
    expect(line).toBeTruthy();
    const coords = (line!.geometry as LineString).coordinates;
    expect(coords).toHaveLength(2);
    expect(coords[0][0]).toBeCloseTo(-122.3, 4);
  });
});

// ---------------------------------------------------------------------------
// geojsonToKml
// ---------------------------------------------------------------------------

describe("geojsonToKml", () => {
  it("produces a valid KML string with Placemark elements", () => {
    const kmlStr = geojsonToKml(FC);
    expect(kmlStr).toContain("<kml");
    expect(kmlStr).toContain("<Placemark>");
    expect(kmlStr).toContain("<Point>");
    expect(kmlStr).toContain("<LineString>");
  });

  it("round-trips: GeoJSON → KML → GeoJSON preserves point coordinates", () => {
    const kmlStr = geojsonToKml(FC);
    const dom = new DOMParser().parseFromString(kmlStr, "text/xml");
    const roundTripped = parseKml(dom);
    const point = roundTripped.features.find(
      (f) => f.geometry?.type === "Point"
    );
    expect(point).toBeTruthy();
    const coords = (point!.geometry as Point).coordinates;
    expect(coords[0]).toBeCloseTo(-122.3, 4);
    expect(coords[1]).toBeCloseTo(47.6, 4);
  });

  it("escapes XML special characters in names", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { name: "Route <A> & B" },
        geometry: { type: "Point", coordinates: [0, 0] },
      }],
    };
    const kmlStr = geojsonToKml(fc);
    expect(kmlStr).toContain("Route &lt;A&gt; &amp; B");
    expect(kmlStr).not.toContain("<A>");
  });
});

// ---------------------------------------------------------------------------
// importMapFile — vector formats
// ---------------------------------------------------------------------------

describe("importMapFile — GPX", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses a GPX file into a GeoJSON FeatureCollection", async () => {
    const file = new File([GPX_FIXTURE], "route.gpx", { type: "application/gpx+xml" });
    const result = await importMapFile(file, "evac");
    expect(result.format).toBe("gpx");
    expect(result.geojson?.type).toBe("FeatureCollection");
    expect(result.geojson?.features.length).toBeGreaterThan(0);
  });
});

describe("importMapFile — KML", () => {
  it("parses a KML file into a GeoJSON FeatureCollection", async () => {
    const file = new File([KML_FIXTURE], "area.kml", { type: "application/vnd.google-earth.kml+xml" });
    const result = await importMapFile(file, "evac");
    expect(result.format).toBe("kml");
    expect(result.geojson?.features.length).toBeGreaterThan(0);
  });
});

describe("importMapFile — GeoJSON", () => {
  it("parses a GeoJSON file", async () => {
    const content = JSON.stringify(FC);
    const file = new File([content], "markups.geojson", { type: "application/json" });
    const result = await importMapFile(file, "evac");
    expect(result.format).toBe("geojson");
    expect(result.geojson?.features).toHaveLength(2);
  });

  it("throws MapImportError for invalid JSON", async () => {
    const file = new File(["not json"], "bad.geojson", { type: "application/json" });
    await expect(importMapFile(file, "evac")).rejects.toThrow(MapImportError);
  });

  it("throws MapImportError when root is not a FeatureCollection", async () => {
    const file = new File(['{"type":"Feature"}'], "bad.geojson");
    await expect(importMapFile(file, "evac")).rejects.toThrow(/FeatureCollection/);
  });
});

describe("importMapFile — PMTiles", () => {
  it("writes to OPFS and returns opfsFilename", async () => {
    const { writeTileFile } = await import("@/lib/maps/storage");
    const file = new File([new Uint8Array(16)], "topo.pmtiles");
    const result = await importMapFile(file, "evac");
    expect(result.format).toBe("pmtiles");
    expect(result.opfsFilename).toBe("topo.pmtiles");
    expect(writeTileFile).toHaveBeenCalledWith("evac", "topo.pmtiles", expect.any(ArrayBuffer));
  });
});
