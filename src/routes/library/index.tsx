import { NavLink } from "react-router-dom";
import {
  HeartPulse,
  Radio,
  Waves,
  UtensilsCrossed,
  House,
  MapPin,
  FileText,
  Zap,
  PawPrint,
  Brain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface LibraryArea {
  slug: string;
  title: string;
  icon: LucideIcon;
}

const LIBRARY_AREAS: LibraryArea[] = [
  { slug: "first-aid", title: "First Aid", icon: HeartPulse },
  { slug: "communications", title: "Communications", icon: Radio },
  { slug: "water", title: "Water", icon: Waves },
  { slug: "food", title: "Food", icon: UtensilsCrossed },
  { slug: "shelter", title: "Shelter", icon: House },
  { slug: "evacuation", title: "Evacuation", icon: MapPin },
  { slug: "documents", title: "Documents", icon: FileText },
  { slug: "utilities", title: "Utilities", icon: Zap },
  { slug: "pets", title: "Pets", icon: PawPrint },
  { slug: "mental-health", title: "Mental Health", icon: Brain },
];

export default function LibraryIndexPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Reference Library
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {LIBRARY_AREAS.map(({ slug, title, icon: Icon }) => (
          <NavLink
            key={slug}
            to={`/library/${slug}`}
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 text-center hover:bg-background transition-colors"
          >
            <Icon className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium text-foreground">{title}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
