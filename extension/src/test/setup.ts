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

// React 19 needs this set so React.act(...) works without a console warning
// (testing-library/render wraps act internally, but our Shadow-DOM mount
// tests in src/content/schedule-modal/mount.test.tsx call createRoot via
// openScheduleModal directly and wrap their own act around it).
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
