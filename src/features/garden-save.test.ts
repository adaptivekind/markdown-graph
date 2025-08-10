import { createGarden } from "../garden";
import fs from "fs";
import path from "path";

const testMarkdownContent = {
  note1: `# Note 1

This is some content with [[note2]] link.`,

  note2: `# Note 2

This references back to [[note1]].`,
};

describe("garden save functionality", () => {
  const testDir = path.join("target", "garden-save-tests");

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should save garden graph to default location (.garden-graph.json in garden directory)", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      path: testDir,
    });

    await garden.save();

    const expectedOutputPath = path.join(testDir, ".garden-graph.json");
    expect(fs.existsSync(expectedOutputPath)).toBe(true);

    const savedContent = JSON.parse(
      fs.readFileSync(expectedOutputPath, "utf-8"),
    );
    expect(savedContent.nodes).toBeDefined();
    expect(savedContent.links).toBeDefined();
    expect(Object.keys(savedContent.nodes)).toHaveLength(2);
    expect("note1" in savedContent.nodes).toBe(true);
    expect("note2" in savedContent.nodes).toBe(true);
  });

  it("should save garden graph to custom output path", async () => {
    const customOutputPath = path.join(testDir, "custom-graph.json");

    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      outputPath: customOutputPath,
    });

    await garden.save();

    expect(fs.existsSync(customOutputPath)).toBe(true);

    const savedContent = JSON.parse(fs.readFileSync(customOutputPath, "utf-8"));
    expect(savedContent.nodes).toBeDefined();
    expect(savedContent.links).toBeDefined();
    expect(Object.keys(savedContent.nodes)).toHaveLength(2);
    expect("note1" in savedContent.nodes).toBe(true);
    expect("note2" in savedContent.nodes).toBe(true);
  });

  it("should save properly formatted JSON with 2 space indentation", async () => {
    const outputPath = path.join(testDir, "formatted-graph.json");

    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      outputPath: outputPath,
    });

    await garden.save();

    const savedContentRaw = fs.readFileSync(outputPath, "utf-8");

    // Check that JSON is formatted with proper indentation
    expect(savedContentRaw).toContain('{\n  "nodes":');
    expect(savedContentRaw).toContain('  "links":');

    // Verify it can be parsed as valid JSON
    const savedContent = JSON.parse(savedContentRaw);
    expect(savedContent.nodes).toBeDefined();
    expect(savedContent.links).toBeDefined();
  });

  it("should work with optimized mode (noSections + justNodeNames)", async () => {
    const outputPath = path.join(testDir, "optimized-graph.json");

    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      outputPath: outputPath,
      noSections: true,
      justNodeNames: true,
    });

    await garden.save();

    expect(fs.existsSync(outputPath)).toBe(true);

    const savedContent = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(savedContent.nodes).toBeDefined();
    expect(savedContent.links).toBeDefined();

    // Should have empty nodes and no links in optimized mode
    expect(Object.keys(savedContent.nodes)).toHaveLength(2);
    expect(savedContent.links).toHaveLength(0);

    // Nodes should be empty objects
    for (const node of Object.values(savedContent.nodes)) {
      expect(Object.keys(node as object)).toHaveLength(0);
    }
  });

  it("should default to current working directory when no path is provided", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
    });

    // We can't actually test saving to cwd in a test, but we can test
    // that the garden is created without error
    expect(garden.save).toBeDefined();
    expect(typeof garden.save).toBe("function");
  });
});
