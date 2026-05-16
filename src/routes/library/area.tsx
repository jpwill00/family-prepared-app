import { useParams } from "react-router-dom";

function formatAreaTitle(slug: string): string {
  const words = slug.replace(/-/g, " ").split(" ");
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ");
}

export default function LibraryAreaPage() {
  const { areaSlug } = useParams<{ areaSlug: string }>();
  const title = areaSlug ? formatAreaTitle(areaSlug) : "Library Area";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>
      <p className="text-muted-foreground">
        Articles for this area will appear here.
      </p>
    </div>
  );
}
