import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/plan" replace />} />
        <Route path="/plan" element={<div className="p-8 text-green-700 font-semibold">family-prepared-app — Sprint 0 scaffold ✓</div>} />
        <Route path="*" element={<Navigate to="/plan" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
