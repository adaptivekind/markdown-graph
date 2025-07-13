import { Graph } from "@adaptivekind/graph-schema";
import { toConfig } from "./config";
// eslint-disable-next-line sort-imports
import { GraphBuilder } from "./graph-builder";
import { toRepository } from "./repository-factory";
// eslint-disable-next-line sort-imports
import type { MarkdownRepository, RepositoryOptions } from "./types";

/**
 * Generate a graph from a markdown repository using the GraphBuilder
 */
async function generateGraph(repository: MarkdownRepository): Promise<Graph> {
  const builder = new GraphBuilder();

  for await (const reference of repository.findAll()) {
    const document = await repository.loadDocument(reference);
    builder.addDocument(document);
  }

  return builder.build();
}

/**
 * Create a garden (graph) from repository options
 */
export async function createGarden(options: RepositoryOptions) {
  const config = toConfig(options);
  const repository = toRepository(config);

  return {
    graph: await generateGraph(repository),
  };
}
