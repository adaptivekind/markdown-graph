import { RepositoryConfigurationError } from "./errors";
import { FileRepository } from "./file-repository";
import { InMemoryRepository } from "./memory-repository";
import type { MarkdownRepository, RepositoryOptions } from "./types";

export function toRepository(config: RepositoryOptions): MarkdownRepository {
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
