import { RepositoryConfigurationError } from "./errors";
// eslint-disable-next-line sort-imports
import { FileRepository } from "./file-repository";
import { InMemoryRepository } from "./memory-repository";
// eslint-disable-next-line sort-imports
import type { MarkdownRepository, RepositoryConfig } from "./types";

export function toRepository(config: RepositoryConfig): MarkdownRepository {
  if (config.type === "file") {
    if (!config.path) {
      throw new RepositoryConfigurationError(
        "File repository requires a path to be specified",
      );
    }
    return new FileRepository(config.path);
  }

  if (config.type === "inmemory") {
    return new InMemoryRepository(config.content || {});
  }

  throw new RepositoryConfigurationError(
    `Unknown repository type: ${config.type}`,
  );
}
