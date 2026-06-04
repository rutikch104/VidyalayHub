import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  {
    files: ["vite.config.js", "vitest.config.js", "playwright.config.js", "e2e/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node },
      sourceType: "module",
    },
  },
  {
    files: ["src/main.jsx"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    rules: { "no-unused-vars": "off" },
  },
  {
    files: ["**/*.{js,jsx}"],
    ignores: [
      "vite.config.js",
      "vitest.config.js",
      "playwright.config.js",
      "e2e/**",
      "scripts/**",
      "src/main.jsx",
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
];
