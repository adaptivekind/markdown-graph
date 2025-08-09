import type {
  DocumentReference,
  MarkdownDocument,
  MarkdownRepository,
} from "./types";
import { BaseItem } from "./base-item";
import { DocumentNotFoundError } from "./errors";
import { hash } from "./hash";

class InMemoryDocumentReference implements DocumentReference {
  constructor(
    public readonly id: string,
    public readonly hash: string,
  ) {}
}

/**
 * In-memory repository for accessing markdown documents
 *
 * Stores markdown content in memory as key-value pairs. Useful for testing
 * or when working with dynamically generated content that doesn't exist
 * on the file system.
 *
 * @example
 * ```typescript
 * const repository = new InMemoryRepository({
 *   'doc1': '# Document 1\nContent here',
 *   'doc2': '# Document 2\nMore content'
 * });
 *
 * const doc = await repository.loadDocument(
 *   repository.toDocumentReference('doc1')
 * );
 * ```
 */
export class InMemoryRepository implements MarkdownRepository {
  private readonly content: Map<string, string>;

  constructor(content: Record<string, string>) {
    // Normalize keys to lowercase for consistent lookup
    this.content = new Map(
      Object.entries(content).map(([key, value]) => [key.toLowerCase(), value]),
    );
  }

  toDocumentReference(id: string): DocumentReference {
    const normalizedId = this.normalizeId(id);
    return new InMemoryDocumentReference(normalizedId, hash(id));
  }

  private normalizeId(id: string): string {
    // Remove .md extension if present and normalize to lowercase
    return id.replace(/\.md$/, "").toLowerCase();
  }

  async loadDocument(reference: DocumentReference): Promise<MarkdownDocument> {
    const content = this.content.get(reference.id);

    if (content === undefined) {
      throw new DocumentNotFoundError(reference.id, "in-memory repository");
    }

    return new BaseItem(reference, reference.id, content);
  }

  async find(id: string): Promise<MarkdownDocument> {
    const reference = this.toDocumentReference(id);
    return this.loadDocument(reference);
  }

  async *findAll(): AsyncIterable<DocumentReference> {
    for (const key of this.content.keys()) {
      yield this.toDocumentReference(key);
    }
  }

  // Utility methods for testing and debugging
  size(): number {
    return this.content.size;
  }

  hasDocument(id: string): boolean {
    return this.content.has(this.normalizeId(id));
  }

  getDocumentIds(): string[] {
    return Array.from(this.content.keys());
  }
}
