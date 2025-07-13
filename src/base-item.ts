import { ContentMolecule, MoleculeReference } from "./types";
import matter, { GrayMatterFile } from "gray-matter";
import { MarkdownMessage } from "./mardown-message";

type Matter = GrayMatterFile<string> & {};

const flattenObject = (
  obj: Record<string, unknown>,
  prefix: string = "",
): { [key: string]: string } => {
  const flattened: { [key: string]: string } = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        // Recursively flatten nested objects
        Object.assign(
          flattened,
          flattenObject(value as Record<string, unknown>, newKey),
        );
      } else {
        // Convert to string for storage
        flattened[newKey] = String(value);
      }
    }
  }

  return flattened;
};

const safeMatter = (content: string) => {
  try {
    // Note that the gray matter API caches the results if there are no options.
    // In this system, caching is undesirable since it masks potential errors
    // and complicates reloading. Explicitly setting the language for the
    // frontmatter, other than setting our desired frontmatter also has the
    // desired side effect that caching is disabled.
    return matter(content, { language: "yaml" }) as Matter;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    return {
      data: {} as Record<string, unknown>,
      content:
        content +
        new MarkdownMessage("Frontmatter error", message).toMarkdown(),
    };
  }
};

export class BaseItem implements ContentMolecule {
  id: string;
  filename: string;
  content: string;
  hash: string;
  meta: {
    [name: string]: string;
  } = {};

  constructor(
    itemReference: MoleculeReference,
    filename: string,
    content: string,
  ) {
    this.filename = filename;
    this.id = itemReference.id;
    this.hash = itemReference.hash;

    const itemMatter = safeMatter(content);

    // Flatten the frontmatter data and store it in meta
    this.meta = flattenObject(itemMatter.data);
    this.content = itemMatter.content;
  }
}
