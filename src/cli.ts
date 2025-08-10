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

interface ProcessedCliOptions {
  targetDirectory: string;
  outputFile: string;
  verbose: boolean;
  quiet: boolean;
  excludes?: string[];
  includeHidden?: boolean;
  debounceMs?: number;
}

// CLI configuration constants
const SUCCESS_EXIT_CODE = 0;
const ERROR_EXIT_CODE = 1;
const DEFAULT_DEBOUNCE_STRING = "300";
const PARSE_BASE_10 = 10;
const UNEXPECTED_ERROR_MESSAGE = "Unexpected error:";

// Logging levels for different modes
const LOG_LEVELS = {
  QUIET: 0, // Only fatal errors
  DEFAULT: 3, // Info, warn, error, success
  VERBOSE: 4, // All logs including debug
} as const;

// Default configuration values
const DEFAULT_CONFIG = {
  targetDirectory: () => process.cwd(),
  outputFileName: ".garden-graph.json",
} as const;

/**
 * Merge CLI options with config file values, prioritizing CLI options
 */
function mergeOptionsWithConfig(options: CliOptions): {
  targetDirectory: string;
  verbose: boolean;
  quiet: boolean;
  providedOutputFile?: string;
} {
  const config = loadConfig(options);
  validateConfig(config);

  return {
    targetDirectory:
      options.targetDirectory ||
      config.targetDirectory ||
      DEFAULT_CONFIG.targetDirectory(),
    providedOutputFile: options.outputFile,
    verbose:
      options.verbose !== undefined ? options.verbose : config.verbose || false,
    quiet: options.quiet !== undefined ? options.quiet : config.quiet || false,
  };
}

/**
 * Configure console logging level based on verbose and quiet flags
 */
function configureLogging(verbose: boolean, quiet: boolean): void {
  if (quiet) {
    consola.level = LOG_LEVELS.QUIET;
  } else if (verbose) {
    consola.level = LOG_LEVELS.VERBOSE;
  } else {
    consola.level = LOG_LEVELS.DEFAULT;
  }
}

/**
 * Resolve the output file path from user input or generate default
 */
function resolveOutputFilePath(
  providedOutputFile: string | undefined,
  targetDirectory: string,
): string {
  if (!providedOutputFile) {
    return path.join(targetDirectory, DEFAULT_CONFIG.outputFileName);
  }

  return path.isAbsolute(providedOutputFile)
    ? providedOutputFile
    : path.join(process.cwd(), providedOutputFile);
}

/**
 * Validate target directory exists if checking is enabled
 */
function validateTargetDirectory(
  targetDirectory: string,
  checkDirectory: boolean,
): void {
  if (checkDirectory && !fs.existsSync(targetDirectory)) {
    const message = `Directory does not exist: ${targetDirectory}`;
    consola.error(message);
    throw new Error(message);
  }
}

/**
 * Process and validate CLI options and configure logging
 */
function processCliOptions(
  options: CliOptions = {},
  checkDirectory = true,
): ProcessedCliOptions {
  const mergedConfiguration = mergeOptionsWithConfig(options);
  const { targetDirectory, verbose, quiet, providedOutputFile } =
    mergedConfiguration;

  configureLogging(verbose, quiet);
  const outputFile = resolveOutputFilePath(providedOutputFile, targetDirectory);
  validateTargetDirectory(targetDirectory, checkDirectory);

  return {
    targetDirectory,
    outputFile,
    verbose,
    quiet,
    excludes: options.excludes,
    includeHidden: options.includeHidden,
    debounceMs: options.debounceMs,
  };
}

export const runWatch = async (options: CliOptions = {}): Promise<void> => {
  try {
    const processedOptions = processCliOptions(options);

    // Create and start watcher
    const watcher = new GraphWatcher({
      targetDirectory: processedOptions.targetDirectory,
      outputFile: processedOptions.outputFile,
      verbose: processedOptions.verbose,
      excludes: processedOptions.excludes,
      includeHidden: processedOptions.includeHidden,
      debounceMs: processedOptions.debounceMs,
    });

    // Handle graceful shutdown
    const shutdown = async () => {
      consola.info("Shutting down watcher...");
      await watcher.stop();
      process.exit(SUCCESS_EXIT_CODE);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Start watcher - this will never return as it returns Promise<never>
    await watcher.start();
  } catch (error) {
    if (error instanceof Error) {
      reportError(error);
    } else {
      consola.error(UNEXPECTED_ERROR_MESSAGE, error);
    }
    process.exit(ERROR_EXIT_CODE);
  }
};

export const runCli = async (options: CliOptions = {}): Promise<CliResult> => {
  try {
    const processedOptions = processCliOptions(options, false);

    // Check if target directory exists and return error result if not
    if (!fs.existsSync(processedOptions.targetDirectory)) {
      const message = `Directory does not exist: ${processedOptions.targetDirectory}`;
      consola.error(message);
      return { success: false, message };
    }

    const startTime = performance.now();

    consola.start(`Scanning directory: ${processedOptions.targetDirectory}`);

    // Generate graph for target directory
    const garden = await createGarden({
      type: "file",
      path: processedOptions.targetDirectory,
      outputPath: processedOptions.outputFile,
    });

    const nodeCount = Object.keys(garden.graph.nodes).length;
    const linkCount = garden.graph.links.length;

    consola.info(`Found ${nodeCount} nodes and ${linkCount} links`);

    if (processedOptions.verbose) {
      consola.debug(`Target directory: ${processedOptions.targetDirectory}`);
      consola.debug(`Output file: ${processedOptions.outputFile}`);
      consola.debug(
        `Nodes: ${Object.keys(garden.graph.nodes).sort().join(", ")}`,
      );
    }

    // Write graph to JSON file
    await garden.save();

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    const message = `Graph generated and written to ${processedOptions.outputFile} (${duration}ms)`;
    consola.success(message);

    return {
      success: true,
      message,
      outputFile: processedOptions.outputFile,
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

interface CommonCommandOptions {
  output?: string;
  verbose: boolean;
  quiet: boolean;
  exclude?: string[];
  includeHidden: boolean;
}

interface WatchCommandOptions extends CommonCommandOptions {
  debounce: string;
}

/**
 * Add common options shared between generate and watch commands
 */
function addCommonOptions(command: Command): Command {
  return command
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
    .option("--include-hidden", "Include hidden files and directories", false);
}

/**
 * Convert command options to CliOptions format
 */
function buildCliOptions(
  directory: string,
  options: CommonCommandOptions,
  additionalOptions?: { debounceMs?: number },
): CliOptions {
  return {
    targetDirectory: path.resolve(directory),
    outputFile: options.output,
    verbose: options.verbose,
    quiet: options.quiet,
    excludes: options.exclude,
    includeHidden: options.includeHidden,
    ...additionalOptions,
  };
}

const setupCliProgram = (): Command => {
  const program = new Command();

  program
    .name("markdown-graph")
    .description("Generate a graph from markdown files")
    .version("0.0.1");

  // Generate command (default)
  addCommonOptions(
    program
      .command("generate")
      .alias("gen")
      .description("Generate a graph from markdown files once"),
  ).action(async (directory: string, options: CommonCommandOptions) => {
    const cliOptions = buildCliOptions(directory, options);
    const result = await runCli(cliOptions);
    if (!result.success) {
      process.exit(ERROR_EXIT_CODE);
    }
  });

  // Watch command
  addCommonOptions(
    program
      .command("watch")
      .description("Watch for file changes and update graph automatically"),
  )
    .option(
      "--debounce <ms>",
      "Debounce delay for file changes in milliseconds",
      DEFAULT_DEBOUNCE_STRING,
    )
    .action(async (directory: string, options: WatchCommandOptions) => {
      const cliOptions = buildCliOptions(directory, options, {
        debounceMs: parseInt(options.debounce, PARSE_BASE_10),
      });
      await runWatch(cliOptions);
    });

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
    .action(async (directory: string, options: CommonCommandOptions) => {
      const cliOptions = buildCliOptions(directory || process.cwd(), options);
      const result = await runCli(cliOptions);
      if (!result.success) {
        process.exit(1);
      }
    });

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
      consola.error(UNEXPECTED_ERROR_MESSAGE, error);
    }
    process.exit(ERROR_EXIT_CODE);
  }
};

// Only run CLI if this file is being executed directly (not imported)
// Don't run during tests
if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    consola.error(UNEXPECTED_ERROR_MESSAGE, error);
    process.exit(1);
  });
}
