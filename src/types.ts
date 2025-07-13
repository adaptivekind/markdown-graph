// A ContentMolecule is a block of content. It may lead to the addition of
// multiple nodes and links to a graph.

export interface ContentMolecule {
  id: string;
  filename?: string;
  hash: string;
  content: string;
  meta: {
    [name: string]: string;
  };
}

// A ContentAtom is meta data that describes each part of the ContentMolecule.
// It can be used to add a node and links to a graph.

export interface ContentAtom {
  label: string;
  hash: string;
  links: Array<string>;
  depth: number;
}

export interface MoleculeReference {
  id: string;
  hash: string;
}

export type GardenConfig = {
  content: { [id: string]: string };
  type: "file" | "inmemory";
  path?: string; // Directory path for file repository
};

export type GardenOptions = Partial<GardenConfig>;

export interface GardenRepository {
  toMoleculeReference: (id: string) => MoleculeReference;
  loadContentMolecule: (itemReference: MoleculeReference) => ContentMolecule;
  findAll: () => MoleculeReference[];
}
