import { GraphWatcher } from "../watcher";
import fs from "fs";
import path from "path";

interface FileChangeEventData {
  filePath: string;
  changeType: "added" | "changed" | "removed";
  stats: {
    nodeCount: number;
    linkCount: number;
  };
}

describe("GraphWatcher", () => {
  const testDir = path.join(
    __dirname,
    "../../target/graphwatcher-integration-test-events",
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

  // Helper function to wait for a specific event
  const waitForEvent = <T = unknown>(
    emitter: GraphWatcher,
    eventName: string,
    timeout = 5000,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      emitter.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  };

  // Helper function to wait for initialization and first graph write
  const waitForInitialization = async (
    watcher: GraphWatcher,
  ): Promise<void> => {
    // Set up all promises before starting, to avoid race conditions
    const initializedPromise = waitForEvent(watcher, "initialized");
    const graphWrittenPromise = waitForEvent(watcher, "graphWritten");
    const readyPromise = waitForEvent(watcher, "ready");

    // Now start the watcher
    watcher.start();

    // Wait for all events
    await initializedPromise;
    await graphWrittenPromise;
    await readyPromise;
  };

  // Helper function to wait for a file change to be processed
  const waitForFileChange = async (
    watcher: GraphWatcher,
  ): Promise<FileChangeEventData> => {
    const fileChangePromise = waitForEvent<FileChangeEventData>(
      watcher,
      "fileChanged",
    );
    const graphWrittenPromise = waitForEvent(watcher, "graphWritten");

    // Wait for both the file change event and the graph write
    const fileChangeData = await fileChangePromise;
    await graphWrittenPromise;

    return fileChangeData;
  };

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

    // Start watcher and wait for initialization
    await waitForInitialization(watcher);

    // Check that output file was created
    expect(fs.existsSync(outputFile)).toBe(true);

    const graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toContain("doc1");
    expect(Object.keys(graph.nodes)).toContain("doc2");
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source).toBe("doc2");
    expect(graph.links[0].target).toBe("doc1");

    await watcher.stop();
  });

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

    // Start watcher and wait for initialization
    await waitForInitialization(watcher);

    // Verify initial state
    let graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(1);
    expect(Object.keys(graph.nodes)).toContain("existing");

    // Add a new file and wait for the change to be processed
    fs.writeFileSync(
      path.join(testDir, "new-doc.md"),
      "# New Document\nJust added with link to [[existing]]",
    );

    const changeData = await waitForFileChange(watcher);
    expect(changeData.changeType).toBe("added");
    expect(changeData.filePath).toContain("new-doc.md");

    // Check updated graph
    graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(2);
    expect(Object.keys(graph.nodes)).toContain("new-doc");
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source).toBe("new-doc");
    expect(graph.links[0].target).toBe("existing");

    await watcher.stop();
  });

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

    await waitForInitialization(watcher);

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

    const changeData = await waitForFileChange(watcher);
    expect(changeData.changeType).toBe("changed");
    expect(changeData.filePath).toContain("changeable.md");

    // Check updated graph
    graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(graph.nodes["changeable"].label).toBe("Updated Title");
    expect(Object.keys(graph.nodes)).toContain("existing-target");
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source).toBe("changeable");
    expect(graph.links[0].target).toBe("existing-target");

    await watcher.stop();
  });

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

    await waitForInitialization(watcher);

    // Verify initial state
    let graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(2);
    expect(graph.links).toHaveLength(1);

    // Delete a file
    fs.unlinkSync(doc1Path);

    const changeData = await waitForFileChange(watcher);
    expect(changeData.changeType).toBe("removed");
    expect(changeData.filePath).toContain("doc1.md");

    // Check updated graph
    graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(1);
    expect(Object.keys(graph.nodes)).toContain("doc2");
    expect(Object.keys(graph.nodes)).not.toContain("doc1");
    // Links to deleted nodes should be removed
    expect(graph.links).toHaveLength(0);

    await watcher.stop();
  });

  it("should handle rapid file changes with debouncing", async () => {
    const docPath = path.join(testDir, "rapid-changes.md");

    // Create initial file
    fs.writeFileSync(docPath, "# Initial\nContent");

    watcher = new GraphWatcher({
      targetDirectory: testDir,
      outputFile,
      verbose: false,
      debounceMs: 200, // Higher debounce for this test
    });

    await waitForInitialization(watcher);

    // Set up a promise to wait for the last change to be processed
    let lastChangePromise: Promise<FileChangeEventData>;

    // Make rapid changes
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(docPath, `# Change ${i}\nContent ${i}`);

      // For the last change, set up the wait
      if (i === 5) {
        lastChangePromise = waitForFileChange(watcher);
      }

      // Small delay between changes (less than debounce time)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Wait for the final debounced change to be processed
    await lastChangePromise!;

    // Check that graph reflects final state
    const graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(graph.nodes["rapid-changes"].label).toBe("Change 5");

    await watcher.stop();
  });

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

    await waitForInitialization(watcher);

    // Only markdown file should be in graph
    const graph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(graph.nodes)).toHaveLength(1);
    expect(Object.keys(graph.nodes)).toContain("doc");

    // Add another non-markdown file - this should not trigger any events
    fs.writeFileSync(path.join(testDir, "config.json"), "{}");

    // Wait a short time to ensure no change event is emitted
    let eventEmitted = false;
    const eventPromise = new Promise((resolve) => {
      watcher.once("fileChanged", () => {
        eventEmitted = true;
        resolve(true);
      });
      setTimeout(() => resolve(false), 300);
    });

    await eventPromise;
    expect(eventEmitted).toBe(false);

    // Graph should be unchanged
    const updatedGraph = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    expect(Object.keys(updatedGraph.nodes)).toHaveLength(1);

    await watcher.stop();
  });
});
