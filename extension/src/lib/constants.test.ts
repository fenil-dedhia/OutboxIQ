import { describe, it, expect } from "vitest";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "./constants";

// Guard the hosted legal URLs against a future typo. The custom domain
// `fashionablylate.app` has NO hyphen — deliberately distinct from the GitHub
// repo name `fashionably-late` — so the easiest mistake is to slip the hyphen
// in. These pages are live (GitHub Pages, docs/legal/, permalinks /legal/*).
describe("legal URLs (constants)", () => {
  it("point at the live fashionablylate.app legal pages over HTTPS", () => {
    expect(PRIVACY_POLICY_URL).toBe(
      "https://fashionablylate.app/legal/privacy",
    );
    expect(TERMS_OF_SERVICE_URL).toBe(
      "https://fashionablylate.app/legal/terms",
    );
  });

  it("are on the hyphenless apex domain under /legal/", () => {
    for (const url of [PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL]) {
      expect(url.startsWith("https://fashionablylate.app/legal/")).toBe(true);
      // Hyphen-typo guard (repo is fashionably-late; domain is not).
      expect(url).not.toContain("fashionably-late.app");
    }
  });
});
