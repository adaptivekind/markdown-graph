import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      ".rollup.cache/**",
      "target/**",
    ],
  },
  {
    files: ["src/**/*.ts", "*.js", "*.mjs"],
    extends: compat.extends(
      "eslint:recommended",
      "plugin:import/recommended",
      "plugin:import/typescript",
    ),

    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },

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
      "no-unused-vars": "off", // Recommended to disable no-unused-vars https://typescript-eslint.io/rules/no-unused-vars/
      "no-var": "error",
      "prefer-const": "error",
      "import/order": [
        "error",
        {
          alphabetize: {
            order: "asc",
          },
        },
      ],

      // Apply SonarJS recommended rules
      ...sonarjs.configs.recommended.rules,

      // Override specific SonarJS rules if needed
      "sonarjs/no-duplicate-string": "off", // Too noisy for test files
    },
  },
]);
