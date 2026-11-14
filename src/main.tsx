import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import "./marketplace.css";

async function start() {
  if (import.meta.env.VITE_MOCKS !== "off") {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }
  const { App } = await import("./app");
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
start();
