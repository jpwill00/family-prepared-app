import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArticleView from "@/components/library/ArticleView";
import type { ParsedArticle } from "@/lib/content/types";

const ARTICLE: ParsedArticle = {
  slug: "bleeding-control",
  frontmatter: {
    title: "Bleeding Control",
    last_reviewed: "2026-04-01",
    sources: ["Stop the Bleed (ACS)", "FEMA CPG-101"],
  },
  body: "## Control Bleeding\n\nApply **direct pressure** with a clean cloth.\n\n- Use a tourniquet for severe limb bleeding\n- Note the time applied",
};

function renderView(zone: "library" | "custom", onForkToEdit?: () => void) {
  return render(
    <MemoryRouter>
      <ArticleView article={ARTICLE} zone={zone} onForkToEdit={onForkToEdit} />
    </MemoryRouter>
  );
}

describe("ArticleView", () => {
  it("renders the article title", () => {
    renderView("library");
    expect(screen.getByRole("heading", { name: "Bleeding Control" })).toBeInTheDocument();
  });

  it("renders markdown body as HTML", () => {
    renderView("library");
    expect(screen.getByText(/Apply/)).toBeInTheDocument();
    // remark converts ** to <strong>
    expect(document.querySelector("strong")).toBeInTheDocument();
  });

  it("shows last_reviewed metadata", () => {
    renderView("library");
    expect(screen.getByText(/Last reviewed/)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-01/)).toBeInTheDocument();
  });

  it("shows sources metadata", () => {
    renderView("library");
    expect(screen.getByText(/Stop the Bleed/)).toBeInTheDocument();
    expect(screen.getByText(/FEMA CPG-101/)).toBeInTheDocument();
  });

  it("shows Fork to edit button when zone=library and handler provided", () => {
    renderView("library", () => {});
    expect(screen.getByRole("button", { name: /fork to edit/i })).toBeInTheDocument();
  });

  it("does not show Fork to edit button when zone=custom", () => {
    renderView("custom", () => {});
    expect(screen.queryByRole("button", { name: /fork to edit/i })).not.toBeInTheDocument();
  });

  it("does not show Fork to edit button when no handler provided", () => {
    renderView("library");
    expect(screen.queryByRole("button", { name: /fork to edit/i })).not.toBeInTheDocument();
  });

  it("calls onForkToEdit when button clicked", () => {
    let called = false;
    renderView("library", () => { called = true; });
    fireEvent.click(screen.getByRole("button", { name: /fork to edit/i }));
    expect(called).toBe(true);
  });

  it("renders article with no sources or last_reviewed without metadata bar", () => {
    const minimal: ParsedArticle = {
      slug: "simple",
      frontmatter: { title: "Simple Article" },
      body: "Just a paragraph.",
    };
    render(
      <MemoryRouter>
        <ArticleView article={minimal} zone="library" />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "Simple Article" })).toBeInTheDocument();
    expect(screen.queryByText(/Last reviewed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sources/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Fork guard
// ---------------------------------------------------------------------------

import { describe as d2, it as it2 } from "vitest";
import { assertWritable, forkDestination, ForkGuardError } from "@/lib/content/fork";

d2("assertWritable", () => {
  it2("throws ForkGuardError for library zone", () => {
    expect(() => assertWritable("library")).toThrow(ForkGuardError);
    expect(() => assertWritable("library")).toThrow(/read-only/i);
  });

  it2("throws ForkGuardError for packs zone", () => {
    expect(() => assertWritable("packs")).toThrow(ForkGuardError);
  });

  it2("does not throw for plan zone", () => {
    expect(() => assertWritable("plan")).not.toThrow();
  });

  it2("does not throw for custom zone", () => {
    expect(() => assertWritable("custom")).not.toThrow();
  });
});

d2("forkDestination", () => {
  it2("produces custom/ path from library area and slug", () => {
    expect(forkDestination("first-aid", "bleeding-control")).toBe(
      "custom/first-aid/bleeding-control.md"
    );
  });

  it2("handles multi-word area slugs", () => {
    expect(forkDestination("mental-health", "disaster-stress")).toBe(
      "custom/mental-health/disaster-stress.md"
    );
  });
});
