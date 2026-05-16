import { useMemo } from "react";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { BookOpen, GitFork, CalendarDays, ExternalLink } from "lucide-react";
import type { ParsedArticle } from "@/lib/content/types";

interface ArticleViewProps {
  article: ParsedArticle;
  zone: "library" | "packs" | "custom";
  onForkToEdit?: () => void;
}

export default function ArticleView({ article, zone, onForkToEdit }: ArticleViewProps) {
  const html = useMemo(() => {
    const result = remark().use(remarkHtml, { sanitize: true }).processSync(article.body);
    return String(result);
  }, [article.body]);

  const isReadOnly = zone === "library" || zone === "packs";
  const { title, last_reviewed, sources } = article.frontmatter;

  return (
    <article className="max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="mt-0.5 shrink-0 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>
        {isReadOnly && onForkToEdit && (
          <button
            onClick={onForkToEdit}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <GitFork size={14} />
            Fork to edit
          </button>
        )}
      </div>

      {/* Metadata bar */}
      {(last_reviewed || (sources && sources.length > 0)) && (
        <div className="mb-6 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
          {last_reviewed && (
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarDays size={12} />
              <span>Last reviewed: {last_reviewed}</span>
            </div>
          )}
          {sources && sources.length > 0 && (
            <div className="flex items-start gap-1.5">
              <ExternalLink size={12} className="mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Sources: </span>
                {sources.join(" · ")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div
        className="prose prose-sm max-w-none text-foreground
          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2
          [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
          [&_li]:my-0.5
          [&_p]:my-2
          [&_strong]:font-semibold
          [&_a]:text-primary [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
