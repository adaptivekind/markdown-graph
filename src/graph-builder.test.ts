/**
 * Unit tests for GraphBuilder class
 */

import { GraphBuilder } from "./graph-builder";
import type { MarkdownDocument } from "./types";

describe("GraphBuilder", () => {
  let builder: GraphBuilder;

  beforeEach(() => {
    builder = new GraphBuilder();
  });

  describe("construction and basic usage", () => {
    it("should create an empty graph initially", () => {
      const graph = builder.build();

      expect(graph.nodes).toEqual({});
      expect(graph.links).toEqual([]);
    });

    it("should return statistics for empty graph", () => {
      const stats = builder.getStats();

      expect(stats.nodeCount).toBe(0);
      expect(stats.linkCount).toBe(0);
    });

    it("should reset to empty state", () => {
      // Add a document first
      const document: MarkdownDocument = {
        id: "test",
        hash: "hash123",
        content: "# Test\nSome content",
        frontmatter: {},
      };

      builder.addDocument(document);
      expect(builder.getStats().nodeCount).toBeGreaterThan(0);

      // Reset and verify empty
      builder.reset();
      const stats = builder.getStats();
      expect(stats.nodeCount).toBe(0);
      expect(stats.linkCount).toBe(0);
    });
  });

  describe("adding documents", () => {
    it("should add a simple document with one section", () => {
      const document: MarkdownDocument = {
        id: "simple-doc",
        hash: "hash123",
        content: "# Simple Document\nThis is a simple document.",
        frontmatter: {},
      };

      builder.addDocument(document);
      const graph = builder.build();

      expect(Object.keys(graph.nodes)).toHaveLength(1);
      expect(graph.nodes["simple-doc"]).toBeDefined();
      expect(graph.nodes["simple-doc"].label).toBe("Simple Document");
    });

    it("should handle documents with multiple sections", () => {
      const document: MarkdownDocument = {
        id: "multi-section",
        hash: "hash123",
        content: `# Main Title
Some content here.

## Section One
Content for section one.

## Section Two
Content for section two.`,
        frontmatter: {},
      };

      builder.addDocument(document);
      const graph = builder.build();

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

    it("should handle documents with nested heading levels", () => {
      const document: MarkdownDocument = {
        id: "nested-doc",
        hash: "hash123",
        content: `# Level 1
## Level 2
### Level 3
#### Level 4`,
        frontmatter: {},
      };

      builder.addDocument(document);
      const graph = builder.build();

      expect(Object.keys(graph.nodes)).toHaveLength(4);
      expect(graph.nodes["nested-doc"]).toBeDefined();
      expect(graph.nodes["nested-doc#level-2"]).toBeDefined();
      expect(graph.nodes["nested-doc#level-3"]).toBeDefined();
      expect(graph.nodes["nested-doc#level-4"]).toBeDefined();
    });

    it("should create links between documents", () => {
      const document: MarkdownDocument = {
        id: "doc-with-links",
        hash: "hash123",
        content: `# Document with Links
This document links to [[other-doc]] and [[another-doc]].

## Section
This section also links to [[third-doc]].`,
        frontmatter: {},
      };

      builder.addDocument(document);
      const graph = builder.build();

      expect(graph.links).toHaveLength(3);

      const linkTargets = graph.links.map((link) => link.target);
      expect(linkTargets).toContain("other-doc");
      expect(linkTargets).toContain("another-doc");
      expect(linkTargets).toContain("third-doc");

      const linkSources = graph.links.map((link) => link.source);
      expect(linkSources).toContain("doc-with-links");
    });

    it("should handle frontmatter metadata", () => {
      const document: MarkdownDocument = {
        id: "doc-with-meta",
        hash: "hash123",
        content: "# Document with Metadata\nContent here.",
        frontmatter: {
          title: "Custom Title",
          author: "John Doe",
          tags: "test,example",
        },
      };

      builder.addDocument(document);
      const graph = builder.build();

      expect(graph.nodes["doc-with-meta"].meta).toBeDefined();
      expect(graph.nodes["doc-with-meta"].meta?.title).toBe("Custom Title");
      expect(graph.nodes["doc-with-meta"].meta?.author).toBe("John Doe");
      expect(graph.nodes["doc-with-meta"].meta?.tags).toBe("test,example");
    });

    it("should not include meta when frontmatter is empty", () => {
      const document: MarkdownDocument = {
        id: "no-meta-doc",
        hash: "hash123",
        content: "# Document without Metadata\nContent here.",
        frontmatter: {},
      };

      builder.addDocument(document);
      const graph = builder.build();

      expect(graph.nodes["no-meta-doc"].meta).toBeUndefined();
    });
  });

  describe("builder pattern", () => {
    it("should support method chaining", () => {
      const doc1: MarkdownDocument = {
        id: "doc1",
        hash: "hash1",
        content: "# Document 1",
        frontmatter: {},
      };

      const doc2: MarkdownDocument = {
        id: "doc2",
        hash: "hash2",
        content: "# Document 2",
        frontmatter: {},
      };

      const result = builder
        .addDocument(doc1)
        .addDocument(doc2)
        .reset()
        .addDocument(doc1);

      expect(result).toBe(builder);
      expect(builder.getStats().nodeCount).toBe(1);
    });

    it("should allow multiple documents to be added", () => {
      const documents: MarkdownDocument[] = [
        {
          id: "doc1",
          hash: "hash1",
          content: "# Document 1\nLinks to [[doc2]]",
          frontmatter: {},
        },
        {
          id: "doc2",
          hash: "hash2",
          content: "# Document 2\nLinks to [[doc3]]",
          frontmatter: {},
        },
        {
          id: "doc3",
          hash: "hash3",
          content: "# Document 3\nNo links here",
          frontmatter: {},
        },
      ];

      documents.forEach((doc) => builder.addDocument(doc));
      const graph = builder.build();

      expect(Object.keys(graph.nodes)).toHaveLength(3);
      expect(graph.links).toHaveLength(2);
      expect(graph.links[0].source).toBe("doc1");
      expect(graph.links[0].target).toBe("doc2");
      expect(graph.links[1].source).toBe("doc2");
      expect(graph.links[1].target).toBe("doc3");
    });
  });

  describe("statistics", () => {
    it("should track node and link counts accurately", () => {
      const document: MarkdownDocument = {
        id: "stats-doc",
        hash: "hash123",
        content: `# Main Title
Links to [[doc1]] and [[doc2]].

## Section 1
Links to [[doc3]].

## Section 2
No links here.`,
        frontmatter: {},
      };

      builder.addDocument(document);
      const stats = builder.getStats();

      expect(stats.nodeCount).toBe(3); // Main + 2 sections
      expect(stats.linkCount).toBe(3); // 3 total links
    });

    it("should update statistics as documents are added", () => {
      expect(builder.getStats()).toEqual({ nodeCount: 0, linkCount: 0 });

      const doc1: MarkdownDocument = {
        id: "doc1",
        hash: "hash1",
        content: "# Doc 1",
        frontmatter: {},
      };

      builder.addDocument(doc1);
      expect(builder.getStats()).toEqual({ nodeCount: 1, linkCount: 0 });

      const doc2: MarkdownDocument = {
        id: "doc2",
        hash: "hash2",
        content: "# Doc 2\nLinks to [[doc1]]",
        frontmatter: {},
      };

      builder.addDocument(doc2);
      expect(builder.getStats()).toEqual({ nodeCount: 2, linkCount: 1 });
    });
  });

  describe("graph immutability", () => {
    it("should return a new graph object each time build() is called", () => {
      const document: MarkdownDocument = {
        id: "test-doc",
        hash: "hash123",
        content: "# Test Document",
        frontmatter: {},
      };

      builder.addDocument(document);

      const graph1 = builder.build();
      const graph2 = builder.build();

      expect(graph1).not.toBe(graph2);
      expect(graph1.nodes).not.toBe(graph2.nodes);
      expect(graph1.links).not.toBe(graph2.links);
      expect(graph1).toEqual(graph2);
    });

    it("should not affect existing graphs when builder is modified", () => {
      const doc1: MarkdownDocument = {
        id: "doc1",
        hash: "hash1",
        content: "# Document 1",
        frontmatter: {},
      };

      builder.addDocument(doc1);
      const graphSnapshot = builder.build();

      const doc2: MarkdownDocument = {
        id: "doc2",
        hash: "hash2",
        content: "# Document 2",
        frontmatter: {},
      };

      builder.addDocument(doc2);
      const newGraph = builder.build();

      expect(Object.keys(graphSnapshot.nodes)).toHaveLength(1);
      expect(Object.keys(newGraph.nodes)).toHaveLength(2);
    });
  });
});
