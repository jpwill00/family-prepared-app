import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { usePlanStore } from "@/lib/store/plan";
import AppShell from "@/components/shared/AppShell";

// Plan zone routes
import HouseholdRoute from "@/routes/plan/household";
import CommunicationsRoute from "@/routes/plan/communications";
import EvacuationRoute from "@/routes/plan/evacuation";
import InventoryRoute from "@/routes/plan/inventory";
import DocumentsRoute from "@/routes/plan/documents";
import UtilitiesRoute from "@/routes/plan/utilities";

// Library zone routes
import LibraryIndexRoute from "@/routes/library/index";
import LibraryAreaRoute from "@/routes/library/area";

export default function App() {
  const hydrate = usePlanStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/plan/household" replace />} />
      <Route element={<AppShell />}>
        <Route path="/plan" element={<Navigate to="/plan/household" replace />} />
        <Route path="/plan/household" element={<HouseholdRoute />} />
        <Route path="/plan/communications" element={<CommunicationsRoute />} />
        <Route path="/plan/evacuation" element={<EvacuationRoute />} />
        <Route path="/plan/inventory" element={<InventoryRoute />} />
        <Route path="/plan/documents" element={<DocumentsRoute />} />
        <Route path="/plan/utilities" element={<UtilitiesRoute />} />
        <Route path="/library" element={<LibraryIndexRoute />} />
        <Route path="/library/:areaSlug" element={<LibraryAreaRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/plan/household" replace />} />
    </Routes>
  );
}
