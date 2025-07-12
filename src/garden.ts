import {
  GardenConfig,
  GardenOptions,
  GardenRepository,
  Item,
  ItemMeta,
} from "./types";
import { BaseGardenRepository } from "./base-garden-repository";
import { Graph } from "@adaptivekind/graph-schema";
import { linkResolver } from "./link-resolver";
import { parseMarkdownItemToMetadata } from "./markdown";

const toRepository = (config: GardenConfig): GardenRepository => {
  if (config.type === "file") {
    throw Error("File repository not yet implemented");
  }
  return new BaseGardenRepository(config.content);
};

const defaultConfig: GardenConfig = {
  type: "file",
  content: {},
};

const toConfig = (options: GardenOptions): GardenConfig => {
  return {
    ...defaultConfig,
    ...options,
  };
};

const loadItemIntoGraph = (graph: Graph, item: Item) => {
  const itemMetaList = parseMarkdownItemToMetadata(item);
  itemMetaList.forEach((itemMeta: ItemMeta) => {
    const id =
      item.id + (itemMeta.depth == 1 ? "" : "#" + linkResolver(itemMeta.label));
    graph.nodes[id] = {
      label: itemMeta.label,
    };

    itemMeta.links.forEach((target) => {
      graph.links.push({ source: item.id, target: target });
    });
  });
};

const loadItem = (repository: GardenRepository, filename: string): Item => {
  const itemReference = repository.toItemReference(filename);
  return repository.load(itemReference);
};

const generateGraph = (
  repository: GardenRepository,
  config: GardenConfig,
): Graph => {
  const graph: Graph = {
    nodes: {},
    links: [],
  };
  if (Object.keys(config.content).length > 0) {
    for (const id in config.content) {
      loadItemIntoGraph(graph, loadItem(repository, `${id}.md`));
    }
  }
  return graph;
};

// Create the repository
export const createGarden = (options: GardenOptions) => {
  const config = toConfig(options);
  const repository = toRepository(config);

  // Create the graph of the markdown content where each markdown item in the repository
  // is a single node, and any wiki-links in the markdown item is a link targetting the linked
  // markdown item.
  const graph: Graph = {
    nodes: {},
    links: [],
  };

  // Process the content if provided
  if (options.content) {
    for (const [filename] of Object.entries(options.content)) {
      graph.nodes[filename] = {};
    }
  }

  return {
    graph: generateGraph(repository, config),
  };
};
