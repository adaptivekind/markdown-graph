import {
  ContentAtom,
  ContentMolecule,
  GardenConfig,
  GardenOptions,
  GardenRepository,
} from "./types";
import { Graph } from "@adaptivekind/graph-schema";
import { isEmpty } from "es-toolkit/compat";
import { linkResolver } from "./link-resolver";
import { parseContentMolecule } from "./markdown";
import { toConfig } from "./config";
import { toRepository } from "./repository-factory";

const enrichGraph = (graph: Graph, molecule: ContentMolecule) => {
  const atoms = parseContentMolecule(molecule);
  atoms.forEach((atom: ContentAtom) => {
    const id =
      molecule.id + (atom.depth == 1 ? "" : "#" + linkResolver(atom.label));
    graph.nodes[id] = {
      label: atom.label,
      meta: isEmpty(molecule.meta) ? undefined : molecule.meta,
    };

    atom.links.forEach((target) => {
      graph.links.push({ source: molecule.id, target: target });
    });
  });
};

const loadContentMolecule = (
  repository: GardenRepository,
  filename: string,
): ContentMolecule => {
  const reference = repository.toMoleculeReference(filename);
  return repository.loadContentMolecule(reference);
};

const generateGraph = (
  repository: GardenRepository,
  config: GardenConfig,
): Graph => {
  const graph: Graph = {
    nodes: {},
    links: [],
  };

  if (config.type === "file") {
    // For file repositories, get available files from the repository
    const files = repository.getAvailableFiles?.() || [];
    for (const id of files) {
      enrichGraph(graph, loadContentMolecule(repository, `${id}.md`));
    }
  } else if (Object.keys(config.content).length > 0) {
    // For content-based repositories
    for (const id in config.content) {
      enrichGraph(graph, loadContentMolecule(repository, `${id}.md`));
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
