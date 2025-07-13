import { BaseItem } from "./base-item";
import { BaseMarkdownRepository } from "./base-garden-repository";
import type { DocumentReference } from "./types";
import fs from "fs";
import { hash } from "./hash";
import path from "path";

export class FileDocumentReference implements DocumentReference {
  id: string;
  filename;
  hash;

  constructor(id: string, filename: string) {
    this.id = id;
    this.filename = filename;
    this.hash = hash(filename);
  }
}

export class FileMarkdownDocument extends BaseItem {
  private constructor(
    reference: FileDocumentReference,
    filename: string,
    content: string,
  ) {
    super(reference, filename, content);
  }

  static async create(reference: FileDocumentReference, directory: string) {
    try {
      const content = await fs.promises.readFile(
        path.join(directory, reference.filename),
        "utf8",
      );
      return new FileMarkdownDocument(reference, reference.filename, content);
    } catch (error) {
      throw new Error(
        `Failed to read file ${reference.filename}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

export class FileMarkdownRepository extends BaseMarkdownRepository {
  private directory: string;
  private excludes = ["node_modules", "dist"];

  constructor(directory: string) {
    super({});
    this.directory = directory;
    this.validateDirectory();
  }

  private validateDirectory(): void {
    if (!fs.existsSync(this.directory)) {
      throw new Error(`Directory does not exist: ${this.directory}`);
    }
  }

  description(): string {
    return `file repository at ${this.directory}`;
  }

  normalizeName(filename: string): string {
    // Remove .md extension and normalize path separators
    const withoutExtension = filename.replace(/\.md$/, "");
    // Replace path separators with dashes to create a valid ID
    return withoutExtension.replace(/[/\\]/g, "-").toLowerCase();
  }

  toDocumentReference(filename: string): DocumentReference {
    return new FileDocumentReference(this.normalizeName(filename), filename);
  }

  async loadDocument(reference: DocumentReference) {
    if (reference instanceof FileDocumentReference) {
      return await FileMarkdownDocument.create(reference, this.directory);
    }
    return super.loadDocument(reference);
  }

  async *findAll() {
    yield* this.findMarkdownFilesRecursively(this.directory);
  }

  private shouldScanDirectory(relativeDirectoryName: string) {
    return (
      !this.excludes.includes(relativeDirectoryName) &&
      !relativeDirectoryName.startsWith(".")
    );
  }

  private async *findMarkdownFilesRecursively(
    dir: string,
  ): AsyncIterable<DocumentReference> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.shouldScanDirectory(entry.name)) {
          // Recursively scan subdirectories
          yield* this.findMarkdownFilesRecursively(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        yield this.toDocumentReference(path.relative(this.directory, fullPath));
      }
    }
  }
}
