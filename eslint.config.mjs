import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig } from "eslint/config";
import { fileURLToPath } from "node:url";
import globals from "globals";
import js from "@eslint/js";
import path from "node:path";
import sonarjs from "eslint-plugin-sonarjs";
import tsParser from "@typescript-eslint/parser";
import typescriptEslint from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    extends: compat.extends("eslint:recommended"),

    plugins: {
      "@typescript-eslint": typescriptEslint,
      sonarjs,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",
    },

    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "no-console": "error",
      "no-undef": "error",
      "no-unused-vars": "off", // recommended to disable no-unused-vars https://typescript-eslint.io/rules/no-unused-vars/
      "no-var": "error",
      "prefer-const": "error",
      "sort-imports": "error",

      // Apply SonarJS recommended rules
      ...sonarjs.configs.recommended.rules,

      // Override specific SonarJS rules if needed
      "sonarjs/no-duplicate-string": "off", // Too noisy for test files
    },
  },
]);
