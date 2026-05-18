import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPMTilesProtocol, _resetForTesting } from "@/lib/maps/pmtiles";

vi.mock("pmtiles", () => ({
  Protocol: vi.fn().mockImplementation(() => ({
    tile: vi.fn().mockReturnValue("tile-handler"),
  })),
}));

const mockAddProtocol = vi.fn();
const mockMaplibre = { addProtocol: mockAddProtocol } as never;

beforeEach(() => {
  vi.clearAllMocks();
  _resetForTesting();
});

describe("registerPMTilesProtocol", () => {
  it("calls addProtocol with 'pmtiles' on first call", () => {
    registerPMTilesProtocol(mockMaplibre);
    expect(mockAddProtocol).toHaveBeenCalledWith("pmtiles", expect.any(Function));
  });

  it("does not call addProtocol a second time", () => {
    registerPMTilesProtocol(mockMaplibre);
    registerPMTilesProtocol(mockMaplibre);
    expect(mockAddProtocol).toHaveBeenCalledTimes(1);
  });

  it("registers again after _resetForTesting", () => {
    registerPMTilesProtocol(mockMaplibre);
    _resetForTesting();
    registerPMTilesProtocol(mockMaplibre);
    expect(mockAddProtocol).toHaveBeenCalledTimes(2);
  });
});
