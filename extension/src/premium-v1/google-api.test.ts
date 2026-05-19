import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./oauth", () => ({
  getAccessToken: vi.fn(),
  invalidateStoredToken: vi.fn(async () => {}),
}));

import { searchContactTimezone } from "./google-api";
import { getAccessToken, invalidateStoredToken } from "./oauth";

const mockToken = vi.mocked(getAccessToken);
const mockInvalidate = vi.mocked(invalidateStoredToken);

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function person(p: unknown) {
  return { results: [{ person: p }] };
}

beforeEach(() => {
  mockToken.mockReset();
  mockInvalidate.mockClear();
  mockToken.mockResolvedValue({ ok: true, token: "AT" });
});

// The shared §6.7 authedGetJson contract (no-token / network / 401-retry /
// http_error / bad_response) is exercised through searchContactTimezone —
// the only remaining caller (getCalendarTimezone was removed: browser tz is
// the v1 source per the PRD §5.1.3 amendment).
describe("searchContactTimezone — §6.7 transport contract", () => {
  it("no usable token → needs_auth (cascade then goes manual, never blocks)", async () => {
    mockToken.mockResolvedValue({ ok: false, reason: "needs_interactive" });
    vi.stubGlobal("fetch", vi.fn());
    expect(await searchContactTimezone("a@x.com")).toEqual({
      ok: false,
      reason: "needs_auth",
    });
  });

  it("fetch throws → network (never throws to caller)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    expect(await searchContactTimezone("a@x.com")).toEqual({
      ok: false,
      reason: "network",
    });
  });

  it("401 → invalidates token, retries ONCE, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, {}))
      .mockResolvedValueOnce(
        res(200, person({ names: [{ displayName: "Ann" }] })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const r = await searchContactTimezone("ann@x.com");
    expect(r).toEqual({ ok: true, timezone: null, name: "Ann" });
    expect(mockInvalidate).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a persistent 401 does not loop (one retry, then http_error)", async () => {
    const fetchMock = vi.fn(async () => res(401, {}));
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchContactTimezone("a@x.com")).toEqual({
      ok: false,
      reason: "http_error",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("http error → typed http_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(503, {})),
    );
    expect(await searchContactTimezone("a@x.com")).toEqual({
      ok: false,
      reason: "http_error",
    });
  });
});

describe("searchContactTimezone — parsing (§5.4.1 step 2)", () => {
  it("extracts the display name; no IANA location → timezone null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        res(200, person({ names: [{ displayName: "Dana" }], locations: [] })),
      ),
    );
    expect(await searchContactTimezone("dana@x.com")).toEqual({
      ok: true,
      timezone: null,
      name: "Dana",
    });
  });

  it("returns a timezone only when a location value is a real IANA zone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        res(
          200,
          person({
            names: [{ displayName: "Eve" }],
            locations: [{ value: "America/Los_Angeles" }],
          }),
        ),
      ),
    );
    expect(await searchContactTimezone("eve@x.com")).toEqual({
      ok: true,
      timezone: "America/Los_Angeles",
      name: "Eve",
    });
  });

  it("a free-text location is NOT treated as a timezone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        res(200, person({ locations: [{ value: "San Francisco, CA" }] })),
      ),
    );
    expect(await searchContactTimezone("f@x.com")).toEqual({
      ok: true,
      timezone: null,
      name: null,
    });
  });

  it("no results → timezone null, name null (cascade continues)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(200, {})),
    );
    expect(await searchContactTimezone("ghost@x.com")).toEqual({
      ok: true,
      timezone: null,
      name: null,
    });
  });
});
