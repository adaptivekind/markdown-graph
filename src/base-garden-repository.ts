import { GardenConfig, GardenRepository, ItemReference } from "./types";
import { BaseItem } from "./base-item";
import { hash } from "./hash";

export const toRepository = (config: GardenConfig): GardenRepository => {
  if (config.type === "file") {
    throw Error("File repository not yet implemented");
  }
  return new BaseGardenRepository(config.content);
};

export class BaseGardenRepository implements GardenRepository {
  private content;

  constructor(content: { [key: string]: string } = {}) {
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

  toItemReference(id: string) {
    const matchName = /([^/]*).md$/.exec(id);
    return {
      id: this.normaliseName(matchName ? matchName[1] : id),
      hash: hash(id),
    };
  }

  toUri(itemReference: ItemReference) {
    return itemReference.id;
  }

  loadContentItem(itemReference: ItemReference) {
    const name = itemReference.id;
    if (name in this.content) {
      return new BaseItem(itemReference, name, this.content[name]);
    }
    throw `Cannot load ${name} since does not exist in ${this.description()}`;
  }
}
