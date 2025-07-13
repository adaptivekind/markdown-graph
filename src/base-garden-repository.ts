import { DocumentReference, MarkdownRepository } from "./types";
import { BaseItem } from "./base-item";
import { hash } from "./hash";

export class BaseMarkdownRepository implements MarkdownRepository {
  private content;

  constructor(content: { [key: string]: string }) {
    this.content = Object.fromEntries(
      Object.entries(content).map(([key, value]) => [key.toLowerCase(), value]),
    );
  }

  description() {
    return "base repository";
  }

  normalizeName(id: string) {
    return id.toLowerCase();
  }

  toDocumentReference(filename: string) {
    const matchName = /([^/]*).md$/.exec(filename);
    return {
      id: this.normalizeName(matchName ? matchName[1] : filename),
      hash: hash(filename),
    };
  }

  async loadDocument(reference: DocumentReference) {
    const id = reference.id;
    if (id in this.content) {
      return new BaseItem(reference, id, this.content[id]);
    }
    throw new Error(
      `Cannot load document ${id}: does not exist in ${this.description()}`,
    );
  }

  async *findAll(): AsyncIterable<DocumentReference> {
    for (const key in this.content) {
      yield this.toDocumentReference(key);
    }
  }
}
