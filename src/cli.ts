#!/usr/bin/env node

import fs from "fs";
import path from "path";
// eslint-disable-next-line sort-imports
import { consola } from "consola";
import { createGarden } from "./garden";

export const showHelp = () => {
  // eslint-disable-next-line no-console
  console.log(`
Usage: markdown-graph [options] [directory]

Generate a graph from markdown files and save to .garden-graph.json

Options:
  -h, --help     Show this help message
  -o, --output   Output file path (default: .garden-graph.json)
  -v, --verbose  Enable verbose logging
  -q, --quiet    Suppress all output except errors

Arguments:
  directory      Directory to scan for markdown files (default: current directory)

Examples:
  markdown-graph                    # Generate graph for current directory → ./.garden-graph.json
  markdown-graph ./docs             # Generate graph for docs directory → ./docs/.garden-graph.json
  markdown-graph -o graph.json      # Use custom output file → ./graph.json
  markdown-graph -v ./docs          # Generate with verbose logging
`);
};

export interface CliOptions {
  targetDirectory?: string;
  outputFile?: string;
  verbose?: boolean;
  quiet?: boolean;
}

export interface CliResult {
  success: boolean;
  message: string;
  outputFile?: string;
  nodeCount?: number;
  linkCount?: number;
}

export const runCli = (options: CliOptions = {}): CliResult => {
  const {
    targetDirectory = process.cwd(),
    outputFile: providedOutputFile = undefined,
    verbose = false,
    quiet = false,
  } = options;

  // Configure logger based on flags
  if (quiet) {
    consola.level = 0; // Only fatal errors
  } else if (verbose) {
    consola.level = 4; // All logs including debug
  } else {
    consola.level = 3; // Default: info, warn, error, success
  }

  // Default output file goes in the target directory
  const outputFile = providedOutputFile
    ? path.isAbsolute(providedOutputFile)
      ? providedOutputFile
      : path.join(process.cwd(), providedOutputFile)
    : path.join(targetDirectory, ".garden-graph.json");

  try {
    // Check if target directory exists
    if (!fs.existsSync(targetDirectory)) {
      const message = `Directory does not exist: ${targetDirectory}`;
      consola.error(message);
      return { success: false, message };
    }

    consola.start(`Scanning directory: ${targetDirectory}`);

    // Generate graph for target directory
    const garden = createGarden({
      type: "file",
      path: targetDirectory,
    });

    const nodeCount = Object.keys(garden.graph.nodes).length;
    const linkCount = garden.graph.links.length;

    consola.info(`Found ${nodeCount} nodes and ${linkCount} links`);

    if (verbose) {
      consola.debug(`Target directory: ${targetDirectory}`);
      consola.debug(`Output file: ${outputFile}`);
      consola.debug(`Nodes: ${Object.keys(garden.graph.nodes).join(", ")}`);
    }

    // Write graph to JSON file
    fs.writeFileSync(outputFile, JSON.stringify(garden.graph, null, 2));

    const message = `Graph generated and written to ${outputFile}`;
    consola.success(message);

    return {
      success: true,
      message,
      outputFile,
      nodeCount,
      linkCount,
    };
  } catch (error) {
    const message = `Failed to generate graph: ${error instanceof Error ? error.message : error}`;
    consola.error(message);
    return { success: false, message };
  }
};

const main = () => {
  const args = process.argv.slice(2);
  let targetDirectory = process.cwd();
  let outputFile: string | undefined = undefined;
  let verbose = false;
  let quiet = false;

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      showHelp();
      process.exit(0);
    }

    if (arg === "-o" || arg === "--output") {
      if (i + 1 >= args.length) {
        consola.error("Output option requires a filename");
        process.exit(1);
      }
      outputFile = args[++i];
      continue;
    }

    if (arg === "-v" || arg === "--verbose") {
      verbose = true;
      continue;
    }

    if (arg === "-q" || arg === "--quiet") {
      quiet = true;
      continue;
    }

    // If not an option, treat as directory path
    if (!arg.startsWith("-")) {
      targetDirectory = path.resolve(arg);
    }
  }

  const result = runCli({
    targetDirectory,
    outputFile,
    verbose,
    quiet,
  });

  if (!result.success) {
    process.exit(1);
  }
};

main();
