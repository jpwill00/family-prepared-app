import "@testing-library/jest-dom";
import { vi } from "vitest";

// idb-keyval calls indexedDB which doesn't exist in jsdom.
// Any test that renders App (which calls hydrate) gets a no-op store.
vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(),
}));
