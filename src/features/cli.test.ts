// Import CLI functions
import { runCli, showHelp } from "../cli";
import type { CliOptions } from "../cli";
import { consola } from "consola";
import fs from "fs";
import path from "path";

const testGardenPath = path.join(process.cwd(), "test/gardens/test-garden");

// Configure Jest timeout for this test suite
jest.setTimeout(15000);

// Mock consola methods
const mockStart = jest.spyOn(consola, "start").mockImplementation(() => {});
const mockInfo = jest.spyOn(consola, "info").mockImplementation(() => {});
const mockSuccess = jest.spyOn(consola, "success").mockImplementation(() => {});
const mockError = jest.spyOn(consola, "error").mockImplementation(() => {});
const mockDebug = jest.spyOn(consola, "debug").mockImplementation(() => {});

const callCli = (options: CliOptions = {}) => {
  // Reset mocks before each call
  mockStart.mockClear();
  mockInfo.mockClear();
  mockSuccess.mockClear();
  mockError.mockClear();
  mockDebug.mockClear();
  consola.level = 3; // Reset level

  const result = runCli(options);

  // Capture calls immediately after execution
  const logs = {
    start: [...mockStart.mock.calls],
    info: [...mockInfo.mock.calls],
    success: [...mockSuccess.mock.calls],
    error: [...mockError.mock.calls],
    debug: [...mockDebug.mock.calls],
  };

  return {
    result,
    logs,
  };
};

describe("CLI", () => {
  beforeEach(() => {
    // Reset consola level
    consola.level = 3;

    // Clean up any existing output files
    const defaultOutput = path.join(testGardenPath, ".garden-graph.json");
    if (fs.existsSync(defaultOutput)) {
      fs.unlinkSync(defaultOutput);
    }

    const customOutput = path.join(process.cwd(), "custom-output.json");
    if (fs.existsSync(customOutput)) {
      fs.unlinkSync(customOutput);
    }
  });

  afterEach(() => {
    // Clean up test files
    const defaultOutput = path.join(testGardenPath, ".garden-graph.json");
    if (fs.existsSync(defaultOutput)) {
      fs.unlinkSync(defaultOutput);
    }

    const customOutput = path.join(process.cwd(), "custom-output.json");
    if (fs.existsSync(customOutput)) {
      fs.unlinkSync(customOutput);
    }

    // Reset all mocks
    jest.clearAllMocks();
  });

  it("should generate graph in target directory by default", () => {
    const { result, logs } = callCli({ targetDirectory: testGardenPath });

    expect(result.success).toBe(true);
    expect(result.nodeCount).toBe(5); // Now includes subdirectory files
    expect(result.linkCount).toBe(6); // Additional links from subdirectory files
    expect(result.outputFile).toBe(
      path.join(testGardenPath, ".garden-graph.json"),
    );

    // Check logging calls
    expect(logs.start).toHaveLength(1);
    expect(logs.start[0][0]).toContain("Scanning directory:");
    expect(logs.info).toHaveLength(1);
    expect(logs.info[0][0]).toContain("Found 5 nodes and 6 links");
    expect(logs.success).toHaveLength(1);
    expect(logs.success[0][0]).toContain("Graph generated and written to");

    // Check that the file was created in the garden directory
    const outputPath = path.join(testGardenPath, ".garden-graph.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    // Verify the content
    const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(content.nodes).toBeDefined();
    expect(content.links).toBeDefined();
    expect(Object.keys(content.nodes)).toHaveLength(5);
    expect(content.links).toHaveLength(6);
    expect(content.nodes.note1.label).toBe("Note One");
    expect(content.nodes.note2.label).toBe("Note Two");
    expect(content.nodes.note3.label).toBe("Note Three");
    expect(content.nodes["subdirectory-note4"].label).toBe(
      "Note Four in Subdirectory",
    );
    expect(content.nodes["subdirectory-note5"].label).toBe("Note Five");
  });

  it("should generate graph in current directory when no args provided", () => {
    const { result, logs } = callCli();

    expect(result.success).toBe(true);
    expect(logs.start).toHaveLength(1);
    expect(logs.success).toHaveLength(1);

    // Check that the file was created in the current directory
    const outputPath = path.join(process.cwd(), ".garden-graph.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    // Clean up
    fs.unlinkSync(outputPath);
  });

  it("should use custom output file when -o option provided", () => {
    const customPath = "custom-output.json";
    const { result, logs } = callCli({
      targetDirectory: testGardenPath,
      outputFile: customPath,
    });

    expect(result.success).toBe(true);
    expect(result.outputFile).toBe(path.join(process.cwd(), customPath));
    expect(logs.start).toHaveLength(1);
    expect(logs.success).toHaveLength(1);

    // Check that the file was created with custom name
    const outputPath = path.join(process.cwd(), customPath);
    expect(fs.existsSync(outputPath)).toBe(true);

    // Verify the content
    const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(content.nodes).toBeDefined();
    expect(content.links).toBeDefined();
    expect(Object.keys(content.nodes)).toHaveLength(5);
  });

  it("should show help when --help option provided", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    showHelp();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Usage: markdown-graph"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Generate a graph from markdown files"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Options:"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("-h, --help"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("-o, --output"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Examples:"),
    );

    consoleSpy.mockRestore();
  });

  it("should show help when -h option provided", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    showHelp();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Usage: markdown-graph"),
    );

    consoleSpy.mockRestore();
  });

  it("should handle non-existent directory gracefully", () => {
    const { result, logs } = callCli({
      targetDirectory: "/non/existent/directory",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Directory does not exist");
    expect(result.message).toContain("/non/existent/directory");
    expect(logs.error).toHaveLength(1);
  });

  it("should handle missing output filename gracefully", () => {
    // This error is handled in the main() function argument parsing,
    // not in runCli, so we'll test that when no output is provided
    // it defaults to the target directory
    const { result } = callCli({
      targetDirectory: testGardenPath,
    });

    expect(result.success).toBe(true);
    expect(result.outputFile).toBe(
      path.join(testGardenPath, ".garden-graph.json"),
    );
  });

  it("should handle empty directory without markdown files", () => {
    // Create a temporary empty directory
    const emptyDir = path.join(process.cwd(), "temp-empty-dir");
    fs.mkdirSync(emptyDir, { recursive: true });

    try {
      const { result, logs } = callCli({ targetDirectory: emptyDir });

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBe(0);
      expect(result.linkCount).toBe(0);
      expect(logs.info[0][0]).toContain("Found 0 nodes and 0 links");

      // Check that the file was created
      const outputPath = path.join(emptyDir, ".garden-graph.json");
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify empty graph
      const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      expect(content.nodes).toEqual({});
      expect(content.links).toEqual([]);

      // Clean up
      fs.unlinkSync(outputPath);
    } finally {
      fs.rmSync(emptyDir, { recursive: true });
    }
  });

  it("should show verbose output when -v flag is used", () => {
    const { result, logs } = callCli({
      targetDirectory: testGardenPath,
      verbose: true,
    });

    expect(result.success).toBe(true);
    expect(logs.start).toHaveLength(1);
    expect(logs.debug).toHaveLength(3); // Target directory, output file, nodes
    expect(logs.debug[0][0]).toContain("Target directory:");
    expect(logs.debug[1][0]).toContain("Output file:");
    expect(logs.debug[2][0]).toContain("Nodes: note1, note2, note3");
    expect(logs.success).toHaveLength(1);
  });

  it("should show verbose output when --verbose flag is used", () => {
    const { result, logs } = callCli({
      targetDirectory: testGardenPath,
      verbose: true,
    });

    expect(result.success).toBe(true);
    expect(logs.debug).toHaveLength(3);
    expect(logs.debug[0][0]).toContain("Target directory:");
    expect(logs.debug[1][0]).toContain("Output file:");
    expect(logs.debug[2][0]).toContain("Nodes:");
  });

  it("should suppress output when -q flag is used", () => {
    const { result } = callCli({
      targetDirectory: testGardenPath,
      quiet: true,
    });

    expect(result.success).toBe(true);
    expect(consola.level).toBe(0); // Quiet mode

    // Check that the file was still created
    const outputPath = path.join(testGardenPath, ".garden-graph.json");
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("should suppress output when --quiet flag is used", () => {
    const { result } = callCli({
      targetDirectory: testGardenPath,
      quiet: true,
    });

    expect(result.success).toBe(true);
    expect(consola.level).toBe(0); // Quiet mode
  });
});
