import { gpx, kml } from "@tmcw/togeojson";
import type { FeatureCollection } from "geojson";
import { writeTileFile } from "./storage";

export type MapFileFormat = "pmtiles" | "geojson" | "kml" | "gpx";

export class MapImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapImportError";
  }
}

export function detectFormat(filename: string): MapFileFormat {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pmtiles":
      return "pmtiles";
    case "geojson":
    case "json":
      return "geojson";
    case "kml":
      return "kml";
    case "gpx":
      return "gpx";
    default:
      throw new MapImportError(`Unsupported file format: .${ext ?? "unknown"}`);
  }
}

export interface ImportedMapFile {
  format: MapFileFormat;
  filename: string;
  geojson?: FeatureCollection;
  opfsFilename?: string;
}

export async function importMapFile(
  file: File,
  areaId: string
): Promise<ImportedMapFile> {
  const format = detectFormat(file.name);

  switch (format) {
    case "pmtiles": {
      const buffer = await file.arrayBuffer();
      await writeTileFile(areaId, file.name, buffer);
      return { format, filename: file.name, opfsFilename: file.name };
    }
    case "geojson": {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new MapImportError("Invalid GeoJSON: not valid JSON");
      }
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        (parsed as { type?: string }).type !== "FeatureCollection"
      ) {
        throw new MapImportError("Invalid GeoJSON: expected a FeatureCollection");
      }
      return { format, filename: file.name, geojson: parsed as FeatureCollection };
    }
    case "kml":
    case "gpx": {
      const text = await file.text();
      const dom = new DOMParser().parseFromString(text, "text/xml");
      const raw = format === "kml" ? kml(dom) : gpx(dom);
      // @tmcw/togeojson allows null geometry; cast to the stricter GeoJSON type
      const fc = raw as unknown as FeatureCollection;
      return { format, filename: file.name, geojson: fc };
    }
  }
}
