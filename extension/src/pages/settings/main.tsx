// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./settings.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Settings root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
