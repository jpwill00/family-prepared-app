import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

describe("App scaffold", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter initialEntries={["/plan"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/family-prepared/i)).toBeInTheDocument();
  });
});
