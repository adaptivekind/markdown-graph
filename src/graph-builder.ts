import { Graph } from "@adaptivekind/graph-schema";
import { isEmpty } from "es-toolkit/compat";
import { linkResolver } from "./link-resolver";
import { parseMarkdownDocument } from "./markdown";
// eslint-disable-next-line sort-imports
import type { MarkdownDocument, MarkdownSection } from "./types";

export class GraphBuilder {
  private graph: Graph = {
    nodes: {},
    links: [],
  };

  /**
   * Add a markdown document to the graph
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
    if (section.depth === 1) {
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
   * Get the current graph state
   */
  build(): Graph {
    return {
      nodes: { ...this.graph.nodes },
      links: [...this.graph.links],
    };
  }

  /**
   * Reset the builder to start fresh
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
   */
  getStats(): { nodeCount: number; linkCount: number } {
    return {
      nodeCount: Object.keys(this.graph.nodes).length,
      linkCount: this.graph.links.length,
    };
  }
}
