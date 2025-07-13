import { GardenConfig, GardenRepository, MoleculeReference } from "./types";
import { BaseItem } from "./base-item";
import { hash } from "./hash";
import { FileGardenRepository } from "./file-garden-repository";

export const toRepository = (config: GardenConfig): GardenRepository => {
  if (config.type === "file") {
    if (!config.path) {
      throw new Error("File repository requires a path to be specified");
    }
    return new FileGardenRepository(config.path);
  }
  return new BaseGardenRepository(config.content);
};

export class BaseGardenRepository implements GardenRepository {
  private content;

  constructor(content: { [key: string]: string }) {
    this.content = Object.fromEntries(
      Object.entries(content).map(([key, value]) => [key.toLowerCase(), value]),
    );
  }

  description() {
    return "base repository";
  }

  normaliseName(id: string) {
    return id.toLowerCase();
  }

  toMoleculeReference(filename: string) {
    const matchName = /([^/]*).md$/.exec(filename);
    return {
      id: this.normaliseName(matchName ? matchName[1] : filename),
      hash: hash(filename),
    };
  }

  loadContentMolecule(reference: MoleculeReference) {
    const id = reference.id;
    if (id in this.content) {
      return new BaseItem(reference, id, this.content[id]);
    }
    throw `Cannot load ${id} since does not exist in ${this.description()}`;
  }
}
