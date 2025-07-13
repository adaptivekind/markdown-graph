/**
 * User-friendly error reporting with helpful suggestions
 *
 * This module provides enhanced error reporting capabilities with contextual
 * suggestions and recovery actions for common error scenarios.
 */

import {
  DirectoryNotFoundError,
  DocumentNotFoundError,
  FileNotFoundError,
  MarkdownGraphError,
  MarkdownParsingError,
  RepositoryConfigurationError,
} from "./errors";
import { consola } from "consola";

/**
 * Represents a helpful suggestion for resolving an error
 */
export interface ErrorSuggestion {
  /** Human-readable suggestion message */
  message: string;
  /** Optional specific action to take */
  action?: string;
}

/**
 * Report an error with user-friendly message and suggestions
 */
export function reportError(error: Error): void {
  if (error instanceof MarkdownGraphError) {
    reportMarkdownGraphError(error);
  } else {
    reportGenericError(error);
  }
}

/**
 * Report a markdown-graph specific error with context and suggestions
 */
function reportMarkdownGraphError(error: MarkdownGraphError): void {
  const suggestions = getErrorSuggestions(error);

  consola.error(`${error.name}: ${error.message}`);

  if (suggestions.length > 0) {
    consola.info("Suggestions:");
    suggestions.forEach((suggestion, index) => {
      consola.info(`  ${index + 1}. ${suggestion.message}`);
      if (suggestion.action) {
        consola.info(`     → ${suggestion.action}`);
      }
    });
  }

  if (error.cause) {
    consola.debug("Caused by:", error.cause.message);
  }
}

/**
 * Report a generic error
 */
function reportGenericError(error: Error): void {
  consola.error(`Unexpected error: ${error.message}`);
  consola.debug("Stack trace:", error.stack);
}

/**
 * Get helpful suggestions based on the error type
 */
function getErrorSuggestions(error: MarkdownGraphError): ErrorSuggestion[] {
  if (error instanceof DirectoryNotFoundError) {
    return [
      {
        message: "Check that the directory path is correct",
        action: "Verify the path exists and you have read permissions",
      },
      {
        message: "Use an absolute path to avoid confusion",
        action: "Try using the full path like /Users/username/project",
      },
      {
        message: "Create the directory if it should exist",
        action: "mkdir -p <directory-path>",
      },
    ];
  }

  if (error instanceof FileNotFoundError) {
    return [
      {
        message: "Check that the file exists and you have read permissions",
      },
      {
        message: "Verify the file hasn't been moved or deleted",
      },
      {
        message: "Check if the file is in a hidden directory",
        action: "Use --include-hidden flag to scan hidden directories",
      },
    ];
  }

  if (error instanceof DocumentNotFoundError) {
    return [
      {
        message: "The document ID might be incorrect",
        action: "Check available document IDs in your repository",
      },
      {
        message: "The document might have been deleted or moved",
      },
    ];
  }

  if (error instanceof MarkdownParsingError) {
    return [
      {
        message: "Check the markdown file for syntax errors",
        action: "Review frontmatter YAML syntax",
      },
      {
        message: "Verify the file encoding is UTF-8",
      },
      {
        message: "Check for unsupported frontmatter syntax",
        action: "Ensure frontmatter uses valid YAML",
      },
    ];
  }

  if (error instanceof RepositoryConfigurationError) {
    return [
      {
        message: "Check your configuration file syntax",
        action: "Verify JSON syntax in .markdown-graph.json",
      },
      {
        message: "Review configuration options",
        action: "Run 'markdown-graph --help' for available options",
      },
      {
        message: "Check package.json for markdown-graph configuration",
        action: "Look for 'markdown-graph' section in package.json",
      },
    ];
  }

  return [
    {
      message: "Try running with verbose logging for more details",
      action: "Use -v or --verbose flag",
    },
    {
      message: "Check the documentation for troubleshooting tips",
    },
  ];
}

/**
 * Format an error for display with context
 */
export function formatError(error: Error, context?: string): string {
  const errorType = error.constructor.name;
  const contextMsg = context ? ` (${context})` : "";

  return `${errorType}: ${error.message}${contextMsg}`;
}

/**
 * Check if an error is recoverable (user can fix it)
 */
export function isRecoverableError(error: Error): boolean {
  return (
    error instanceof DirectoryNotFoundError ||
    error instanceof FileNotFoundError ||
    error instanceof RepositoryConfigurationError ||
    error instanceof MarkdownParsingError
  );
}
