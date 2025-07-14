import { GraphWatcher } from "../watcher";
import fs from "fs";
import path from "path";
import { setTimeout } from "timers/promises";

describe("GraphWatcher Integration", () => {
  const testDir = path.join(
    __dirname,
    "../../target/graphwatcher-integration-test",
  );
  const outputFile = path.join(testDir, ".garden-graph.json");
  let watcher: GraphWatcher;

  beforeEach(async () => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Stop watcher if running
    if (watcher) {
      await watcher.stop();
    }
  });

  it("should initialize graph from existing files", async () => {
    // Create initial test files
    fs.writeFileSync(
      path.join(testDir, "doc1.md"),
      "# Document 1\nInitial content",
    );
    fs.writeFileSync(
      path.join(testDir, "doc2.md"),
      "# Document 2\nLinks to [[doc1]]",
    );

    watcher = new GraphWatcher({
      targetDirectory: testDir,
      outputFile,
      verbose: false,
    });

    // Start watcher (but don't await since it never resolves)
    watcher.start();

    // Wait for initialization
    await setTimeout(500);

    // Check that output file was created
    expect(fs.existsSync(outputFile)).toBe(true);

    const graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toContain("doc1");
    expect(Object.keys(graph.nodes)).toContain("doc2");
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source).toBe("doc2");
    expect(graph.links[0].target).toBe("doc1");

    // Cleanup
    await watcher.stop();
  }, 10000);

  it("should detect and update graph when files are added", async () => {
    // Start with one file
    fs.writeFileSync(
      path.join(testDir, "existing.md"),
      "# Existing Document\nAlready here",
    );

    watcher = new GraphWatcher({
      targetDirectory: testDir,
      outputFile,
      verbose: false,
      debounceMs: 100, // Faster for testing
    });

    // Start watcher
    watcher.start();

    // Wait for initialization
    await setTimeout(300);

    // Verify initial state
    let graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(1);
    expect(Object.keys(graph.nodes)).toContain("existing");

    // Add a new file
    fs.writeFileSync(
      path.join(testDir, "new-doc.md"),
      "# New Document\nJust added with link to [[existing]]",
    );

    // Wait for file change detection and debounce
    await setTimeout(800);

    // Check updated graph
    graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(2);
    expect(Object.keys(graph.nodes)).toContain("new-doc");
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source).toBe("new-doc");
    expect(graph.links[0].target).toBe("existing");

    await watcher.stop();
  }, 15000);

  it("should detect and update graph when files are modified", async () => {
    const docPath = path.join(testDir, "changeable.md");
    const targetPath = path.join(testDir, "existing-target.md");

    // Create initial files
    fs.writeFileSync(docPath, "# Original Title\nOriginal content");
    fs.writeFileSync(targetPath, "# Existing Target\nTarget content");

    watcher = new GraphWatcher({
      targetDirectory: testDir,
      outputFile,
      verbose: false,
      debounceMs: 100,
    });

    watcher.start();
    await setTimeout(500);

    // Verify initial state
    let graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(graph.nodes["changeable"].label).toBe("Original Title");
    expect(graph.nodes["existing-target"].label).toBe("Existing Target");
    expect(graph.links).toHaveLength(0);

    // Modify the file to add a link to the existing target
    fs.writeFileSync(
      docPath,
      "# Updated Title\nUpdated content with link to [[existing-target]]",
    );

    // Wait for change detection
    await setTimeout(800);

    // Check updated graph
    graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(graph.nodes["changeable"].label).toBe("Updated Title");
    expect(Object.keys(graph.nodes)).toContain("existing-target");
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source).toBe("changeable");
    expect(graph.links[0].target).toBe("existing-target");

    await watcher.stop();
  }, 15000);

  it("should detect and update graph when files are deleted", async () => {
    const doc1Path = path.join(testDir, "doc1.md");
    const doc2Path = path.join(testDir, "doc2.md");

    // Create initial files
    fs.writeFileSync(doc1Path, "# Document 1\nFirst document");
    fs.writeFileSync(
      doc2Path,
      "# Document 2\nSecond document links to [[doc1]]",
    );

    watcher = new GraphWatcher({
      targetDirectory: testDir,
      outputFile,
      verbose: false,
      debounceMs: 100,
    });

    watcher.start();
    await setTimeout(500);

    // Verify initial state
    let graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(2);
    expect(graph.links).toHaveLength(1);

    // Delete a file
    fs.unlinkSync(doc1Path);

    // Wait for change detection
    await setTimeout(800);

    // Check updated graph
    graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(1);
    expect(Object.keys(graph.nodes)).toContain("doc2");
    expect(Object.keys(graph.nodes)).not.toContain("doc1");
    // Links to deleted nodes should be removed
    expect(graph.links).toHaveLength(0);

    await watcher.stop();
  }, 15000);

  it("should handle rapid file changes with debouncing", async () => {
    const docPath = path.join(testDir, "rapid-changes.md");

    // Create initial file
    fs.writeFileSync(docPath, "# Initial\nContent");

    watcher = new GraphWatcher({
      targetDirectory: testDir,
      outputFile,
      verbose: false,
      debounceMs: 300, // Higher debounce for this test
    });

    watcher.start();
    await setTimeout(500);

    // Make rapid changes
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(docPath, `# Change ${i}\nContent ${i}`);
      await setTimeout(50); // Small delay between changes
    }

    // Wait for debounce to settle
    await setTimeout(1000);

    // Check that graph reflects final state
    const graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(graph.nodes["rapid-changes"].label).toBe("Change 5");

    await watcher.stop();
  }, 15000);

  it("should ignore non-markdown files", async () => {
    // Create markdown and non-markdown files
    fs.writeFileSync(
      path.join(testDir, "doc.md"),
      "# Markdown Doc\nValid content",
    );
    fs.writeFileSync(path.join(testDir, "readme.txt"), "Not markdown");
    fs.writeFileSync(path.join(testDir, "image.jpg"), "Binary content");

    watcher = new GraphWatcher({
      targetDirectory: testDir,
      outputFile,
      verbose: false,
      debounceMs: 100,
    });

    watcher.start();
    await setTimeout(500);

    // Only markdown file should be in graph
    const graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(1);
    expect(Object.keys(graph.nodes)).toContain("doc");

    // Add another non-markdown file
    fs.writeFileSync(path.join(testDir, "config.json"), "{}");
    await setTimeout(500);

    // Graph should be unchanged
    const updatedGraph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(updatedGraph.nodes)).toHaveLength(1);

    await watcher.stop();
  }, 10000);
});
