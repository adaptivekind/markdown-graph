/**
 * Configuration management for markdown-graph CLI
 *
 * This module provides configuration loading and validation functionality,
 * supporting multiple configuration sources with proper precedence handling.
 */

import { RepositoryConfigurationError } from "./errors";
import fs from "fs";
import path from "path";

/**
 * Configuration options for markdown-graph
 */
export interface MarkdownGraphConfig {
  /** Target directory to scan for markdown files */
  targetDirectory?: string;
  /** Output file path for the generated graph */
  outputFile?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Suppress all output except errors */
  quiet?: boolean;
  /** Patterns to exclude from scanning */
  excludes?: string[];
  /** Include hidden files and directories */
  includeHidden?: boolean;
}

/**
 * Options for configuration file discovery
 */
export interface ConfigFileOptions {
  /** Specific configuration file name to look for */
  name?: string;
  /** Directories to search for configuration files */
  searchPaths?: string[];
}

const DEFAULT_CONFIG_NAMES = [
  "markdown-graph.config.json",
  ".markdown-graph.json",
  "package.json",
];

const DEFAULT_SEARCH_PATHS = [
  process.cwd(),
  path.join(process.cwd(), ".config"),
  path.dirname(process.cwd()),
];

/**
 * Load configuration from various sources in order of precedence:
 * 1. Explicit CLI options (highest precedence)
 * 2. Configuration file
 * 3. Default values (lowest precedence)
 */
export function loadConfig(
  cliOptions: Partial<MarkdownGraphConfig> = {},
  configOptions: ConfigFileOptions = {},
): MarkdownGraphConfig {
  const fileConfig = loadConfigFromFile(configOptions);
  const defaultConfig = getDefaultConfig();

  // Merge configs in order of precedence
  return {
    ...defaultConfig,
    ...fileConfig,
    ...cliOptions,
  };
}

/**
 * Get default configuration values
 */
function getDefaultConfig(): MarkdownGraphConfig {
  return {
    outputFile: ".garden-graph.json",
    verbose: false,
    quiet: false,
    excludes: ["node_modules", "dist", ".git"],
    includeHidden: false,
  };
}

/**
 * Load configuration from a file
 */
function loadConfigFromFile(
  options: ConfigFileOptions = {},
): Partial<MarkdownGraphConfig> {
  const configNames = options.name ? [options.name] : DEFAULT_CONFIG_NAMES;
  const searchPaths = options.searchPaths || DEFAULT_SEARCH_PATHS;

  for (const searchPath of searchPaths) {
    const foundConfig = tryLoadConfigInPath(searchPath, configNames);
    if (foundConfig) {
      return foundConfig;
    }
  }

  return {};
}

/**
 * Try to load configuration from a specific path
 */
function tryLoadConfigInPath(
  searchPath: string,
  configNames: string[],
): Partial<MarkdownGraphConfig> | null {
  for (const configName of configNames) {
    const configPath = path.join(searchPath, configName);

    if (fs.existsSync(configPath)) {
      try {
        return loadConfigFile(configPath, configName);
      } catch (error) {
        throw new RepositoryConfigurationError(
          `Failed to load config from ${configPath}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  return null;
}

/**
 * Load and parse a specific configuration file
 */
function loadConfigFile(
  configPath: string,
  configName: string,
): Partial<MarkdownGraphConfig> {
  const content = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(content);

  if (configName === "package.json") {
    // Extract markdown-graph config from package.json
    return parsed["markdown-graph"] || {};
  }

  // Validate config structure
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Configuration must be a JSON object");
  }

  return parsed as Partial<MarkdownGraphConfig>;
}

/**
 * Validate configuration values
 */
export function validateConfig(config: MarkdownGraphConfig): void {
  if (config.targetDirectory && typeof config.targetDirectory !== "string") {
    throw new RepositoryConfigurationError("targetDirectory must be a string");
  }

  if (config.outputFile && typeof config.outputFile !== "string") {
    throw new RepositoryConfigurationError("outputFile must be a string");
  }

  if (config.excludes && !Array.isArray(config.excludes)) {
    throw new RepositoryConfigurationError(
      "excludes must be an array of strings",
    );
  }

  if (config.excludes?.some((exclude) => typeof exclude !== "string")) {
    throw new RepositoryConfigurationError(
      "excludes must be an array of strings",
    );
  }

  if (typeof config.verbose !== "boolean") {
    throw new RepositoryConfigurationError("verbose must be a boolean");
  }

  if (typeof config.quiet !== "boolean") {
    throw new RepositoryConfigurationError("quiet must be a boolean");
  }

  if (typeof config.includeHidden !== "boolean") {
    throw new RepositoryConfigurationError("includeHidden must be a boolean");
  }
}
