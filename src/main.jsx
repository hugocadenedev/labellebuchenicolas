import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import faviconUrl from "../logo-la-belle-buche-reel.png";

if (typeof document !== "undefined") {
  const favicon = document.querySelector("link[rel='icon']") || document.createElement("link");
  favicon.rel = "icon";
  favicon.href = faviconUrl;
  if (!favicon.isConnected) {
    document.head.appendChild(favicon);
  }
}

if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin") && !window.location.hash) {
  const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/admin";
  const nextUrl = `${window.location.origin}/#${normalizedPath}${window.location.search}`;
  window.location.replace(nextUrl);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
