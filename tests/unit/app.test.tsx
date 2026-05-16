import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

describe("App scaffold", () => {
  it("renders the AppShell sidebar", () => {
    render(
      <MemoryRouter initialEntries={["/plan/household"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("Family Prepared")).toBeInTheDocument();
    expect(screen.getByText("My Plan")).toBeInTheDocument();
    expect(screen.getByText("Reference Library")).toBeInTheDocument();
  });

  it("renders the Household route at /plan/household", () => {
    render(
      <MemoryRouter initialEntries={["/plan/household"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /household/i })).toBeInTheDocument();
  });
});
