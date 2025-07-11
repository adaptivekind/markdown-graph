import { Graph } from "@adaptivekind/graph-schema";
import { RepositoryOptions } from "./types";
import { BaseItem } from "./base-item";

// Create the repository
export const createRepository = (options: RepositoryOptions) => {
  // Create the graph of the markdown content where each markdown item in the repository
  // is a single node, and any wiki-links in the markdown item is a link targetting the linked
  // markdown item.
  const graph: Graph = {
    nodes: {},
    links: [],
  };

  // Process the content if provided
  if (options.content) {
    for (const [filename, content] of Object.entries(options.content)) {
      graph.nodes[filename] = {};
    }
  }

  return {
    graph,
  };
};
