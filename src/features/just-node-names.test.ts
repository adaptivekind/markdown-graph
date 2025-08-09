import { createGarden } from "../garden";

const testMarkdownContent = {
  note1: `# Note 1

This is some content with [[note2]] link.

## Section 1.1

More content here.`,

  note2: `# Note 2

This references back to [[note1]].

Some metadata content.`,

  note3: `# Note 3

Independent note with no links.`,
};

describe("justNodeNames configuration option", () => {
  it("should include only node names without metadata or links when justNodeNames is true", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      justNodeNames: true,
    });

    const graph = garden.graph;

    // Should have nodes with names only (includes subsections)
    expect(Object.keys(graph.nodes)).toHaveLength(4);
    expect("note1" in graph.nodes).toBe(true);
    expect("note1#section-1-1" in graph.nodes).toBe(true);
    expect("note2" in graph.nodes).toBe(true);
    expect("note3" in graph.nodes).toBe(true);

    // Nodes should have minimal properties (no metadata)
    for (const [, node] of Object.entries(graph.nodes)) {
      expect(node.label).toBeUndefined();
      expect(node.type).toBeUndefined();
      expect(node.aliases).toBeUndefined();
      expect(node.value).toBeUndefined();
      expect(node.weights).toBeUndefined();
      expect(node.meta).toBeUndefined();
    }

    // Should have no links
    expect(graph.links).toHaveLength(0);
  });

  it("should include full metadata and links when justNodeNames is false or undefined", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      justNodeNames: false,
    });

    const graph = garden.graph;

    // Should have nodes with metadata (includes subsections)
    expect(Object.keys(graph.nodes)).toHaveLength(4);

    // At least some nodes should have labels (the main document nodes)
    const nodeEntries = Object.entries(graph.nodes);
    const nodesWithLabels = nodeEntries.filter(([, node]) => node.label);
    expect(nodesWithLabels.length).toBeGreaterThan(0);

    // Should have links (explicit links between notes)
    expect(graph.links.length).toBeGreaterThan(0);
  });

  it("should behave normally when justNodeNames is not specified", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
    });

    const graph = garden.graph;

    // Should behave like justNodeNames: false (includes subsections)
    expect(Object.keys(graph.nodes)).toHaveLength(4);

    // Should have metadata and links
    const nodeEntries = Object.entries(graph.nodes);
    const nodesWithLabels = nodeEntries.filter(([, node]) => node.label);
    expect(nodesWithLabels.length).toBeGreaterThan(0);
    expect(graph.links.length).toBeGreaterThan(0);
  });
});
