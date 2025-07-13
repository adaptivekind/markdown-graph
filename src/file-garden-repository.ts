import fs from "fs";
import path from "path";
// eslint-disable-next-line sort-imports
import { BaseGardenRepository } from "./base-garden-repository";
import { BaseItem } from "./base-item";
import { hash } from "./hash";
// eslint-disable-next-line sort-imports
import type { MoleculeReference } from "./types";

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
    return {
      id: this.normalizeName(filename),
      hash: hash(filename),
    };
  }

  loadContentMolecule(reference: MoleculeReference) {
    const id = reference.id;

    // Find the original file path by searching through all markdown files
    const allFiles = this.findMarkdownFilesRecursively(this.directory);
    const originalFile = allFiles.find(
      (file) => this.normalizeName(file) === id,
    );

    if (!originalFile) {
      throw new Error(
        `Cannot load ${id} since it does not exist in ${this.description()}`,
      );
    }

    const filePath = path.join(this.directory, originalFile);
    const content = fs.readFileSync(filePath, "utf-8");
    return new BaseItem(reference, originalFile, content);
  }

  findAll(): MoleculeReference[] {
    const markdownFiles = this.findMarkdownFilesRecursively(this.directory);
    return markdownFiles.map(this.toMoleculeReference.bind(this));
  }

  private shouldScanDirectory(relativeDirectoryName: string) {
    return (
      !this.excludes.includes(relativeDirectoryName) &&
      !relativeDirectoryName.startsWith(".")
    );
  }

  private findMarkdownFilesRecursively(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.shouldScanDirectory(entry.name)) {
          // Recursively scan subdirectories
          const subFiles = this.findMarkdownFilesRecursively(fullPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Get relative path from the repository root directory
        const relativePath = path.relative(this.directory, fullPath);
        files.push(relativePath);
      }
    }

    return files;
  }
}
