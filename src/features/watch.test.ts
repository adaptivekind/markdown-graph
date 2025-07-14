import { graphFrom } from "./feature-helpers";

describe("Watch functionality (basic)", () => {
  it("should support incremental graph updates conceptually", async () => {
    // Start with a simple graph
    const initialGraph = await graphFrom({
      doc1: "# Document 1\nInitial content",
    });

    expect(Object.keys(initialGraph.nodes)).toHaveLength(1);
    expect(initialGraph.nodes["doc1"].label).toBe("Document 1");

    // Simulate adding a new document
    const updatedGraph = await graphFrom({
      doc1: "# Document 1\nInitial content",
      doc2: "# Document 2\nNew content",
    });

    expect(Object.keys(updatedGraph.nodes)).toHaveLength(2);
    expect(updatedGraph.nodes["doc2"].label).toBe("Document 2");
  });

  it("should handle document modifications", async () => {
    // Start with one graph state
    const beforeGraph = await graphFrom({
      doc1: "# Original Title\nOriginal content",
    });

    expect(beforeGraph.nodes["doc1"].label).toBe("Original Title");

    // Simulate modifying the document
    const afterGraph = await graphFrom({
      doc1: "# Updated Title\nUpdated content",
    });

    expect(afterGraph.nodes["doc1"].label).toBe("Updated Title");
  });

  it("should handle link changes", async () => {
    // Before: no links
    const beforeGraph = await graphFrom({
      doc1: "# Document 1\nNo links here",
      doc2: "# Document 2\nAlso no links",
    });

    expect(beforeGraph.links).toHaveLength(0);

    // After: add a link
    const afterGraph = await graphFrom({
      doc1: "# Document 1\nNow links to [[doc2]]",
      doc2: "# Document 2\nAlso no links",
    });

    expect(afterGraph.links).toHaveLength(1);
    expect(afterGraph.links[0].source).toBe("doc1");
    expect(afterGraph.links[0].target).toBe("doc2");
  });
});
