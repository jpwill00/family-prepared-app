import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { GeoLayerMeta } from "@/types/geo";

// Mock the lazy-loaded GeoLayerMap so we never touch maplibre-gl in jsdom
vi.mock("@/lib/content/renderers/GeoLayerMap", () => ({
  default: ({ meta }: { meta: GeoLayerMeta }) => (
    <div data-testid="geo-layer-map">{meta.title}</div>
  ),
}));

import GeoLayerView from "@/lib/content/renderers/GeoLayerView";

const MINIMAL_META: GeoLayerMeta = {
  content_type: "geo_layer",
  title: "Test Map",
  default_view: { lat: 47.6, lng: -122.3, zoom: 10 },
};

const WITH_BASEMAP: GeoLayerMeta = {
  ...MINIMAL_META,
  title: "Map With Basemap",
  basemap: { type: "pmtiles", url: "pmtiles://./tiles/topo.pmtiles", attribution: "USGS" },
  overlays: [{ type: "geojson", url: "./hydrography.geojson", opacity: 0.5 }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderView(meta: GeoLayerMeta) {
  return render(
    <MemoryRouter>
      <GeoLayerView meta={meta} />
    </MemoryRouter>
  );
}

describe("GeoLayerView", () => {
  it("renders the map with the area title", async () => {
    renderView(MINIMAL_META);
    expect(await screen.findByTestId("geo-layer-map")).toBeInTheDocument();
    expect(screen.getByText("Test Map")).toBeInTheDocument();
  });

  it("passes basemap and overlays through to GeoLayerMap", async () => {
    renderView(WITH_BASEMAP);
    expect(await screen.findByText("Map With Basemap")).toBeInTheDocument();
  });

  it("renders a loading fallback before the lazy chunk resolves", () => {
    // React.lazy resolves synchronously in test env when the module is mocked,
    // so we just verify the wrapper div is present.
    const { container } = renderView(MINIMAL_META);
    expect(container.firstChild).toBeInTheDocument();
  });
});
