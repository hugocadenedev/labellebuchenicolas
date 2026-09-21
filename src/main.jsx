import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
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

// Redirige les anciens liens en #/route (ex-HashRouter) vers l'URL propre equivalente pour ne pas casser les liens deja partages/indexes.
if (typeof window !== "undefined" && window.location.hash.startsWith("#/")) {
  const nextPath = window.location.hash.slice(1);
  window.history.replaceState(null, "", `${window.location.origin}${nextPath}${window.location.search}`);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
