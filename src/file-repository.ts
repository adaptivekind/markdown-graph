import fs from "fs";
import path from "path";
// eslint-disable-next-line sort-imports
import { BaseItem } from "./base-item";
// eslint-disable-next-line sort-imports
import {
  DirectoryNotFoundError,
  FileNotFoundError,
  MarkdownParsingError,
} from "./errors";
import { hash } from "./hash";
// eslint-disable-next-line sort-imports
import type {
  DocumentReference,
  MarkdownDocument,
  MarkdownRepository,
} from "./types";

export interface FileRepositoryOptions {
  excludes?: string[];
  includeHidden?: boolean;
}

class FileDocumentReference implements DocumentReference {
  constructor(
    public readonly id: string,
    public readonly filename: string,
    public readonly hash: string,
  ) {}
}

export class FileRepository implements MarkdownRepository {
  private readonly options: Required<FileRepositoryOptions>;

  constructor(
    private readonly directory: string,
    options: FileRepositoryOptions = {},
  ) {
    this.options = {
      excludes: ["node_modules", "dist"],
      includeHidden: false,
      ...options,
    };
    this.validateDirectory();
  }

  private validateDirectory(): void {
    if (!fs.existsSync(this.directory)) {
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
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new FileNotFoundError(filepath);
      }
      throw new MarkdownParsingError(reference.filename, error as Error);
    }
  }

  async *findAll(): AsyncIterable<DocumentReference> {
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
