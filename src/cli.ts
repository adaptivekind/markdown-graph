#!/usr/bin/env node

import { loadConfig, validateConfig } from "./config";
import { Command } from "commander";
import { GraphWatcher } from "./watcher";
import { consola } from "consola";
import { createGarden } from "./garden";
import fs from "fs";
import path from "path";
import { reportError } from "./error-reporter";

export interface CliOptions {
  targetDirectory?: string;
  outputFile?: string;
  verbose?: boolean;
  quiet?: boolean;
  excludes?: string[];
  includeHidden?: boolean;
  watch?: boolean;
  debounceMs?: number;
}

export interface CliResult {
  success: boolean;
  message: string;
  outputFile?: string;
  nodeCount?: number;
  linkCount?: number;
}

export const runWatch = async (options: CliOptions = {}): Promise<void> => {
  try {
    // Load and validate configuration
    const config = loadConfig(options);
    validateConfig(config);

    // Use CLI options as priority, then config, then defaults
    const targetDirectory =
      options.targetDirectory || config.targetDirectory || process.cwd();
    const providedOutputFile = options.outputFile;
    const verbose =
      options.verbose !== undefined ? options.verbose : config.verbose || false;
    const quiet =
      options.quiet !== undefined ? options.quiet : config.quiet || false;

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

    // Check if target directory exists
    if (!fs.existsSync(targetDirectory)) {
      const message = `Directory does not exist: ${targetDirectory}`;
      consola.error(message);
      return;
    }

    // Create and start watcher
    const watcher = new GraphWatcher({
      targetDirectory,
      outputFile,
      verbose,
      excludes: options.excludes,
      includeHidden: options.includeHidden,
      debounceMs: options.debounceMs,
    });

    // Handle graceful shutdown
    const shutdown = async () => {
      consola.info("Shutting down watcher...");
      await watcher.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await watcher.start();

    // Keep the process running
    return new Promise(() => {}); // Never resolves, keeps process alive
  } catch (error) {
    if (error instanceof Error) {
      reportError(error);
    } else {
      consola.error("Unexpected error:", error);
    }
    process.exit(1);
  }
};

export const runCli = async (options: CliOptions = {}): Promise<CliResult> => {
  try {
    // Load and validate configuration
    const config = loadConfig(options);
    validateConfig(config);

    // Use CLI options as priority, then config, then defaults
    const targetDirectory =
      options.targetDirectory || config.targetDirectory || process.cwd();
    const providedOutputFile = options.outputFile; // Only use explicitly provided output file
    const verbose =
      options.verbose !== undefined ? options.verbose : config.verbose || false;
    const quiet =
      options.quiet !== undefined ? options.quiet : config.quiet || false;
    // Note: excludes and includeHidden are available for future use
    // const excludes = options.excludes || config.excludes;
    // const includeHidden = options.includeHidden !== undefined
    //   ? options.includeHidden
    //   : config.includeHidden;

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

    const startTime = performance.now();

    // Check if target directory exists
    if (!fs.existsSync(targetDirectory)) {
      const message = `Directory does not exist: ${targetDirectory}`;
      consola.error(message);
      return { success: false, message };
    }

    consola.start(`Scanning directory: ${targetDirectory}`);

    // Generate graph for target directory
    const garden = await createGarden({
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

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    const message = `Graph generated and written to ${outputFile} (${duration}ms)`;
    consola.success(message);

    return {
      success: true,
      message,
      outputFile,
      nodeCount,
      linkCount,
    };
  } catch (error) {
    if (error instanceof Error) {
      reportError(error);
      return {
        success: false,
        message: error.message,
      };
    }

    const message = `Failed to generate graph: ${error}`;
    consola.error(message);
    return { success: false, message };
  }
};

const setupCliProgram = (): Command => {
  const program = new Command();

  program
    .name("markdown-graph")
    .description("Generate a graph from markdown files")
    .version("0.0.1");

  // Generate command (default)
  program
    .command("generate")
    .alias("gen")
    .description("Generate a graph from markdown files once")
    .argument(
      "[directory]",
      "Directory to scan for markdown files",
      process.cwd(),
    )
    .option(
      "-o, --output <file>",
      "Output file path (default: .garden-graph.json)",
    )
    .option("-v, --verbose", "Enable verbose logging", false)
    .option("-q, --quiet", "Suppress all output except errors", false)
    .option("--exclude <patterns...>", "Patterns to exclude from scanning")
    .option("--include-hidden", "Include hidden files and directories", false)
    .action(
      async (
        directory: string,
        options: {
          output?: string;
          verbose: boolean;
          quiet: boolean;
          exclude?: string[];
          includeHidden: boolean;
        },
      ) => {
        const cliOptions: CliOptions = {
          targetDirectory: path.resolve(directory),
          outputFile: options.output,
          verbose: options.verbose,
          quiet: options.quiet,
          excludes: options.exclude,
          includeHidden: options.includeHidden,
        };

        const result = await runCli(cliOptions);
        if (!result.success) {
          process.exit(1);
        }
      },
    );

  // Watch command
  program
    .command("watch")
    .description("Watch for file changes and update graph automatically")
    .argument(
      "[directory]",
      "Directory to scan for markdown files",
      process.cwd(),
    )
    .option(
      "-o, --output <file>",
      "Output file path (default: .garden-graph.json)",
    )
    .option("-v, --verbose", "Enable verbose logging", false)
    .option("-q, --quiet", "Suppress all output except errors", false)
    .option("--exclude <patterns...>", "Patterns to exclude from scanning")
    .option("--include-hidden", "Include hidden files and directories", false)
    .option(
      "--debounce <ms>",
      "Debounce delay for file changes in milliseconds",
      "300",
    )
    .action(
      async (
        directory: string,
        options: {
          output?: string;
          verbose: boolean;
          quiet: boolean;
          exclude?: string[];
          includeHidden: boolean;
          debounce: string;
        },
      ) => {
        const cliOptions: CliOptions = {
          targetDirectory: path.resolve(directory),
          outputFile: options.output,
          verbose: options.verbose,
          quiet: options.quiet,
          excludes: options.exclude,
          includeHidden: options.includeHidden,
          debounceMs: parseInt(options.debounce, 10),
        };

        await runWatch(cliOptions);
      },
    );

  // Make generate the default command when no subcommand is provided
  program
    .argument(
      "[directory]",
      "Directory to scan for markdown files (defaults to generate command)",
    )
    .option(
      "-o, --output <file>",
      "Output file path (default: .garden-graph.json)",
    )
    .option("-v, --verbose", "Enable verbose logging", false)
    .option("-q, --quiet", "Suppress all output except errors", false)
    .option("--exclude <patterns...>", "Patterns to exclude from scanning")
    .option("--include-hidden", "Include hidden files and directories", false)
    .action(
      async (
        directory: string,
        options: {
          output?: string;
          verbose: boolean;
          quiet: boolean;
          exclude?: string[];
          includeHidden: boolean;
        },
      ) => {
        const cliOptions: CliOptions = {
          targetDirectory: path.resolve(directory || process.cwd()),
          outputFile: options.output,
          verbose: options.verbose,
          quiet: options.quiet,
          excludes: options.exclude,
          includeHidden: options.includeHidden,
        };

        const result = await runCli(cliOptions);
        if (!result.success) {
          process.exit(1);
        }
      },
    );

  return program;
};

const main = async (): Promise<void> => {
  try {
    const program = setupCliProgram();
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      reportError(error);
    } else {
      consola.error("Unexpected error:", error);
    }
    process.exit(1);
  }
};

// Only run CLI if this file is being executed directly (not imported)
// Don't run during tests
if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    consola.error("Unexpected error:", error);
    process.exit(1);
  });
}
