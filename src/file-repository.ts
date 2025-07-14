import {
  DirectoryNotFoundError,
  FileNotFoundError,
  MarkdownParsingError,
} from "./errors";
import type {
  DocumentReference,
  MarkdownDocument,
  MarkdownRepository,
} from "./types";
import { BaseItem } from "./base-item";
import fs from "fs";
import { hash } from "./hash";
import path from "path";

/**
 * Configuration options for FileRepository
 */
export interface FileRepositoryOptions {
  /** Directory patterns to exclude from scanning */
  excludes?: string[];
  /** Whether to include hidden files and directories */
  includeHidden?: boolean;
}

class FileDocumentReference implements DocumentReference {
  constructor(
    public readonly id: string,
    public readonly filename: string,
    public readonly hash: string,
  ) {}
}

/**
 * File system based repository for accessing markdown documents
 *
 * Scans a directory recursively for markdown files and provides access
 * to their content. Supports filtering options to exclude certain directories
 * and control hidden file inclusion.
 *
 * @example
 * ```typescript
 * const repository = new FileRepository('./docs', {
 *   excludes: ['node_modules', 'dist'],
 *   includeHidden: false
 * });
 *
 * for await (const ref of repository.findAll()) {
 *   const document = await repository.loadDocument(ref);
 *   console.log(document.content);
 * }
 * ```
 */
export class FileRepository implements MarkdownRepository {
  private readonly options: Required<FileRepositoryOptions>;

  constructor(
    private readonly directory: string,
    options: FileRepositoryOptions = {},
  ) {
    this.options = {
      excludes: ["node_modules", "dist"],
      includeHidden: false,
      ...Object.fromEntries(
        Object.entries(options).filter(([, value]) => value != undefined),
      ),
    };
  }

  private async validateDirectory(): Promise<void> {
    try {
      await fs.promises.access(this.directory);
    } catch {
      throw new DirectoryNotFoundError(this.directory);
    }
  }

  toDocumentReference(filename: string): DocumentReference {
    const normalizedId = this.normalizeFilename(filename);
    return new FileDocumentReference(normalizedId, filename, hash(filename));
  }

  private normalizeFilename(filename: string): string {
    // Remove .md extension and normalize path separators
    const withoutExtension = filename.replace(/\.md$/, "");
    // Replace path separators with dashes to create a valid ID
    return withoutExtension.replace(/[/\\]/g, "-").toLowerCase();
  }

  async loadDocument(reference: DocumentReference): Promise<MarkdownDocument> {
    if (!(reference instanceof FileDocumentReference)) {
      throw new Error("Invalid reference type for FileRepository");
    }

    const filepath = path.join(this.directory, reference.filename);

    try {
      const content = await fs.promises.readFile(filepath, "utf8");
      return new BaseItem(reference, reference.filename, content);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "ENOENT"
      ) {
        throw new FileNotFoundError(filepath);
      }
      throw new MarkdownParsingError(reference.filename, error as Error);
    }
  }

  async *findAll(): AsyncIterable<DocumentReference> {
    await this.validateDirectory(); // Lazy validation
    yield* this.findMarkdownFilesRecursively(this.directory);
  }

  private shouldScanDirectory(directoryName: string): boolean {
    if (this.options.excludes.includes(directoryName)) {
      return false;
    }
    if (!this.options.includeHidden && directoryName.startsWith(".")) {
      return false;
    }
    return true;
  }

  private async *findMarkdownFilesRecursively(
    dir: string,
  ): AsyncIterable<DocumentReference> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (this.shouldScanDirectory(entry.name)) {
            yield* this.findMarkdownFilesRecursively(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          const relativePath = path.relative(this.directory, fullPath);
          yield this.toDocumentReference(relativePath);
        }
      }
    } catch (error) {
      // Log error but continue processing other directories
      // eslint-disable-next-line no-console
      console.warn(`Warning: Could not read directory ${dir}:`, error);
    }
  }
}
