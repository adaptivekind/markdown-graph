import { Graph, Link } from "@adaptivekind/graph-schema";
import type { MarkdownDocument, MarkdownSection } from "./types";
import {
  createExplicitLinks,
  createNode,
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
    const sections = parseMarkdownDocument(document);
    this.addNodes(document, sections);
    this.addLinks(document, sections);
    return this;
  }

  /**
   * Add nodes for each section in the document
   */
  private addNodes(
    document: MarkdownDocument,
    sections: MarkdownSection[],
  ): void {
    sections.forEach((section) => {
      const { id, node } = createNode(document, section);
      this.graph.nodes[id] = node;
    });
  }

  /**
   * Add links between sections
   */
  private addLinks(
    document: MarkdownDocument,
    sections: MarkdownSection[],
  ): void {
    sections.forEach((section) => {
      // Add explicit links
      const explicitLinks = createExplicitLinks(document, section);
      this.graph.links.push(...explicitLinks);

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
    for (const implicitLink of this.implicitLinks) {
      if (implicitLink.target in this.graph.nodes) {
        this.graph.links.push(implicitLink);
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
