import { RepositoryConfig, RepositoryOptions } from "./types";

const defaultConfig: RepositoryConfig = {
  type: "file",
  content: {},
};

export const toConfig = (options: RepositoryOptions): RepositoryConfig => {
  return {
    ...defaultConfig,
    ...options,
  };
};
