import { Heading, Link, Literal } from "mdast";
import { MarkdownDocument, MarkdownSection } from "./types";
import { Node, Parent } from "unist";
import { linkResolver } from "./link-resolver";
import remarkParse from "remark-parse";
import remarkWikiLink from "remark-wiki-link";
import { toString } from "mdast-util-to-string";
import { unified } from "unified";

interface Section {
  children: Node[];
  sections: Section[];
  depth: number;
  title: string;
  brief?: string; // brief content for the section
}

// Autolink is like <https://foo.com> see
// https://daringfireball.net/projects/markdown/syntax#autolink
const isAutoLink = (node: Node) =>
  node.type === "link" &&
  (node as Link).url === ((node as Parent).children[0] as Literal)?.value;

const isRegularTextNode = (node: Node) => !!node && !isAutoLink(node);

const isWikiLink = (node: Node) => node.type === "wikiLink";

const isTextNodeWithoutWikiLinks = (node: Node) =>
  !!node && !isWikiLink(node) && !isAutoLink(node);

const extractTextFromNode = (
  node: Node,
  filter: (node: Node) => boolean,
): string => {
  return toString((node as Parent).children.filter(filter));
};

const extractTextFromFirstParagraph = (
  section: Section,
  filter: (node: Node) => boolean,
) => {
  const firstParagraph = section.children.find(
    (node) => node.type === "paragraph",
  );
  if (firstParagraph) {
    return extractTextFromNode(firstParagraph, filter);
  }
  return undefined;
};

const extractSectionTitle = (section: Section) => {
  const firstHeading = section.children.find((node) => node.type === "heading");
  if (!firstHeading) {
    return (
      extractTextFromFirstParagraph(section, isRegularTextNode) ?? "no title"
    );
  }

  return extractTextFromNode(firstHeading, isRegularTextNode);
};

// Markdown processing constants
const MAX_HEADING_DEPTH = 6;
const ROOT_SECTION_DEPTH = 1;
const ROOT_SECTION_INDEX = 0;
const INITIAL_SECTION_COUNT = 1;
const H1_HEADING_DEPTH = 1;

interface SectionParsingState {
  sections: Section[];
  sectionCount: number;
  currentHeadingDepth: number;
  foundMainHeading: boolean;
  nestedSectionStack: Section[];
}

/**
 * Initialize the parsing state with a root section
 */
const initializeSectionParsingState = (): SectionParsingState => {
  const rootSection: Section = {
    children: [],
    sections: [],
    depth: ROOT_SECTION_DEPTH,
    title: "title-not-set",
  };

  const nestedSectionStack = new Array<Section>(MAX_HEADING_DEPTH);
  nestedSectionStack[ROOT_SECTION_INDEX] = rootSection;

  return {
    sections: [rootSection],
    sectionCount: INITIAL_SECTION_COUNT,
    currentHeadingDepth: ROOT_SECTION_DEPTH,
    foundMainHeading: false,
    nestedSectionStack,
  };
};

/**
 * Check if a node is a heading and update parsing state accordingly
 */
const processHeadingNode = (
  node: Node,
  state: SectionParsingState,
): boolean => {
  if (!("depth" in node)) {
    return false; // Not skipping, process normally
  }

  const headingDepth = (node as Heading).depth;

  if (headingDepth > H1_HEADING_DEPTH) {
    if (state.foundMainHeading) {
      state.sectionCount++;
      state.currentHeadingDepth = headingDepth;
      return false; // Don't skip
    } else {
      return true; // Skip this node - we haven't found main heading yet
    }
  } else {
    // This is an h1 heading
    state.currentHeadingDepth = H1_HEADING_DEPTH;
    state.foundMainHeading = true;
    return false; // Don't skip
  }
};

/**
 * Create new sections as needed to match the current section count
 */
const ensureSectionsExist = (state: SectionParsingState): void => {
  while (state.sections.length < state.sectionCount) {
    const newSection: Section = {
      children: [],
      sections: [],
      depth: state.currentHeadingDepth,
      title: "section-title-not-set",
    };

    state.sections.push(newSection);
    state.nestedSectionStack[state.currentHeadingDepth - 1] = newSection;

    // Link to parent section if this is a nested section
    if (state.currentHeadingDepth > H1_HEADING_DEPTH) {
      const parentSection =
        state.nestedSectionStack[state.currentHeadingDepth - 2];
      if (parentSection) {
        parentSection.sections.push(newSection);
      }
    }
  }
};

/**
 * Get the target section for adding the current node
 */
const getTargetSection = (state: SectionParsingState): Section => {
  return state.currentHeadingDepth === H1_HEADING_DEPTH
    ? state.sections[ROOT_SECTION_INDEX]
    : state.sections[state.sectionCount - 1];
};

/**
 * Extract sections from markdown syntax tree
 */
const toSections = (markdownSyntaxTree: Parent): Section[] => {
  const state = initializeSectionParsingState();

  markdownSyntaxTree.children.forEach((node) => {
    const shouldSkipNode = processHeadingNode(node, state);

    ensureSectionsExist(state);

    if (!shouldSkipNode) {
      const targetSection = getTargetSection(state);
      targetSection.children.push(node);
    }
  });

  // Set titles for all sections
  state.sections.forEach((section) => {
    section.title = extractSectionTitle(section);
  });

  return state.sections;
};

const getAllNodesFromSection = (section: Section): Node[] => {
  // Optimized section node collection
  const collectedNodes: Node[] = [];
  const nodeQueue: Node[] = [...section.children];

  while (nodeQueue.length > 0) {
    const currentNode = nodeQueue.shift()!;
    collectedNodes.push(currentNode);

    if ("children" in currentNode && currentNode.children) {
      nodeQueue.push(...(currentNode.children as Node[]));
    }
  }

  return collectedNodes;
};

const extractFileNameFromUrl = (url: string) => {
  // Remove trailing slashes and .md extensions, then get the last path component
  let cleanUrl = url;
  while (cleanUrl.endsWith("/")) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  if (cleanUrl.endsWith(".md")) {
    cleanUrl = cleanUrl.slice(0, -3);
  }
  const lastSlashIndex = cleanUrl.lastIndexOf("/");
  return lastSlashIndex === -1
    ? cleanUrl
    : cleanUrl.substring(lastSlashIndex + 1);
};

const toMarkdownSection = (
  document: MarkdownDocument,
  section: Section,
): MarkdownSection => {
  // Single-pass link extraction for better performance
  const extractedLinks: string[] = [];
  const nodes = getAllNodesFromSection(section);

  for (const node of nodes) {
    if (node.type === "wikiLink") {
      extractedLinks.push(linkResolver((node as Literal).value));
    } else if (node.type === "link" && (node as Link).url.startsWith("./")) {
      extractedLinks.push(extractFileNameFromUrl((node as Link).url));
    }
  }

  return {
    title: section.title,
    hash: document.hash,
    links: extractedLinks,
    depth: section.depth,
    brief: extractTextFromFirstParagraph(section, isTextNodeWithoutWikiLinks),
  };
};

// Shared parser instance to avoid repeated instantiation overhead
const sharedParser = unified()
  .use(remarkWikiLink, {
    hrefTemplate: (permalink: string) => `${permalink}`,
  })
  .use(remarkParse);

export const parseMarkdownDocument = (
  document: MarkdownDocument,
): MarkdownSection[] => {
  const markdownSyntaxTree: Parent = sharedParser.parse(document.content);

  return toSections(markdownSyntaxTree).map((section) =>
    toMarkdownSection(document, section),
  );
};
