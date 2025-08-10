import type { Garden, MarkdownRepository, RepositoryOptions } from "./types";
import { Graph } from "@adaptivekind/graph-schema";
import { GraphBuilder } from "./graph-builder";
import fs from "fs";
import path from "path";
import { toRepository } from "./repository-factory";

/**
 * Generate a graph from a markdown repository using the GraphBuilder
 * Optimized for concurrent file loading to improve performance
 */
async function generateGraph(
  repository: MarkdownRepository,
  options?: { justNodeNames?: boolean; noSections?: boolean },
): Promise<Graph> {
  const builder = new GraphBuilder(options);

  // Optimization: When both noSections and justNodeNames are true,
  // we only need document IDs and can skip file loading and parsing
  const canOptimize = options?.noSections && options?.justNodeNames;

  if (canOptimize) {
    // Fast path: only use document references (IDs) without loading content
    for await (const reference of repository.findAll()) {
      builder.addDocumentReference(reference);
    }
  } else {
    // Normal path: load and parse documents
    const promises = [];
    for await (const reference of repository.findAll())
      promises.push(
        repository.loadDocument(reference).then((document) => {
          builder.addDocument(document);
        }),
      );

    await Promise.all(promises);
  }

  return builder.build();
}

/**
 * Create a garden (graph) from repository options
 */
export async function createGarden(
  options: RepositoryOptions,
): Promise<Garden> {
  const repository = toRepository(options);
  const graph = await generateGraph(repository, {
    justNodeNames: options.justNodeNames,
    noSections: options.noSections,
  });

  // Determine the output path with default fallback
  const getOutputPath = (): string => {
    if (options.outputPath) {
      return options.outputPath;
    }

    // Default to .garden-graph.json in the garden directory
    const gardenDir = options.path || process.cwd();
    return path.join(gardenDir, ".garden-graph.json");
  };

  const outputPath = getOutputPath();

  return {
    graph,
    repository,
    save: async (): Promise<void> => {
      // Ensure the output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write graph to JSON file
      const jsonContent = JSON.stringify(graph, null, 2);
      fs.writeFileSync(outputPath, jsonContent);
    },
  };
}
