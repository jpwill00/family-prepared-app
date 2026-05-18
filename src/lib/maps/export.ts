import type {
  FeatureCollection,
  Feature,
  Point,
  LineString,
  MultiLineString,
  Polygon,
} from "geojson";

export class MapExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapExportError";
  }
}

// ---------------------------------------------------------------------------
// GeoJSON → GPX
// ---------------------------------------------------------------------------

function coordsToTrkpts(coords: number[][]): string {
  return coords
    .map(([lon, lat]) => `    <trkpt lat="${lat}" lon="${lon}"/>`)
    .join("\n");
}

function featureToGpxElement(feature: Feature): string {
  const name = (feature.properties?.name as string | undefined) ?? "";
  const nameTag = name ? `  <name>${escapeXml(name)}</name>\n` : "";
  const geom = feature.geometry;

  if (!geom) return "";

  switch (geom.type) {
    case "Point": {
      const [lon, lat] = (geom as Point).coordinates;
      return `<wpt lat="${lat}" lon="${lon}">\n${nameTag}</wpt>`;
    }
    case "LineString": {
      const pts = coordsToTrkpts((geom as LineString).coordinates);
      return `<trk>\n${nameTag}  <trkseg>\n${pts}\n  </trkseg>\n</trk>`;
    }
    case "MultiLineString": {
      const segs = (geom as MultiLineString).coordinates
        .map((ring) => `  <trkseg>\n${coordsToTrkpts(ring)}\n  </trkseg>`)
        .join("\n");
      return `<trk>\n${nameTag}${segs}\n</trk>`;
    }
    case "Polygon": {
      // Render outer ring as a closed track
      const pts = coordsToTrkpts((geom as Polygon).coordinates[0]);
      return `<trk>\n${nameTag}  <trkseg>\n${pts}\n  </trkseg>\n</trk>`;
    }
    default:
      return "";
  }
}

export function geojsonToGpx(fc: FeatureCollection, name = "markups"): string {
  const elements = fc.features.map(featureToGpxElement).filter(Boolean).join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<gpx version="1.1" creator="family-prepared" xmlns="http://www.topografix.com/GPX/1/1">`,
    `<metadata><name>${escapeXml(name)}</name></metadata>`,
    elements,
    `</gpx>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// GeoJSON → KML
// ---------------------------------------------------------------------------

function coordsToKmlString(coords: number[][]): string {
  return coords.map(([lon, lat]) => `${lon},${lat},0`).join(" ");
}

function featureToKmlElement(feature: Feature): string {
  const name = (feature.properties?.name as string | undefined) ?? "";
  const nameTag = name ? `    <name>${escapeXml(name)}</name>\n` : "";
  const geom = feature.geometry;

  if (!geom) return "";

  switch (geom.type) {
    case "Point": {
      const [lon, lat] = (geom as Point).coordinates;
      return (
        `  <Placemark>\n${nameTag}` +
        `    <Point><coordinates>${lon},${lat},0</coordinates></Point>\n` +
        `  </Placemark>`
      );
    }
    case "LineString": {
      const cs = coordsToKmlString((geom as LineString).coordinates);
      return (
        `  <Placemark>\n${nameTag}` +
        `    <LineString><coordinates>${cs}</coordinates></LineString>\n` +
        `  </Placemark>`
      );
    }
    case "MultiLineString": {
      const lines = (geom as MultiLineString).coordinates
        .map((ring) => `      <LineString><coordinates>${coordsToKmlString(ring)}</coordinates></LineString>`)
        .join("\n");
      return (
        `  <Placemark>\n${nameTag}` +
        `    <MultiGeometry>\n${lines}\n    </MultiGeometry>\n` +
        `  </Placemark>`
      );
    }
    case "Polygon": {
      const outer = coordsToKmlString((geom as Polygon).coordinates[0]);
      return (
        `  <Placemark>\n${nameTag}` +
        `    <Polygon><outerBoundaryIs><LinearRing>` +
        `<coordinates>${outer}</coordinates>` +
        `</LinearRing></outerBoundaryIs></Polygon>\n` +
        `  </Placemark>`
      );
    }
    default:
      return "";
  }
}

export function geojsonToKml(fc: FeatureCollection, name = "markups"): string {
  const placemarks = fc.features.map(featureToKmlElement).filter(Boolean).join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<kml xmlns="http://www.opengis.net/kml/2.2">`,
    `<Document>`,
    `  <name>${escapeXml(name)}</name>`,
    placemarks,
    `</Document>`,
    `</kml>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
