import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not ours to lint: the skills' own scripts and the capture output.
    ".claude/**",
    "captures/**",
    // Les handoffs de design sont des documents livrés, pas notre code : leur
    // page de prévisualisation embarque son propre React et ses propres règles.
    "design_handoff_*/**",
  ]),
]);

export default eslintConfig;
