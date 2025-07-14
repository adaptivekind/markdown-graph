import type { MarkdownDocument, MarkdownSection } from "./types";
import { Graph } from "@adaptivekind/graph-schema";
import { isEmpty } from "es-toolkit/compat";
import { linkResolver } from "./link-resolver";
import { parseMarkdownDocument } from "./markdown";

// Constants for graph building
const ROOT_SECTION_DEPTH = 1;

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
      const nodeId = this.createNodeId(document, section);

      this.graph.nodes[nodeId] = {
        label: section.title,
        meta: this.createNodeMeta(document),
      };
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
      section.links.forEach((target) => {
        this.graph.links.push({
          source: document.id,
          target: target,
        });
      });
    });
  }

  /**
   * Create a unique node ID for a section within a document
   */
  private createNodeId(
    document: MarkdownDocument,
    section: MarkdownSection,
  ): string {
    if (section.depth === ROOT_SECTION_DEPTH) {
      // Top-level sections use the document ID
      return document.id;
    }
    // Subsections include the section title as a fragment
    return `${document.id}#${linkResolver(section.title)}`;
  }

  /**
   * Create metadata object for a node from document frontmatter
   */
  private createNodeMeta(
    document: MarkdownDocument,
  ): { [name: string]: string } | undefined {
    if (isEmpty(document.frontmatter)) {
      return undefined;
    }
    // Cast to expected type for graph schema compatibility
    return document.frontmatter as { [name: string]: string };
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
    return {
      nodeCount: Object.keys(this.graph.nodes).length,
      linkCount: this.graph.links.length,
    };
  }
}
