import { Graph } from "@adaptivekind/graph-schema";
import { RepositoryOptions } from "./types";

export const createRepository = (options: RepositoryOptions) => {
  const graph: Graph = {
    nodes: {},
    links: [],
  };

  return {
    graph,
  };
};
