// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { installChromeMock, resetChromeStore } from "./chrome-mock";

installChromeMock();
beforeEach(resetChromeStore);
// With Vitest globals:false, RTL's auto-cleanup isn't registered — do it here
// so each test starts with a clean DOM.
afterEach(cleanup);
