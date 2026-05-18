import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./oauth", () => ({
  getAccessToken: vi.fn(),
  invalidateStoredToken: vi.fn(async () => {}),
}));

import { getCalendarTimezone, searchContactTimezone } from "./google-api";
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

beforeEach(() => {
  mockToken.mockReset();
  mockInvalidate.mockClear();
  mockToken.mockResolvedValue({ ok: true, token: "AT" });
});

describe("getCalendarTimezone (§5.1.3/§7.4)", () => {
  it("returns the IANA value on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(200, { value: "America/New_York" })),
    );
    expect(await getCalendarTimezone(true)).toEqual({
      ok: true,
      timezone: "America/New_York",
    });
  });

  it("no token → needs_auth (caller keeps the browser fallback, §6.7)", async () => {
    mockToken.mockResolvedValue({ ok: false, reason: "needs_interactive" });
    vi.stubGlobal("fetch", vi.fn());
    expect(await getCalendarTimezone(false)).toEqual({
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
    expect(await getCalendarTimezone(true)).toEqual({
      ok: false,
      reason: "network",
    });
  });

  it("2xx but missing value → bad_response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(200, { nope: 1 })),
    );
    expect(await getCalendarTimezone(true)).toEqual({
      ok: false,
      reason: "bad_response",
    });
  });

  it("401 → invalidates token and retries once, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, {}))
      .mockResolvedValueOnce(res(200, { value: "Europe/Berlin" }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await getCalendarTimezone(true);
    expect(r).toEqual({ ok: true, timezone: "Europe/Berlin" });
    expect(mockInvalidate).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a persistent 401 does not loop forever (one retry, then http_error)", async () => {
    const fetchMock = vi.fn(async () => res(401, {}));
    vi.stubGlobal("fetch", fetchMock);
    const r = await getCalendarTimezone(true);
    expect(r).toEqual({ ok: false, reason: "http_error" });
    expect(fetchMock).toHaveBeenCalledTimes(2); // original + single retry
  });
});

describe("searchContactTimezone (§5.4.1 step 2)", () => {
  it("extracts the display name; no IANA location → timezone null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        res(200, {
          results: [
            { person: { names: [{ displayName: "Dana" }], locations: [] } },
          ],
        }),
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
        res(200, {
          results: [
            {
              person: {
                names: [{ displayName: "Eve" }],
                locations: [{ value: "America/Los_Angeles" }],
              },
            },
          ],
        }),
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
        res(200, {
          results: [
            { person: { locations: [{ value: "San Francisco, CA" }] } },
          ],
        }),
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

  it("http error → typed http_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(503, {})),
    );
    expect(await searchContactTimezone("h@x.com")).toEqual({
      ok: false,
      reason: "http_error",
    });
  });
});
