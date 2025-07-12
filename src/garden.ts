import {
  GardenConfig,
  GardenOptions,
  GardenRepository,
  ContentItem,
  ItemMeta,
} from "./types";
import { Graph } from "@adaptivekind/graph-schema";
import { linkResolver } from "./link-resolver";
import { parseMarkdownItemToMetadata } from "./markdown";
import { toConfig } from "./config";
import { toRepository } from "./base-garden-repository";

const loadItemIntoGraph = (graph: Graph, item: ContentItem) => {
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

const loadContentItem = (
  repository: GardenRepository,
  filename: string,
): ContentItem => {
  const itemReference = repository.toItemReference(filename);
  return repository.loadContentItem(itemReference);
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
      loadItemIntoGraph(graph, loadContentItem(repository, `${id}.md`));
    }
  }
  return graph;
};

export const createGarden = (options: GardenOptions) => {
  const config = toConfig(options);
  const repository = toRepository(config);

  return {
    graph: generateGraph(repository, config),
  };
};
