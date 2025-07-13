import type { MarkdownRepository, RepositoryOptions } from "./types";
import { Graph } from "@adaptivekind/graph-schema";
import { GraphBuilder } from "./graph-builder";
import { toRepository } from "./repository-factory";

/**
 * Generate a graph from a markdown repository using the GraphBuilder
 * Optimized for concurrent file loading to improve performance
 */
async function generateGraph(repository: MarkdownRepository): Promise<Graph> {
  const builder = new GraphBuilder();

  // Collect all references first to enable concurrent processing
  const references = [];
  for await (const reference of repository.findAll()) {
    references.push(reference);
  }

  // Process files concurrently with controlled concurrency
  const CONCURRENCY_LIMIT = 10;
  const documents = [];

  for (let i = 0; i < references.length; i += CONCURRENCY_LIMIT) {
    const batch = references.slice(i, i + CONCURRENCY_LIMIT);
    const batchDocuments = await Promise.all(
      batch.map((ref) => repository.loadDocument(ref)),
    );
    documents.push(...batchDocuments);
  }

  // Add all documents to the builder
  documents.forEach((document) => builder.addDocument(document));

  return builder.build();
}

/**
 * Create a garden (graph) from repository options
 */
export async function createGarden(options: RepositoryOptions) {
  const repository = toRepository(options);

  return {
    graph: await generateGraph(repository),
  };
}
