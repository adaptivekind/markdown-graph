import {
  DocumentReference,
  MarkdownDocument,
  MarkdownRepository,
  MarkdownSection,
  RepositoryOptions,
} from "./types";
import { Graph } from "@adaptivekind/graph-schema";
import { isEmpty } from "es-toolkit/compat";
import { linkResolver } from "./link-resolver";
import { parseMarkdownDocument } from "./markdown";
import { toConfig } from "./config";
import { toRepository } from "./repository-factory";

const enrichGraph = (graph: Graph, document: MarkdownDocument) => {
  const sections = parseMarkdownDocument(document);
  sections.forEach((section: MarkdownSection) => {
    const id =
      document.id +
      (section.depth == 1 ? "" : "#" + linkResolver(section.title));
    graph.nodes[id] = {
      label: section.title,
      meta: isEmpty(document.frontmatter)
        ? undefined
        : (document.frontmatter as { [name: string]: string }),
    };

    section.links.forEach((target) => {
      graph.links.push({ source: document.id, target: target });
    });
  });
};

const loadMarkdownDocument = async (
  repository: MarkdownRepository,
  reference: DocumentReference,
): Promise<MarkdownDocument> => {
  return await repository.loadDocument(reference);
};

// .
const generateGraph = async (
  repository: MarkdownRepository,
): Promise<Graph> => {
  const graph: Graph = {
    nodes: {},
    links: [],
  };
  for await (const reference of repository.findAll()) {
    const document = await loadMarkdownDocument(repository, reference);
    enrichGraph(graph, document);
  }

  return graph;
};

export const createGarden = async (options: RepositoryOptions) => {
  const config = toConfig(options);
  const repository = toRepository(config);

  return {
    graph: await generateGraph(repository),
  };
};
