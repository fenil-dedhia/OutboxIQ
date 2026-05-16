import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

// Intentionally close to upstream "recommended" rule sets — sensible defaults,
// not a hand-tuned opinion config. typescript-eslint integrates the TS rules;
// eslint-config-prettier (last) disables stylistic rules that Prettier owns.
export default tseslint.config(
  { ignores: ["dist", "node_modules", "public/icons"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      // React Hooks' documented "recommended" rules, pinned explicitly so the
      // config is stable across the plugin's flat-config API changes.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: [
      "vite.config.ts",
      "vitest.config.ts",
      "manifest.config.ts",
      "eslint.config.js",
      "scripts/**/*.{js,mjs,ts}",
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
