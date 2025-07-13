/**
 * Unit tests for error handling scenarios
 */

import {
  DirectoryNotFoundError,
  DocumentNotFoundError,
  FileNotFoundError,
  MarkdownGraphError,
  MarkdownParsingError,
  RepositoryConfigurationError,
} from "./errors";
import { formatError, isRecoverableError, reportError } from "./error-reporter";
import { loadConfig, validateConfig } from "./config";
import { consola } from "consola";

// Mock consola methods
jest.mock("consola", () => ({
  consola: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("Error Classes", () => {
  describe("MarkdownGraphError", () => {
    it("should create base error with message", () => {
      const error = new MarkdownGraphError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.name).toBe("MarkdownGraphError");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const cause = new Error("Original error");
      const error = new MarkdownGraphError("Test error", cause);

      expect(error.message).toBe("Test error");
      expect(error.cause).toBe(cause);
    });
  });

  describe("DirectoryNotFoundError", () => {
    it("should create error with directory path", () => {
      const error = new DirectoryNotFoundError("/path/to/dir");

      expect(error.message).toBe("Directory does not exist: /path/to/dir");
      expect(error.name).toBe("DirectoryNotFoundError");
    });
  });

  describe("FileNotFoundError", () => {
    it("should create error with file path", () => {
      const error = new FileNotFoundError("/path/to/file.md");

      expect(error.message).toBe("File not found: /path/to/file.md");
      expect(error.name).toBe("FileNotFoundError");
    });
  });

  describe("DocumentNotFoundError", () => {
    it("should create error with document ID and repository description", () => {
      const error = new DocumentNotFoundError("doc123", "test repository");

      expect(error.message).toBe(
        "Cannot load document doc123: does not exist in test repository",
      );
      expect(error.name).toBe("DocumentNotFoundError");
    });
  });

  describe("MarkdownParsingError", () => {
    it("should create error with filename and cause", () => {
      const cause = new Error("YAML parsing failed");
      const error = new MarkdownParsingError("test.md", cause);

      expect(error.message).toBe(
        "Failed to parse markdown in test.md: YAML parsing failed",
      );
      expect(error.name).toBe("MarkdownParsingError");
      expect(error.cause).toBe(cause);
    });
  });

  describe("RepositoryConfigurationError", () => {
    it("should create error with configuration message", () => {
      const error = new RepositoryConfigurationError("Invalid configuration");

      expect(error.message).toBe("Invalid configuration");
      expect(error.name).toBe("RepositoryConfigurationError");
    });
  });
});

describe("Error Reporter", () => {
  const mockConsola = consola as jest.Mocked<typeof consola>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("reportError", () => {
    it("should report DirectoryNotFoundError with suggestions", () => {
      const error = new DirectoryNotFoundError("/non/existent/dir");

      reportError(error);

      expect(mockConsola.error).toHaveBeenCalledWith(
        "DirectoryNotFoundError: Directory does not exist: /non/existent/dir",
      );
      expect(mockConsola.info).toHaveBeenCalledWith("Suggestions:");
      expect(mockConsola.info).toHaveBeenCalledWith(
        expect.stringContaining("Check that the directory path is correct"),
      );
    });

    it("should report FileNotFoundError with suggestions", () => {
      const error = new FileNotFoundError("/path/to/file.md");

      reportError(error);

      expect(mockConsola.error).toHaveBeenCalledWith(
        "FileNotFoundError: File not found: /path/to/file.md",
      );
      expect(mockConsola.info).toHaveBeenCalledWith("Suggestions:");
    });

    it("should report MarkdownParsingError with suggestions", () => {
      const cause = new Error("Invalid YAML");
      const error = new MarkdownParsingError("test.md", cause);

      reportError(error);

      expect(mockConsola.error).toHaveBeenCalledWith(
        "MarkdownParsingError: Failed to parse markdown in test.md: Invalid YAML",
      );
      expect(mockConsola.debug).toHaveBeenCalledWith(
        "Caused by:",
        "Invalid YAML",
      );
    });

    it("should report RepositoryConfigurationError with suggestions", () => {
      const error = new RepositoryConfigurationError("Invalid config");

      reportError(error);

      expect(mockConsola.error).toHaveBeenCalledWith(
        "RepositoryConfigurationError: Invalid config",
      );
      expect(mockConsola.info).toHaveBeenCalledWith(
        expect.stringContaining("Check your configuration file syntax"),
      );
    });

    it("should report generic errors", () => {
      const error = new Error("Generic error");

      reportError(error);

      expect(mockConsola.error).toHaveBeenCalledWith(
        "Unexpected error: Generic error",
      );
      expect(mockConsola.debug).toHaveBeenCalledWith(
        "Stack trace:",
        error.stack,
      );
    });
  });

  describe("formatError", () => {
    it("should format error without context", () => {
      const error = new FileNotFoundError("/path/to/file.md");
      const formatted = formatError(error);

      expect(formatted).toBe(
        "FileNotFoundError: File not found: /path/to/file.md",
      );
    });

    it("should format error with context", () => {
      const error = new FileNotFoundError("/path/to/file.md");
      const formatted = formatError(error, "loading document");

      expect(formatted).toBe(
        "FileNotFoundError: File not found: /path/to/file.md (loading document)",
      );
    });
  });

  describe("isRecoverableError", () => {
    it("should identify recoverable errors", () => {
      expect(isRecoverableError(new DirectoryNotFoundError("/path"))).toBe(
        true,
      );
      expect(isRecoverableError(new FileNotFoundError("/path/file.md"))).toBe(
        true,
      );
      expect(
        isRecoverableError(new RepositoryConfigurationError("config error")),
      ).toBe(true);
      expect(
        isRecoverableError(new MarkdownParsingError("file.md", new Error())),
      ).toBe(true);
    });

    it("should identify non-recoverable errors", () => {
      expect(isRecoverableError(new Error("Generic error"))).toBe(false);
      expect(isRecoverableError(new TypeError("Type error"))).toBe(false);
    });
  });
});

describe("Configuration Error Handling", () => {
  describe("validateConfig", () => {
    it("should validate valid configuration", () => {
      const config = {
        targetDirectory: "/valid/path",
        outputFile: "output.json",
        verbose: false,
        quiet: false,
        excludes: ["node_modules"],
        includeHidden: false,
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("should throw for invalid targetDirectory type", () => {
      const config = {
        targetDirectory: 123 as unknown as string,
        verbose: false,
        quiet: false,
        includeHidden: false,
      };

      expect(() => validateConfig(config)).toThrow(
        RepositoryConfigurationError,
      );
    });

    it("should throw for invalid outputFile type", () => {
      const config = {
        outputFile: 123 as unknown as string,
        verbose: false,
        quiet: false,
        includeHidden: false,
      };

      expect(() => validateConfig(config)).toThrow(
        RepositoryConfigurationError,
      );
    });

    it("should throw for invalid excludes type", () => {
      const config = {
        excludes: "not-an-array" as unknown as string[],
        verbose: false,
        quiet: false,
        includeHidden: false,
      };

      expect(() => validateConfig(config)).toThrow(
        RepositoryConfigurationError,
      );
    });

    it("should throw for excludes with non-string elements", () => {
      const config = {
        excludes: ["valid", 123, "also-valid"] as unknown as string[],
        verbose: false,
        quiet: false,
        includeHidden: false,
      };

      expect(() => validateConfig(config)).toThrow(
        RepositoryConfigurationError,
      );
    });

    it("should throw for invalid verbose type", () => {
      const config = {
        verbose: "not-boolean" as unknown as boolean,
        quiet: false,
        includeHidden: false,
      };

      expect(() => validateConfig(config)).toThrow(
        RepositoryConfigurationError,
      );
    });

    it("should throw for invalid quiet type", () => {
      const config = {
        verbose: false,
        quiet: "not-boolean" as unknown as boolean,
        includeHidden: false,
      };

      expect(() => validateConfig(config)).toThrow(
        RepositoryConfigurationError,
      );
    });

    it("should throw for invalid includeHidden type", () => {
      const config = {
        verbose: false,
        quiet: false,
        includeHidden: "not-boolean" as unknown as boolean,
      };

      expect(() => validateConfig(config)).toThrow(
        RepositoryConfigurationError,
      );
    });
  });

  describe("loadConfig error handling", () => {
    it("should handle missing configuration gracefully", () => {
      const config = loadConfig({}, { searchPaths: ["/non/existent/path"] });

      expect(config).toBeDefined();
      expect(config.targetDirectory).toBeUndefined(); // Not set in defaults anymore
      expect(config.outputFile).toBe(".garden-graph.json");
    });

    it("should merge CLI options over defaults", () => {
      const cliOptions = {
        verbose: true,
        excludes: ["custom-exclude"],
      };

      const config = loadConfig(cliOptions, {
        searchPaths: ["/non/existent/path"],
      });

      expect(config.verbose).toBe(true);
      expect(config.excludes).toContain("custom-exclude");
      expect(config.quiet).toBe(false); // default value
    });
  });
});

describe("Integration Error Scenarios", () => {
  it("should handle complete error flow from configuration to reporting", () => {
    const mockConsola = consola as jest.Mocked<typeof consola>;

    // Test configuration validation error
    const invalidConfig = {
      excludes: "not-an-array" as unknown as string[],
      verbose: false,
      quiet: false,
      includeHidden: false,
    };

    try {
      validateConfig(invalidConfig);
    } catch (error) {
      expect(error).toBeInstanceOf(RepositoryConfigurationError);

      if (error instanceof Error) {
        reportError(error);

        expect(mockConsola.error).toHaveBeenCalledWith(
          expect.stringContaining("RepositoryConfigurationError"),
        );
        expect(mockConsola.info).toHaveBeenCalledWith("Suggestions:");
        expect(isRecoverableError(error)).toBe(true);
      }
    }
  });
});
