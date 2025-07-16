import { Graph } from "@adaptivekind/graph-schema";
import { graphFrom } from "./feature-helpers";

describe("Graph Building", () => {
  describe("empty and basic scenarios", () => {
    it("should create an empty graph from empty repository", async () => {
      const graph: Graph = await graphFrom({});

      expect(graph.nodes).toEqual({});
      expect(graph.links).toEqual([]);
    });

    it("should add a simple document with one section", async () => {
      const graph: Graph = await graphFrom({
        "simple-doc": "# Simple Document\nThis is a simple document.",
      });

      expect(Object.keys(graph.nodes)).toHaveLength(1);
      expect(graph.nodes["simple-doc"]).toBeDefined();
      expect(graph.nodes["simple-doc"].label).toBe("Simple Document");
      expect(graph.links).toEqual([]);
    });
  });

  describe("multiple sections", () => {
    it("should handle documents with multiple sections", async () => {
      const graph: Graph = await graphFrom({
        "multi-section": `# Main Title
Some content here.

## Section One
Content for section one.

## Section Two
Content for section two.`,
      });

      expect(Object.keys(graph.nodes)).toHaveLength(3);
      expect(graph.nodes["multi-section"]).toBeDefined();
      expect(graph.nodes["multi-section#section-one"]).toBeDefined();
      expect(graph.nodes["multi-section#section-two"]).toBeDefined();

      expect(graph.nodes["multi-section"].label).toBe("Main Title");
      expect(graph.nodes["multi-section#section-one"].label).toBe(
        "Section One",
      );
      expect(graph.nodes["multi-section#section-two"].label).toBe(
        "Section Two",
      );
    });

    it("should handle documents with nested heading levels", async () => {
      const graph: Graph = await graphFrom({
        "nested-doc": `# Level 1
## Level 2
### Level 3
#### Level 4`,
      });

      expect(Object.keys(graph.nodes)).toHaveLength(4);
      expect(graph.nodes["nested-doc"]).toBeDefined();
      expect(graph.nodes["nested-doc#level-2"]).toBeDefined();
      expect(graph.nodes["nested-doc#level-3"]).toBeDefined();
      expect(graph.nodes["nested-doc#level-4"]).toBeDefined();
    });
  });

  describe("document linking", () => {
    it("should create links between documents", async () => {
      const graph: Graph = await graphFrom({
        "doc-with-links": `# Document with Links
This document links to [[other-doc]] and [[another-doc]].

## Section
This section also links to [[third-doc]].`,
        "other-doc": "# Other Document\nContent here.",
        "another-doc": "# Another Document\nMore content.",
        "third-doc": "# Third Document\nEven more content.",
      });

      expect(graph.links).toHaveLength(4);

      const linkTargets = graph.links.map((link) => link.target);
      expect(linkTargets).toContain("other-doc");
      expect(linkTargets).toContain("another-doc");
      expect(linkTargets).toContain("third-doc");

      const linkSources = graph.links.map((link) => link.source);
      expect(linkSources).toContain("doc-with-links");
    });

    it("should handle links to non-existent documents", async () => {
      const graph: Graph = await graphFrom({
        "doc-with-broken-links": `# Document with Broken Links
This document links to [[non-existent-doc]] and [[another-missing]].`,
      });

      expect(graph.links).toHaveLength(2);
      expect(graph.links[0].source).toBe("doc-with-broken-links");
      expect(graph.links[0].target).toBe("non-existent-doc");
      expect(graph.links[1].source).toBe("doc-with-broken-links");
      expect(graph.links[1].target).toBe("another-missing");
    });
  });

  describe("frontmatter handling", () => {
    it("should handle frontmatter metadata", async () => {
      const graph: Graph = await graphFrom({
        "doc-with-meta": `---
title: Custom Title
author: John Doe
tags: test,example
---
# Document with Metadata
Content here.`,
      });

      expect(graph.nodes["doc-with-meta"].meta).toBeDefined();
      expect(graph.nodes["doc-with-meta"].meta?.title).toBe("Custom Title");
      expect(graph.nodes["doc-with-meta"].meta?.author).toBe("John Doe");
      expect(graph.nodes["doc-with-meta"].meta?.tags).toBe("test,example");
    });

    it("should not include meta when frontmatter is empty", async () => {
      const graph: Graph = await graphFrom({
        "no-meta-doc": "# Document without Metadata\nContent here.",
      });

      expect(graph.nodes["no-meta-doc"].meta).toBeUndefined();
    });
  });

  describe("multiple documents", () => {
    it("should handle multiple interconnected documents", async () => {
      const graph: Graph = await graphFrom({
        doc1: "# Document 1\nLinks to [[doc2]]",
        doc2: "# Document 2\nLinks to [[doc3]]",
        doc3: "# Document 3\nNo links here",
      });

      expect(Object.keys(graph.nodes)).toHaveLength(3);
      expect(graph.links).toHaveLength(2);
      expect(graph.links[0].source).toBe("doc1");
      expect(graph.links[0].target).toBe("doc2");
      expect(graph.links[1].source).toBe("doc2");
      expect(graph.links[1].target).toBe("doc3");
    });

    it("should track node and link counts accurately", async () => {
      const graph: Graph = await graphFrom({
        "stats-doc": `# Main Title
Links to [[doc1]] and [[doc2]].

## Section 1
Links to [[doc3]].

## Section 2
No links here.`,
        doc1: "# Doc 1",
        doc2: "# Doc 2",
        doc3: "# Doc 3",
      });

      const nodeCount = Object.keys(graph.nodes).length;
      const linkCount = graph.links.length;

      expect(nodeCount).toBe(6); // stats-doc + 2 sections + 3 other docs
      expect(linkCount).toBe(5); // 3 total links
    });
  });

  describe("graph structure integrity", () => {
    it("should maintain consistent graph structure", async () => {
      const graph: Graph = await graphFrom({
        "test-doc": "# Test Document\nLinks to [[other]] and has content.",
      });

      // Verify graph structure follows expected schema
      expect(graph).toHaveProperty("nodes");
      expect(graph).toHaveProperty("links");
      expect(typeof graph.nodes).toBe("object");
      expect(Array.isArray(graph.links)).toBe(true);

      // Each node should have required properties
      Object.values(graph.nodes).forEach((node) => {
        expect(node).toHaveProperty("label");
        expect(typeof node.label).toBe("string");
      });

      // Each link should have source and target
      graph.links.forEach((link) => {
        expect(link).toHaveProperty("source");
        expect(link).toHaveProperty("target");
        expect(typeof link.source).toBe("string");
        expect(typeof link.target).toBe("string");
      });
    });

    it("should handle edge cases gracefully", async () => {
      const graph: Graph = await graphFrom({
        "empty-content": "",
        "only-frontmatter": `---
title: Only Frontmatter
---`,
        "no-title": "Some content without a heading.",
      });

      expect(Object.keys(graph.nodes)).toHaveLength(3);
      expect(graph.nodes["empty-content"]).toBeDefined();
      expect(graph.nodes["only-frontmatter"]).toBeDefined();
      expect(graph.nodes["no-title"]).toBeDefined();
    });
  });
});
