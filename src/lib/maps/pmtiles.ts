import { Protocol } from "pmtiles";
import type maplibregl from "maplibre-gl";

let registered = false;

// Call once before creating any MapLibre map that uses pmtiles:// URLs.
export function registerPMTilesProtocol(ml: typeof maplibregl): void {
  if (registered) return;
  const protocol = new Protocol();
  ml.addProtocol("pmtiles", protocol.tile.bind(protocol));
  registered = true;
}

// Exposed for tests that need to reset state between runs.
export function _resetForTesting(): void {
  registered = false;
}
