import fs from "fs";
import path from "path";
// eslint-disable-next-line sort-imports
import { BaseGardenRepository } from "./base-garden-repository";
import { BaseItem } from "./base-item";
import { hash } from "./hash";
// eslint-disable-next-line sort-imports
import type { MoleculeReference } from "./types";

export class FileItemReference implements MoleculeReference {
  id: string;
  filename;
  hash;

  constructor(id: string, filename: string) {
    this.id = id;
    this.filename = filename;
    this.hash = hash(filename);
  }
}

export class FileItem extends BaseItem {
  constructor(reference: FileItemReference, directory: string) {
    const content = fs.readFileSync(
      path.join(directory, reference.filename),
      "utf8",
    );
    super(reference, reference.filename, content);
  }
}

export class FileGardenRepository extends BaseGardenRepository {
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

  toMoleculeReference(filename: string): MoleculeReference {
    return new FileItemReference(this.normalizeName(filename), filename);
  }

  async loadContentMolecule(reference: MoleculeReference) {
    if (reference instanceof FileItemReference) {
      return new FileItem(reference, this.directory);
    }
    return super.loadContentMolecule(reference);
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
  ): AsyncIterable<MoleculeReference> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.shouldScanDirectory(entry.name)) {
          // Recursively scan subdirectories
          yield* this.findMarkdownFilesRecursively(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        yield this.toMoleculeReference(path.relative(this.directory, fullPath));
      }
    }
  }
}
