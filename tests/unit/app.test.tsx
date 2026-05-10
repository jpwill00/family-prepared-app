import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("App scaffold", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText(/family-prepared/i)).toBeInTheDocument();
  });
});
