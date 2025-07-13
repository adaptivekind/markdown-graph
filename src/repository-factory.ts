import type { MarkdownRepository, RepositoryConfig } from "./types";

import { BaseMarkdownRepository } from "./base-garden-repository";
import { FileMarkdownRepository } from "./file-garden-repository";

export const toRepository = (config: RepositoryConfig): MarkdownRepository => {
  if (config.type === "file") {
    if (!config.path) {
      throw new Error("File repository requires a path to be specified");
    }
    return new FileMarkdownRepository(config.path);
  }
  return new BaseMarkdownRepository(config.content);
};
