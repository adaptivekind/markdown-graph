export interface Item {
  id: string;
  filename?: string;
  hash: string;
  content: string;
}

export interface ItemMeta {
  label: string;
  hash: string;
  links: Array<string>;
  depth: number;
}

export interface ItemReference {
  id: string;
  hash: string;
}

export type RepositoryType = "file" | "inmemory";

export type GardenConfig = {
  content: { [id: string]: string };
  type: RepositoryType;
};

export type GardenOptions = Partial<GardenConfig>;

export interface GardenRepository {
  toItemReference: (id: string) => ItemReference;
  load: (itemReference: ItemReference) => Item;
}
