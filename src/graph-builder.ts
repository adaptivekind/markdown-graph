import type {
  DocumentReference,
  MarkdownDocument,
  MarkdownSection,
} from "./types";
import { Graph, Link } from "@adaptivekind/graph-schema";
import {
  createExplicitLinks,
  createNode,
  createParentLink,
  getGraphStats,
} from "./graph-operations";
import { naturalProcess } from "./natural-language";
import { parseMarkdownDocument } from "./markdown";

/**
 * Builder class for constructing graph structures from markdown documents
 *
 * The GraphBuilder follows the builder pattern, allowing incremental construction
 * of a graph by adding markdown documents one at a time. It handles the conversion
 * of markdown content into nodes and links in the graph structure.
 *
 * @example
 * ```typescript
 * const builder = new GraphBuilder();
 * builder.addDocument(document1)
 *        .addDocument(document2)
 *        .addDocument(document3);
 * const graph = builder.build();
 * ```
 */
export class GraphBuilder {
  private graph: Graph = {
    nodes: {},
    links: [],
  };

  private implicitLinks: Link[] = [];
  private justNodeNames: boolean;
  private noSections: boolean;

  constructor(options?: { justNodeNames?: boolean; noSections?: boolean }) {
    this.justNodeNames = options?.justNodeNames ?? false;
    this.noSections = options?.noSections ?? false;
  }

  /**
   * Add a document reference to the graph without parsing content
   *
   * This is an optimized method for when we only need node names without
   * metadata or links. Creates empty nodes based on document ID only.
   *
   * @param reference - The document reference to add
   * @returns this - For method chaining
   */
  addDocumentReference(reference: DocumentReference): this {
    // Only add if we're in the optimized mode (both options enabled)
    if (this.noSections && this.justNodeNames) {
      // Create a single empty node for the document
      this.graph.nodes[reference.id] = {};
    }
    return this;
  }

  /**
   * Add a markdown document to the graph
   *
   * Parses the document content to extract sections and creates corresponding
   * nodes and links in the graph. Each section becomes a node, and wiki-style
   * links ([[target]]) become edges in the graph.
   *
   * @param document - The markdown document to add
   * @returns this - For method chaining
   */
  addDocument(document: MarkdownDocument): this {
    try {
      const allSections = parseMarkdownDocument(document);

      // Filter sections if noSections is enabled (only keep depth 1 sections)
      const sections = this.noSections
        ? allSections.filter((section) => section.depth === 1)
        : allSections;

      this.addNodes(document, sections);
      this.addLinks(document, sections);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `Ignoring ${document.filename} since error during parsing`,
        error,
      );
    }
    return this;
  }

  /**
   * Add nodes for each section in the document
   */
  private addNodes(
    document: MarkdownDocument,
    sections: MarkdownSection[],
  ): void {
    if (this.justNodeNames) {
      // In justNodeNames mode, only create empty nodes with just the key
      sections.forEach((section) => {
        const { id } = createNode(document, section);
        this.graph.nodes[id] = {};
      });
    } else {
      // Normal mode: create nodes with full metadata
      sections.forEach((section) => {
        const { id, node } = createNode(document, section);
        this.graph.nodes[id] = node;
      });
    }
  }

  /**
   * Add links between sections
   */
  private addLinks(
    document: MarkdownDocument,
    sections: MarkdownSection[],
  ): void {
    if (this.justNodeNames) {
      // In justNodeNames mode, skip creating any links
      return;
    }

    sections.forEach((section) => {
      // Add explicit links
      const explicitLinks = createExplicitLinks(document, section);
      this.graph.links.push(...explicitLinks);

      // Add parent-child link for subsections
      const parentLink = createParentLink(document, section);
      if (parentLink) {
        this.graph.links.push(parentLink);
      }

      // Add implicit links from natural language processing
      if (section.brief) {
        const naturalLinks = naturalProcess(section.brief).links;
        for (const target of naturalLinks) {
          if (target != document.id) {
            this.implicitLinks.push({
              source: document.id,
              target: target,
            });
          }
        }
      }
    });
  }

  /**
   * Build and return the current graph state
   *
   * Returns a deep copy of the current graph to prevent external mutations.
   * The returned graph contains all nodes and links added through addDocument().
   *
   * @returns A copy of the current graph structure
   */
  build(): Graph {
    if (!this.justNodeNames) {
      // Only process implicit links in normal mode
      for (const implicitLink of this.implicitLinks) {
        if (implicitLink.target in this.graph.nodes) {
          this.graph.links.push(implicitLink);
        }
      }
    }

    return {
      nodes: { ...this.graph.nodes },
      links: [...this.graph.links],
    };
  }

  /**
   * Reset the builder to start fresh
   *
   * Clears all nodes and links from the current graph, allowing the builder
   * to be reused for constructing a new graph from scratch.
   *
   * @returns this - For method chaining
   */
  reset(): this {
    this.graph = {
      nodes: {},
      links: [],
    };
    this.implicitLinks = [];
    return this;
  }

  /**
   * Get statistics about the current graph
   *
   * Returns count information about the current state of the graph,
   * useful for monitoring progress during graph construction.
   *
   * @returns Object containing node and link counts
   */
  getStats(): { nodeCount: number; linkCount: number } {
    return getGraphStats(this.graph);
  }
}
