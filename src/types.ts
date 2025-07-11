export interface Item {
  name: string;
  filename?: string;
  hash: string;
  content: string;
}

export interface ItemReference {
  name: string;
  hash: string;
}

export type MetaData = {
  tags?: string[];
};

export type RepositoryType = "file" | "inmemory";

export type RepositoryConfig = {
  content: { [key: string]: string };
  type: RepositoryType;
};

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type RepositoryOptions = DeepPartial<RepositoryConfig>;
