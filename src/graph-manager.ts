import type { MarkdownDocument, MarkdownRepository } from "./types";
import { createNodeId, getGraphStats } from "./graph-operations";
import { Graph } from "@adaptivekind/graph-schema";
import { GraphBuilder } from "./graph-builder";
import { parseMarkdownDocument } from "./markdown";
import path from "path";

interface DocumentNodeMapping {
  documentId: string;
  nodeIds: string[];
  filePath: string;
}

/**
 * Manages incremental updates to a graph structure based on file changes
 *
 * This class maintains a mapping between files and the graph nodes they generate,
 * allowing for efficient updates when individual files change rather than
 * regenerating the entire graph.
 */
export class GraphManager {
  private graph: Graph = { nodes: {}, links: [] };
  private documentMappings = new Map<string, DocumentNodeMapping>();
  private repository: MarkdownRepository;
  private baseDirectory: string;

  constructor(repository: MarkdownRepository, baseDirectory: string) {
    this.repository = repository;
    this.baseDirectory = baseDirectory;
  }

  /**
   * Initialize the graph by processing all documents in the repository
   */
  async initialize(): Promise<Graph> {
    const builder = new GraphBuilder();
    this.documentMappings.clear();

    for await (const reference of this.repository.findAll()) {
      try {
        const document = await this.repository.loadDocument(reference);
        builder.addDocument(document);
        this.trackDocumentNodes(document, reference.id);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to load document ${reference.id}:`, error);
      }
    }

    this.graph = builder.build();
    return this.getGraph();
  }

  /**
   * Update the graph for a specific file that has changed
   */
  async updateFile(filePath: string): Promise<Graph> {
    try {
      // Normalize the file path to get the document ID
      const relativePath = this.getRelativePathFromAbsolute(filePath);
      const documentRef = this.repository.toDocumentReference(relativePath);

      // Remove existing nodes for this document
      this.removeDocumentNodes(documentRef.id);

      // Load and add the updated document
      const document = await this.repository.loadDocument(documentRef);
      this.addDocumentToGraph(document);
      this.trackDocumentNodes(document, documentRef.id, filePath);

      return this.getGraph();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to update file ${filePath}:`, error);
      return this.getGraph();
    }
  }

  /**
   * Remove a file from the graph
   */
  removeFile(filePath: string): Graph {
    const relativePath = this.getRelativePathFromAbsolute(filePath);
    const documentRef = this.repository.toDocumentReference(relativePath);
    this.removeDocumentNodes(documentRef.id);
    return this.getGraph();
  }

  /**
   * Get the current graph state
   */
  getGraph(): Graph {
    return {
      nodes: { ...this.graph.nodes },
      links: [...this.graph.links],
    };
  }

  /**
   * Track which nodes belong to a document
   */
  private trackDocumentNodes(
    document: MarkdownDocument,
    documentId: string,
    filePath?: string,
  ): void {
    const sections = parseMarkdownDocument(document);
    const nodeIds = sections.map((section) => createNodeId(document, section));

    this.documentMappings.set(documentId, {
      documentId,
      nodeIds,
      filePath: filePath || documentId,
    });
  }

  /**
   * Add a document to the existing graph using GraphBuilder
   */
  private addDocumentToGraph(document: MarkdownDocument): void {
    // Create a temporary builder to get the document's graph representation
    const tempBuilder = new GraphBuilder();
    tempBuilder.addDocument(document);
    const documentGraph = tempBuilder.build();

    // Merge the document's nodes and links into the main graph
    Object.assign(this.graph.nodes, documentGraph.nodes);
    this.graph.links.push(...documentGraph.links);
  }

  /**
   * Remove all nodes and links for a specific document
   */
  private removeDocumentNodes(documentId: string): void {
    const mapping = this.documentMappings.get(documentId);
    if (!mapping) return;

    // Remove nodes
    mapping.nodeIds.forEach((nodeId) => {
      delete this.graph.nodes[nodeId];
    });

    // Remove links where any of this document's nodes are source or target
    this.graph.links = this.graph.links.filter((link) => {
      const sourceIsFromDocument = mapping.nodeIds.includes(link.source);
      const targetIsFromDocument = mapping.nodeIds.includes(link.target);
      return !sourceIsFromDocument && !targetIsFromDocument;
    });

    // Remove the mapping
    this.documentMappings.delete(documentId);
  }

  /**
   * Convert absolute file path to relative path for document reference
   */
  private getRelativePathFromAbsolute(filePath: string): string {
    return path.relative(this.baseDirectory, filePath);
  }

  /**
   * Get statistics about the current graph
   */
  getStats(): { nodeCount: number; linkCount: number } {
    return getGraphStats(this.graph);
  }
}
