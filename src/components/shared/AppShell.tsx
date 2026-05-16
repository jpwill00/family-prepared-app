import { NavLink, Outlet } from "react-router-dom";
import {
  Users, Radio, MapPin, Package, FileText, Zap,
  HeartPulse, Waves, UtensilsCrossed, House, PawPrint,
  Brain, BookOpen, ChevronRight,
} from "lucide-react";

const PLAN_NAV = [
  { to: "/plan/household",      label: "Household",       Icon: Users },
  { to: "/plan/communications", label: "Communications",  Icon: Radio },
  { to: "/plan/evacuation",     label: "Evacuation",      Icon: MapPin },
  { to: "/plan/inventory",      label: "Inventory",       Icon: Package },
  { to: "/plan/documents",      label: "Documents",       Icon: FileText },
  { to: "/plan/utilities",      label: "Utilities",       Icon: Zap },
];

const LIBRARY_NAV = [
  { to: "/library/first-aid",    label: "First Aid",          Icon: HeartPulse },
  { to: "/library/communications", label: "Communications",   Icon: Radio },
  { to: "/library/water",        label: "Water",              Icon: Waves },
  { to: "/library/food",         label: "Food & Nutrition",   Icon: UtensilsCrossed },
  { to: "/library/shelter",      label: "Shelter & Warmth",   Icon: House },
  { to: "/library/evacuation",   label: "Evacuation",         Icon: MapPin },
  { to: "/library/documents",    label: "Documents",          Icon: FileText },
  { to: "/library/power",        label: "Power & Lighting",   Icon: Zap },
  { to: "/library/pets",         label: "Pets & Animals",     Icon: PawPrint },
  { to: "/library/mental-health", label: "Mental Health",     Icon: Brain },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
    isActive
      ? "bg-primary text-primary-foreground font-medium"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  ].join(" ");

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 overflow-y-auto border-r border-border bg-card p-3">
        <div className="mb-4 flex items-center gap-2 px-3 py-2">
          <span className="text-lg font-bold text-primary">Family Prepared</span>
        </div>

        {/* Plan zone */}
        <SidebarSection label="My Plan">
          {PLAN_NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </SidebarSection>

        {/* Library zone */}
        <SidebarSection label="Reference Library">
          <NavLink to="/library" end className={linkClass}>
            <BookOpen size={15} />
            All Topics
          </NavLink>
          {LIBRARY_NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </SidebarSection>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ChevronRight size={11} />
        {label}
      </div>
      <nav className="flex flex-col gap-0.5">{children}</nav>
    </div>
  );
}
