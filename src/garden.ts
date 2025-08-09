import type { Garden, MarkdownRepository, RepositoryOptions } from "./types";
import { Graph } from "@adaptivekind/graph-schema";
import { GraphBuilder } from "./graph-builder";
import { toRepository } from "./repository-factory";

/**
 * Generate a graph from a markdown repository using the GraphBuilder
 * Optimized for concurrent file loading to improve performance
 */
async function generateGraph(repository: MarkdownRepository): Promise<Graph> {
  const builder = new GraphBuilder();

  const promises = [];
  for await (const reference of repository.findAll())
    promises.push(
      repository.loadDocument(reference).then((document) => {
        builder.addDocument(document);
      }),
    );

  await Promise.all(promises);
  return builder.build();
}

/**
 * Create a garden (graph) from repository options
 */
export async function createGarden(
  options: RepositoryOptions,
): Promise<Garden> {
  const repository = toRepository(options);

  return {
    graph: await generateGraph(repository),
  };
}
