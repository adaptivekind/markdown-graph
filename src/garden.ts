import {
  ContentAtom,
  ContentMolecule,
  GardenConfig,
  GardenOptions,
  GardenRepository,
  MoleculeReference,
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
  reference: MoleculeReference,
): ContentMolecule => {
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
  for (const itemReference of repository.findAll()) {
    enrichGraph(graph, loadContentMolecule(repository, itemReference));
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
