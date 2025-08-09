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
    } catch (e: unknown) {
      throw new DirectoryNotFoundError(this.directory, e);
    }
  }

  toDocumentReference(filename: string): DocumentReference {
    const normalizedDocumentId = this.normalizeFilename(filename);
    return new FileDocumentReference(
      normalizedDocumentId,
      filename,
      hash(filename),
    );
  }

  private normalizeFilename(filename: string): string {
    // Use just then basename, remove .md extension and normalize path separators and lowercase
    return path.basename(filename).replace(/\.md$/, "").toLowerCase();
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
    return (
      !this.options.excludes.includes(directoryName) &&
      (this.options.includeHidden || !directoryName.startsWith("."))
    );
  }

  private async *findMarkdownFilesRecursively(
    dir: string,
  ): AsyncIterable<DocumentReference> {
    try {
      const directoryEntries = await fs.promises.readdir(dir, {
        withFileTypes: true,
      });

      for (const directoryEntry of directoryEntries) {
        const fullPath = path.join(dir, directoryEntry.name);

        if (directoryEntry.isDirectory()) {
          if (this.shouldScanDirectory(directoryEntry.name)) {
            yield* this.findMarkdownFilesRecursively(fullPath);
          }
        } else if (
          directoryEntry.isFile() &&
          directoryEntry.name.endsWith(".md")
        ) {
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
