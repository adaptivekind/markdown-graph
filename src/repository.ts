import { Graph } from "@adaptivekind/graph-schema";
import { RepositoryOptions } from "./types";

// Create the repository
export const createRepository = (options: RepositoryOptions) => {
  // Create the graph of the markdown content where each markdown item in the repository
  // is a single node, and any wiki-links in the markdown item is a link targetting the linked
  // markdown item.
  const graph: Graph = {
    nodes: {},
    links: [],
  };

  return {
    graph,
  };
};
