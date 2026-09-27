import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import "./i18n"; // Initialize i18n
import App from "./App.tsx";

import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { QueryProvider } from "./providers/QueryProvider";
import { ToastProvider } from "./components/ui/Toast";
import { initScrollAnimations } from "./utils/scrollAnimations";

if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initScrollAnimations);
  } else {
    setTimeout(initScrollAnimations, 0);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
