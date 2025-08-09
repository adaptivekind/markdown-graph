import commonjs from "@rollup/plugin-commonjs";
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
  // Browser/UMD build
  {
    input: "src/index.ts",
    output: {
      sourcemap: true,
      file: "dist/markdown-graph.js",
      format: "umd",
      name: "markdownGraph",
      globals: {
        "@adaptivekind/graph-schema": "graphSchema",
      },
    },
    external: ["@adaptivekind/graph-schema"],
    onwarn: sharedWarningHandler,
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: true,
      }),
      commonjs({
        include: ["node_modules/**"],
        transformMixedEsModules: true,
        ignore: ["fs"],
      }),
      typescript({
        outputToFilesystem: false,
      }),
      {
        name: "ignore-node-builtins",
        resolveId(id) {
          if (id === "fs" || id === "path" || id === "util") {
            return { id, external: false, moduleSideEffects: false };
          }
          return null;
        },
        load(id) {
          if (id === "fs" || id === "path" || id === "util") {
            return "export default {};";
          }
          return null;
        },
      },
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
];
