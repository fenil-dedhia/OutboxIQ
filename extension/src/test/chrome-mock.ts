// Minimal in-memory chrome.* mock for jsdom unit tests. Only the surface the
// code under test touches (storage.local, runtime, tabs/windows) is mocked.

let store: Record<string, unknown> = {};

export function resetChromeStore(): void {
  store = {};
}

/** Directly seed storage for tests (e.g. a resumable onboarding draft). */
export function seedStorage(values: Record<string, unknown>): void {
  Object.assign(store, values);
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
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
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
