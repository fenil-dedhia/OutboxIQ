// Minimal in-memory chrome.* mock for jsdom unit tests. Only the surface the
// code under test touches (storage.local, runtime, tabs/windows) is mocked.

let store: Record<string, unknown> = {};

type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
) => void;
let storageListeners: StorageChangeListener[] = [];

export function resetChromeStore(): void {
  store = {};
  storageListeners = [];
}

/** Directly seed storage for tests (e.g. a resumable onboarding draft). */
export function seedStorage(values: Record<string, unknown>): void {
  Object.assign(store, values);
}

/** Fire a chrome.storage.onChanged event to registered listeners. Lets a test
 * exercise live cross-context paths (e.g. the §5.8.2 → open-modal pin sync). */
export function emitStorageChange(
  changes: Record<string, chrome.storage.StorageChange>,
  area = "local",
): void {
  for (const cb of [...storageListeners]) cb(changes, area);
}

export function installChromeMock(): void {
  const chromeMock = {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        },
        remove: async (key: string) => {
          delete store[key];
        },
      },
      // chrome.storage.onChanged surface — content-script.ts subscribes to
      // it for the post-Session-10 live-onboarding-upgrade path; config-
      // cache.ts keeps the §5.5.1 snapshot fresh; the §5.3 modal keeps its
      // pinned list live (§5.8.2 → open-modal sync). Listeners are registered
      // so a test can drive them via emitStorageChange(); nothing fires
      // automatically on set(), so existing tests are unaffected.
      onChanged: {
        addListener: (cb: StorageChangeListener) => {
          storageListeners.push(cb);
        },
        removeListener: (cb: StorageChangeListener) => {
          const i = storageListeners.indexOf(cb);
          if (i >= 0) storageListeners.splice(i, 1);
        },
      },
    },
    runtime: {
      // Present + truthy = a live (non-orphaned) extension context. The page-
      // ownership check (page-install-latch.ts) reads this; an orphaned content
      // script reads `undefined` here. Tests that exercise the orphaned path
      // delete it explicitly.
      id: "fashionably-late-test",
      getURL: (path: string) => `chrome-extension://test/${path}`,
      // Mirrors manifest.config.ts `version`; the §5.8.2 About section reads
      // the version from here. Tests that assert dynamic reads override it.
      getManifest: () => ({ version: "1.0.0" }),
      sendMessage: async () => undefined,
      onMessage: { addListener: () => undefined },
      onInstalled: { addListener: () => undefined },
      lastError: undefined,
    },
    tabs: {
      query: async () => [],
      create: async () => ({}),
      update: async () => ({}),
      getCurrent: async () => ({ id: 1 }),
      remove: async () => undefined,
    },
    windows: { update: async () => ({}) },
    // Minimal identity surface (Free v1 OAuth). getRedirectURL is the stable
    // pinned value; launchWebAuthFlow rejects by default so a test must
    // explicitly stub a success/denial for the case it exercises.
    identity: {
      getRedirectURL: () =>
        "https://dicnmcmhapcfceodecocnkaacjdpplnm.chromiumapp.org/",
      launchWebAuthFlow: async () => {
        throw new Error("launchWebAuthFlow not stubbed in this test");
      },
    },
  };
  globalThis.chrome = chromeMock as unknown as typeof chrome;
}
