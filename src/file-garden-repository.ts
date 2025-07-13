import fs from "fs";
import path from "path";
import { GardenRepository, MoleculeReference } from "./types";
import { BaseItem } from "./base-item";
import { hash } from "./hash";

export class FileGardenRepository implements GardenRepository {
  private directoryPath: string;
  private fileCache: Map<string, string> = new Map();

  constructor(directoryPath: string) {
    this.directoryPath = directoryPath;
    this.loadMarkdownFiles();
  }

  private loadMarkdownFiles(): void {
    if (!fs.existsSync(this.directoryPath)) {
      throw new Error(`Directory does not exist: ${this.directoryPath}`);
    }

    const files = fs.readdirSync(this.directoryPath);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));

    for (const file of markdownFiles) {
      const filePath = path.join(this.directoryPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const id = this.normalizeName(file);
      this.fileCache.set(id, content);
    }
  }

  description(): string {
    return `file repository at ${this.directoryPath}`;
  }

  normalizeName(filename: string): string {
    const matchName = /([^/]*?)\.md$/.exec(filename);
    const name = matchName ? matchName[1] : filename;
    return name.toLowerCase();
  }

  toMoleculeReference(filename: string): MoleculeReference {
    return {
      id: this.normalizeName(filename),
      hash: hash(filename),
    };
  }

  loadContentMolecule(reference: MoleculeReference) {
    const id = reference.id;
    const content = this.fileCache.get(id);

    if (content === undefined) {
      throw new Error(
        `Cannot load ${id} since it does not exist in ${this.description()}`,
      );
    }

    return new BaseItem(reference, `${id}.md`, content);
  }

  // Method to refresh the file cache (useful for watching file changes)
  refresh(): void {
    this.fileCache.clear();
    this.loadMarkdownFiles();
  }

  // Method to get list of available files
  getAvailableFiles(): string[] {
    return Array.from(this.fileCache.keys());
  }
}
