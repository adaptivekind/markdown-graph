import { ContentMolecule, MoleculeReference } from "./types";
import matter, { GrayMatterFile } from "gray-matter";
import { MarkdownMessage } from "./mardown-message";

type Matter = GrayMatterFile<string> & {};

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
      data: {} as { [key: string]: any },
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

    Object.keys(itemMatter.data).forEach((key: string) => {
      this.meta[key] = `${itemMatter.data[key]}`;
    });
    this.content = itemMatter.content;
  }
}
