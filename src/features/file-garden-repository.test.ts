import path from "path";
// eslint-disable-next-line sort-imports
import { Graph } from "@adaptivekind/graph-schema";
import { createGarden } from "../garden";

const testGardenPath = path.join(process.cwd(), "test/gardens/test-garden");

describe("file garden repository", () => {
  it("should create garden from file repository", async () => {
    const garden = await createGarden({
      type: "file",
      path: testGardenPath,
    });

    expect(garden.graph.nodes).toBeDefined();
    expect(garden.graph.links).toBeDefined();
  });

  it("should throw error when path is not provided", async () => {
    await expect(async () => {
      await createGarden({
        type: "file",
      });
    }).rejects.toThrow("File repository requires a path to be specified");
  });

  it("should create graph with correct nodes and links", async () => {
    const garden = await createGarden({
      type: "file",
      path: testGardenPath,
    });

    const graph: Graph = garden.graph;

    // Check that nodes exist for each markdown file
    expect(graph.nodes.note1).toBeDefined();
    expect(graph.nodes.note2).toBeDefined();
    expect(graph.nodes.note3).toBeDefined();

    // Check node labels
    expect(graph.nodes.note1.label).toBe("Note One");
    expect(graph.nodes.note2.label).toBe("Note Two");
    expect(graph.nodes.note3.label).toBe("Note Three");

    // Check that meta is properly set for files with frontmatter
    expect(graph.nodes.note1.meta?.title).toBe("Note One");
    expect(graph.nodes.note2.meta?.author).toBe("Test Author");
    expect(graph.nodes.note3.meta?.title).toBe("Note Three");

    // Check that links are created
    const linkTargets = graph.links.map((link) => link.target);
    expect(linkTargets).toContain("note1");
    expect(linkTargets).toContain("note2");
    expect(linkTargets).toContain("note3");
  });
});
