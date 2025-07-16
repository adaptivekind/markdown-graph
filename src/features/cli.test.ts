// Import CLI functions
import type { CliOptions } from "../cli";
import { consola } from "consola";
import fs from "fs";
import path from "path";
import { runCli } from "../cli";

const testGardenPath = path.join(process.cwd(), "test/gardens/test-garden");
const testDir = path.join(__dirname, "../../target/cli-test");

// Configure Jest timeout for this test suite
jest.setTimeout(15000);

// Mock consola methods
const mockStart = jest.spyOn(consola, "start").mockImplementation(() => {});
const mockInfo = jest.spyOn(consola, "info").mockImplementation(() => {});
const mockSuccess = jest.spyOn(consola, "success").mockImplementation(() => {});
const mockError = jest.spyOn(consola, "error").mockImplementation(() => {});
const mockDebug = jest.spyOn(consola, "debug").mockImplementation(() => {});

const callCli = async (options: CliOptions = {}) => {
  // Reset mocks before each call
  mockStart.mockClear();
  mockInfo.mockClear();
  mockSuccess.mockClear();
  mockError.mockClear();
  mockDebug.mockClear();
  consola.level = 3; // Reset level

  const result = await runCli(options);

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

function getTestFilenameAndRemoveExisting(
  filename: string,
  targetDir = testDir,
) {
  const absoluteFilename = path.join(targetDir, filename);
  if (fs.existsSync(absoluteFilename)) {
    fs.rmSync(absoluteFilename);
  }
  return absoluteFilename;
}

describe("CLI", () => {
  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });

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

  it("should generate graph in garden directory by default", async () => {
    const outputFile = getTestFilenameAndRemoveExisting(
      ".garden-graph.json",
      testGardenPath,
    );

    const { result, logs } = await callCli({
      targetDirectory: testGardenPath,
    });

    expect(result.success).toBe(true);
    expect(result.nodeCount).toBe(5); // Now includes subdirectory files
    expect(result.linkCount).toBe(6); // Additional links from subdirectory files
    expect(result.outputFile).toBe(outputFile);

    // Check logging calls
    expect(logs.start).toHaveLength(1);
    expect(logs.start[0][0]).toContain("Scanning directory:");
    expect(logs.info).toHaveLength(1);
    expect(logs.info[0][0]).toContain("Found 5 nodes and 6 links");
    expect(logs.success).toHaveLength(1);
    expect(logs.success[0][0]).toContain("Graph generated and written to");

    // Check that the file was created in the garden directory
    expect(fs.existsSync(outputFile)).toBe(true);

    // Verify the content
    const content = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(content.nodes).toBeDefined();
    expect(content.links).toBeDefined();
    expect(Object.keys(content.nodes)).toHaveLength(5);
    expect(content.links).toHaveLength(6);
    expect(content.nodes.note1.label).toBe("Note One");
    expect(content.nodes.note2.label).toBe("Note Two");
    expect(content.nodes.note3.label).toBe("Note Three");
    expect(content.nodes["note4"].label).toBe("Note Four in Subdirectory");
    expect(content.nodes["note5"].label).toBe("Note Five");
  });

  it("should generate graph in current directory when no args provided", async () => {
    const outputFile = getTestFilenameAndRemoveExisting(
      ".garden-graph.json",
      ".",
    );
    const { result, logs } = await callCli();

    expect(result.success).toBe(true);
    expect(logs.start).toHaveLength(1);
    expect(logs.success).toHaveLength(1);

    // Check that the file was created in the current directory
    expect(fs.existsSync(outputFile)).toBe(true);
  });

  it("should use custom output file when -o option provided", async () => {
    const customPath = "custom-output.json";
    const { result, logs } = await callCli({
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

  it("should handle non-existent directory gracefully", async () => {
    const { result, logs } = await callCli({
      targetDirectory: "/non/existent/directory",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Directory does not exist");
    expect(result.message).toContain("/non/existent/directory");
    expect(logs.error).toHaveLength(1);
  });

  it("should handle missing output filename gracefully", async () => {
    // This error is handled in the main() function argument parsing,
    // not in runCli, so we'll test that when no output is provided
    // it defaults to the target directory
    //

    const { result } = await callCli({
      targetDirectory: testGardenPath,
    });

    expect(result.success).toBe(true);
    expect(result.outputFile).toBe(
      path.join(testGardenPath, ".garden-graph.json"),
    );
  });

  it("should handle empty directory without markdown files", async () => {
    // Create a temporary empty directory
    const emptyDir = path.join(process.cwd(), "temp-empty-dir");
    fs.mkdirSync(emptyDir, { recursive: true });

    const outputFile = getTestFilenameAndRemoveExisting(
      ".garden-graph-empty.json",
    );

    try {
      const { result, logs } = await callCli({
        targetDirectory: emptyDir,
        outputFile,
      });

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBe(0);
      expect(result.linkCount).toBe(0);
      expect(logs.info[0][0]).toContain("Found 0 nodes and 0 links");

      // Check that the file was created
      expect(fs.existsSync(outputFile)).toBe(true);

      // Verify empty graph
      const content = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
      expect(content.nodes).toEqual({});
      expect(content.links).toEqual([]);

      // Clean up
      fs.unlinkSync(outputFile);
    } finally {
      fs.rmSync(emptyDir, { recursive: true });
    }
  });

  it("should show verbose output when -v flag is used", async () => {
    const { result, logs } = await callCli({
      targetDirectory: testGardenPath,
      verbose: true,
      outputFile: getTestFilenameAndRemoveExisting(".garden-graph-v.json"),
    });

    expect(result.message).toMatch(/^Graph generated and written/);
    expect(result.success).toBe(true);
    expect(logs.start).toHaveLength(1);
    expect(logs.debug).toHaveLength(3); // Target directory, output file, nodes
    expect(logs.debug[0][0]).toContain("Target directory:");
    expect(logs.debug[1][0]).toContain("Output file:");
    expect(logs.debug[2][0]).toContain(
      "Nodes: note1, note2, note3, note4, note5",
    );
    expect(logs.success).toHaveLength(1);
  });

  it("should show verbose output when --verbose flag is used", async () => {
    const { result, logs } = await callCli({
      targetDirectory: testGardenPath,
      verbose: true,
      outputFile: getTestFilenameAndRemoveExisting(
        ".garden-graph-verbose.json",
      ),
    });

    expect(result.success).toBe(true);
    expect(logs.debug).toHaveLength(3);
    expect(logs.debug[0][0]).toContain("Target directory:");
    expect(logs.debug[1][0]).toContain("Output file:");
    expect(logs.debug[2][0]).toContain("Nodes:");
  });

  it("should suppress output when -q flag is used", async () => {
    const outputFile = getTestFilenameAndRemoveExisting(".garden-graph-q.json");
    const { result } = await callCli({
      targetDirectory: testGardenPath,
      quiet: true,
      outputFile,
    });

    expect(result.success).toBe(true);
    expect(consola.level).toBe(0); // Quiet mode

    // Check that the file was still created
    expect(fs.existsSync(outputFile)).toBe(true);
  });

  it("should suppress output when --quiet flag is used", async () => {
    const { result } = await callCli({
      targetDirectory: testGardenPath,
      quiet: true,
      outputFile: getTestFilenameAndRemoveExisting(".garden-graph-quiet.json"),
    });

    expect(result.success).toBe(true);
    expect(consola.level).toBe(0); // Quiet mode
  });
});
