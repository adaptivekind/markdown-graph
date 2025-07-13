import {
  ContentAtom,
  ContentMolecule,
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

const loadContentMolecule = async (
  repository: GardenRepository,
  reference: MoleculeReference,
): Promise<ContentMolecule> => {
  return await repository.loadContentMolecule(reference);
};

// .
const generateGraph = async (repository: GardenRepository): Promise<Graph> => {
  const graph: Graph = {
    nodes: {},
    links: [],
  };
  for await (const reference of repository.findAll()) {
    const molecule = await loadContentMolecule(repository, reference);
    enrichGraph(graph, molecule);
  }

  return graph;
};

export const createGarden = async (options: GardenOptions) => {
  const config = toConfig(options);
  const repository = toRepository(config);

  return {
    graph: await generateGraph(repository),
  };
};
