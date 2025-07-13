import fs from "fs";
import path from "path";
// eslint-disable-next-line sort-imports
import { BaseGardenRepository } from "./base-garden-repository";
import { BaseItem } from "./base-item";
import { hash } from "./hash";
// eslint-disable-next-line sort-imports
import type { MoleculeReference } from "./types";

export class FileGardenRepository extends BaseGardenRepository {
  private directoryPath: string;

  constructor(directoryPath: string) {
    super({});
    this.directoryPath = directoryPath;
    this.validateDirectory();
  }

  private validateDirectory(): void {
    if (!fs.existsSync(this.directoryPath)) {
      throw new Error(`Directory does not exist: ${this.directoryPath}`);
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
    const filePath = path.join(this.directoryPath, `${id}.md`);

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Cannot load ${id} since it does not exist in ${this.description()}`,
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return new BaseItem(reference, `${id}.md`, content);
  }

  // Method to get list of available files
  getAvailableFiles(): string[] {
    const files = fs.readdirSync(this.directoryPath);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));
    return markdownFiles.map((file) => this.normalizeName(file));
  }
}
