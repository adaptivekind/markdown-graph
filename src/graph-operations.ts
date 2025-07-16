import type { MarkdownDocument, MarkdownSection } from "./types";
import { isEmpty } from "es-toolkit/compat";
import { linkResolver } from "./link-resolver";

// Constants for graph building
export const ROOT_SECTION_DEPTH = 1;

/**
 * Create a unique node ID for a section within a document
 */
export function createNodeId(
  document: MarkdownDocument,
  section: { depth: number; title: string },
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
export function createNodeMeta(
  document: MarkdownDocument,
): { [name: string]: string } | undefined {
  if (isEmpty(document.frontmatter)) {
    return undefined;
  }
  // Cast to expected type for graph schema compatibility
  return document.frontmatter as { [name: string]: string };
}

/**
 * Create a node object from a document and section
 */
export function createNode(
  document: MarkdownDocument,
  section: MarkdownSection,
): { id: string; node: { label: string; meta?: { [name: string]: string } } } {
  const nodeId = createNodeId(document, section);
  return {
    id: nodeId,
    node: {
      label: section.title,
      meta: createNodeMeta(document),
    },
  };
}

/**
 * Create explicit links from a section
 */
export function createExplicitLinks(
  document: MarkdownDocument,
  section: MarkdownSection,
): Array<{ source: string; target: string }> {
  const sourceNodeId = createNodeId(document, section);
  return section.links.map((target) => ({
    source: sourceNodeId,
    target: target,
  }));
}

/**
 * Create parent-child link if section is a subsection
 */
export function createParentLink(
  document: MarkdownDocument,
  section: MarkdownSection,
): { source: string; target: string } | null {
  if (section.depth === ROOT_SECTION_DEPTH) {
    // Root sections have no parent
    return null;
  }

  const childNodeId = createNodeId(document, section);
  const parentNodeId = document.id; // Parent is always the document root

  return {
    source: childNodeId,
    target: parentNodeId,
  };
}

/**
 * Get statistics about a graph
 */
export function getGraphStats(graph: {
  nodes: { [key: string]: unknown };
  links: Array<unknown>;
}): { nodeCount: number; linkCount: number } {
  return {
    nodeCount: Object.keys(graph.nodes).length,
    linkCount: graph.links.length,
  };
}
