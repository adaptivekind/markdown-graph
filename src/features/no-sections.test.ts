import { createGarden } from "../garden";

const testMarkdownContent = {
  note1: `# Note 1

This is some content with [[note2]] link.

## Section 1.1

More content here.

### Subsection 1.1.1

Even more nested content.`,

  note2: `# Note 2

This references back to [[note1]].

## Section 2.1

Some metadata content.

## Section 2.2

More sections here.`,

  note3: `# Note 3

Independent note with no sections.`,
};

describe("noSections configuration option", () => {
  it("should only include document nodes without sections when noSections is true", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      noSections: true,
    });

    const graph = garden.graph;

    // Should only have document nodes (no section nodes like note1#section-1-1)
    expect(Object.keys(graph.nodes)).toHaveLength(3);
    expect("note1" in graph.nodes).toBe(true);
    expect("note2" in graph.nodes).toBe(true);
    expect("note3" in graph.nodes).toBe(true);

    // Should NOT have any section nodes
    expect("note1#section-1-1" in graph.nodes).toBe(false);
    expect("note1#subsection-1-1-1" in graph.nodes).toBe(false);
    expect("note2#section-2-1" in graph.nodes).toBe(false);
    expect("note2#section-2-2" in graph.nodes).toBe(false);

    // Document nodes should still have their metadata
    expect(graph.nodes.note1.label).toBe("Note 1");
    expect(graph.nodes.note2.label).toBe("Note 2");
    expect(graph.nodes.note3.label).toBe("Note 3");

    // Should still have links between documents
    expect(graph.links.length).toBeGreaterThan(0);
  });

  it("should include all nodes including sections when noSections is false", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      noSections: false,
    });

    const graph = garden.graph;

    // Should have document nodes AND section nodes
    expect(Object.keys(graph.nodes).length).toBeGreaterThan(3);
    expect("note1" in graph.nodes).toBe(true);
    expect("note2" in graph.nodes).toBe(true);
    expect("note3" in graph.nodes).toBe(true);

    // Should have section nodes
    expect("note1#section-1-1" in graph.nodes).toBe(true);
    expect("note1#subsection-1-1-1" in graph.nodes).toBe(true);
    expect("note2#section-2-1" in graph.nodes).toBe(true);
    expect("note2#section-2-2" in graph.nodes).toBe(true);

    // Should have links between documents and sections
    expect(graph.links.length).toBeGreaterThan(0);
  });

  it("should include sections by default when noSections is not specified", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
    });

    const graph = garden.graph;

    // Should behave like noSections: false
    expect(Object.keys(graph.nodes).length).toBeGreaterThan(3);
    expect("note1#section-1-1" in graph.nodes).toBe(true);
    expect("note1#subsection-1-1-1" in graph.nodes).toBe(true);
    expect("note2#section-2-1" in graph.nodes).toBe(true);
    expect("note2#section-2-2" in graph.nodes).toBe(true);
  });

  it("should work together with justNodeNames option", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      noSections: true,
      justNodeNames: true,
    });

    const graph = garden.graph;

    // Should only have 3 document nodes with no metadata
    expect(Object.keys(graph.nodes)).toHaveLength(3);
    expect("note1" in graph.nodes).toBe(true);
    expect("note2" in graph.nodes).toBe(true);
    expect("note3" in graph.nodes).toBe(true);

    // Should NOT have any section nodes
    expect("note1#section-1-1" in graph.nodes).toBe(false);

    // Nodes should have no metadata (justNodeNames behavior)
    for (const [, node] of Object.entries(graph.nodes)) {
      expect(node.label).toBeUndefined();
      expect(node.type).toBeUndefined();
      expect(node.aliases).toBeUndefined();
      expect(node.value).toBeUndefined();
      expect(node.weights).toBeUndefined();
      expect(node.meta).toBeUndefined();
    }

    // Should have no links (justNodeNames behavior)
    expect(graph.links).toHaveLength(0);
  });
});
