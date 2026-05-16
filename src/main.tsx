import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import "@/styles/index.css";
import App from "@/App";
import LockScreen from "@/components/LockScreen";

registerSW({ immediate: false });

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename="/family-prepared-app">
      <LockScreen>
        <App />
      </LockScreen>
    </BrowserRouter>
  </StrictMode>
);
