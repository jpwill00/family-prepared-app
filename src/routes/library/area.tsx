import { useState, useEffect } from "react";
import { useParams, NavLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { parseArticle, parseContentMeta, parseGeoLayerMeta } from "@/lib/content/registry";
import { assertWritable, forkDestination } from "@/lib/content/fork";
import ArticleView from "@/components/library/ArticleView";
import GeoLayerView from "@/lib/content/renderers/GeoLayerView";
import type { ParsedArticle, ContentMeta } from "@/lib/content/types";
import type { GeoLayerMeta } from "@/types/geo";

// Vite glob import — all seed library markdown files, raw text
const SEED_MD = import.meta.glob("/seed/library/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Vite glob import — all seed library _meta.yaml files, raw text
const SEED_META = import.meta.glob("/seed/library/**/_meta.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function articlesForArea(areaSlug: string): ParsedArticle[] {
  const prefix = `/seed/library/${areaSlug}/`;
  return Object.entries(SEED_MD)
    .filter(([path]) => path.startsWith(prefix) && !path.endsWith("_meta.yaml"))
    .map(([path, raw]) => {
      const filename = path.slice(prefix.length);
      const slug = filename.replace(/\.md$/, "");
      return parseArticle(slug, raw);
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function rawMetaForArea(areaSlug: string): string | null {
  return SEED_META[`/seed/library/${areaSlug}/_meta.yaml`] ?? null;
}

function metaForArea(areaSlug: string): ContentMeta | null {
  const raw = rawMetaForArea(areaSlug);
  if (!raw) return null;
  try {
    return parseContentMeta(raw);
  } catch {
    return null;
  }
}

function geoMetaForArea(areaSlug: string): GeoLayerMeta | null {
  const raw = rawMetaForArea(areaSlug);
  if (!raw) return null;
  try {
    return parseGeoLayerMeta(raw);
  } catch {
    return null;
  }
}

export default function LibraryAreaPage() {
  const { areaSlug } = useParams<{ areaSlug: string }>();
  const [selected, setSelected] = useState<ParsedArticle | null>(null);
  const [forkMsg, setForkMsg] = useState<string | null>(null);

  const slug = areaSlug ?? "";
  const meta = metaForArea(slug);
  const title = meta?.title ?? slug.replace(/-/g, " ");
  const isGeoLayer = meta?.content_type === "geo_layer";
  const articles = isGeoLayer ? [] : articlesForArea(slug);

  // Auto-select first article when area changes (no-op for geo_layer areas)
  useEffect(() => {
    setSelected(articles[0] ?? null);
    setForkMsg(null);
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // geo_layer areas render a map instead of articles
  if (isGeoLayer) {
    const geoMeta = geoMetaForArea(slug);
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-6 py-3">
          <BackLink />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <div className="flex-1">
          {geoMeta ? (
            <GeoLayerView meta={geoMeta} />
          ) : (
            <p className="p-6 text-muted-foreground">Map configuration not found.</p>
          )}
        </div>
      </div>
    );
  }

  function handleForkToEdit() {
    if (!selected) return;
    try {
      assertWritable("library");
    } catch {
      const dest = forkDestination(slug, selected.slug);
      setForkMsg(
        `"${selected.frontmatter.title}" would be copied to ${dest}. ` +
          `(Full fork-to-edit editing lands in Sprint 1e.)`
      );
      return;
    }
    setForkMsg(null);
  }

  if (articles.length === 0) {
    return (
      <div className="p-6">
        <BackLink />
        <p className="text-muted-foreground">No articles found for "{title}".</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6 p-6">
      {/* Article list sidebar */}
      <nav className="w-48 shrink-0">
        <BackLink />
        <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <ul className="flex flex-col gap-0.5">
          {articles.map((a) => (
            <li key={a.slug}>
              <button
                onClick={() => { setSelected(a); setForkMsg(null); }}
                className={[
                  "w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                  selected?.slug === a.slug
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                ].join(" ")}
              >
                {a.frontmatter.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Article content */}
      <div className="flex-1 overflow-y-auto">
        {forkMsg && (
          <div className="mb-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {forkMsg}
          </div>
        )}
        {selected && (
          <ArticleView
            article={selected}
            zone="library"
            onForkToEdit={handleForkToEdit}
          />
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <NavLink
      to="/library"
      className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft size={12} />
      All topics
    </NavLink>
  );
}
