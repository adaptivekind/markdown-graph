import commonjs from "@rollup/plugin-commonjs";
import { dts } from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const sharedWarningHandler = (warning, warn) => {
  // Suppress eval warning from gray-matter engines - it's safe in this context
  if (
    warning.code === "EVAL" &&
    warning.id &&
    warning.id.includes("gray-matter")
  ) {
    return;
  }

  // Suppress circular dependency warning from es-toolkit or suffix-thumb - external dependency issue
  if (
    warning.code === "CIRCULAR_DEPENDENCY" &&
    warning.ids &&
    warning.ids.some(
      (id) => id.includes("es-toolkit") || id.includes("suffix-thumb"),
    )
  ) {
    return;
  }

  warn(warning);
};

export default [
  {
    input: "src/index.ts",
    output: {
      sourcemap: true,
      file: "dist/markdown-graph.js",
      format: "es",
      name: "markdownGraph",
      globals: {
        "@adaptivekind/graph-schema": "graphSchema",
      },
    },
    external: ["@adaptivekind/graph-schema", "fs", "path"],
    onwarn: sharedWarningHandler,
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: false,
      }),
      commonjs({
        include: ["node_modules/**"],
        transformMixedEsModules: true,
      }),
      typescript({
        outputToFilesystem: false,
      }),
    ],
  },
  // CLI Node.js build
  {
    input: "src/cli.ts",
    output: {
      file: "dist/cli.js",
      format: "es",
    },
    external: ["fs", "path", "process"],
    onwarn: sharedWarningHandler,
    plugins: [
      nodeResolve({
        preferBuiltins: true,
      }),
      commonjs({
        include: ["node_modules/**"],
        transformMixedEsModules: true,
      }),
      typescript({
        outputToFilesystem: false,
      }),
    ],
  },
  // d.ts
  {
    input: "./src/types.d.ts",
    output: [{ file: "dist/markdown-graph.d.ts", format: "es" }],
    plugins: [dts()],
  },
];
