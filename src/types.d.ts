import { Graph } from "@adaptivekind/graph-schema";

// A MarkdownDocument represents a parsed markdown file with its content and metadata.
// It contains the raw markdown content and extracted frontmatter.

export interface MarkdownDocument {
  id: string;
  filename?: string;
  hash: string;
  content: string;
  frontmatter: Record<string, string>;
}

// A MarkdownSection represents a section within a markdown document.
// It contains the section title, links found in that section, and its heading depth.

export interface MarkdownSection {
  title: string;
  hash: string;
  links: string[];
  depth: number;
  brief?: string;
}

// A DocumentReference is a lightweight reference to a markdown document.
export interface DocumentReference {
  id: string;
  hash: string;
}

export type RepositoryConfig = {
  content: { [id: string]: string };
  type: "file" | "inmemory";
  path?: string; // Directory path for file repository
  justNodeNames?: boolean; // When true, only include node names without metadata or links
  noSections?: boolean; // When true, only include document nodes, not section nodes
  outputPath?: string; // Path to save the garden graph JSON file, defaults to .garden-graph.json
};

export type RepositoryOptions = Partial<RepositoryConfig>;

// Repository interface for accessing markdown documents.
export interface MarkdownRepository {
  toDocumentReference: (id: string) => DocumentReference;
  find: (id: string) => Promise<MarkdownDocument>;
  loadDocument: (reference: DocumentReference) => Promise<MarkdownDocument>;
  findAll: () => AsyncIterable<DocumentReference>;
}

export type Garden = {
  graph: Graph;
  repository: MarkdownRepository;
  save: () => Promise<void>;
};

export function createGarden(options: RepositoryOptions): Promise<Garden>;
