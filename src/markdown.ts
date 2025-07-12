import { ContentMolecule, ContentAtom } from "./types";
import { Heading, Link, Literal } from "mdast";
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
}

// Autolink is like <https://foo.com> see
// https://daringfireball.net/projects/markdown/syntax#autolink
const isAutoLink = (node: Node) =>
  node.type === "link" &&
  (node as Link).url === ((node as Parent).children[0] as Literal).value;

const isRegularTextNode = (node: Node) => !!node && !isAutoLink(node);

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
  return null;
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

const convertMarkdownToSections = (markdownRoot: Parent) => {
  const sections: Section[] = [
    { children: [], sections: [], depth: 1, title: "title-not-set" },
  ];
  let totalSectionCount = 1;
  let currentHeadingDepth = 1;
  let hasFoundMainHeading = false;
  let shouldSkipNode;
  const nestedSectionStack: Section[] = new Array<Section>(6);
  nestedSectionStack[0] = sections[0];
  markdownRoot.children.forEach((node) => {
    shouldSkipNode = false;
    if ("depth" in node) {
      if ((node as Heading).depth > 1) {
        if (hasFoundMainHeading) {
          totalSectionCount++;
          currentHeadingDepth = (node as Heading).depth;
        } else {
          shouldSkipNode = true;
        }
      } else {
        currentHeadingDepth = 1;
        hasFoundMainHeading = true;
      }
    }
    while (sections.length < totalSectionCount) {
      const newSection = {
        children: [],
        sections: [],
        depth: currentHeadingDepth,
        title: "section-title-not-set",
      };
      sections.push(newSection);
      nestedSectionStack[currentHeadingDepth - 1] = newSection;
      if (currentHeadingDepth > 1) {
        const parentSection = nestedSectionStack[currentHeadingDepth - 2];
        if (parentSection) {
          parentSection.sections.push(newSection);
        }
      }
    }
    const targetSection =
      currentHeadingDepth === 1 ? sections[0] : sections[totalSectionCount - 1];
    if (!shouldSkipNode) {
      targetSection.children.push(node);
    }
  });

  sections.forEach((section) => (section.title = extractSectionTitle(section)));
  return sections;
};

const getAllNodesFromParent = (parentNode: Parent): Node[] => {
  const directChildren = parentNode.children;
  return directChildren
    ? [
        ...directChildren,
        ...directChildren
          .map((child) => getAllNodesFromParent(child as Parent))
          .flat(),
      ]
    : [];
};

const getAllNodesFromSection = (section: Section): Node[] => {
  const sectionChildren = section.children;
  return sectionChildren
    ? [
        ...sectionChildren,
        ...sectionChildren
          .map((child) => getAllNodesFromParent(child as Parent))
          .flat(),
      ]
    : [];
};

const extractFileNameFromUrl = (url: string) => {
  const fileNameMatch = /([^/]*?)(?:.md|\/)*$/.exec(url);
  return fileNameMatch ? fileNameMatch[1] : url;
};

const createItemMetaFromSection = (
  item: ContentMolecule,
  section: Section,
): ContentAtom => {
  const foundLinks = getAllNodesFromSection(section)
    .filter(
      (node) =>
        node.type === "wikiLink" ||
        (node.type === "link" && (node as Link).url.startsWith("./")),
    )
    .map((linkNode) =>
      linkNode.type === "wikiLink"
        ? linkResolver((linkNode as Literal).value)
        : extractFileNameFromUrl((linkNode as Link).url),
    );

  return {
    label: section.title,
    hash: item.hash,
    links: foundLinks,
    depth: section.depth,
  };
};

export const parseContentMolecule = (
  molecule: ContentMolecule,
): ContentAtom[] => {
  const markdownSyntaxTree: Parent = unified()
    .use(remarkWikiLink, {
      hrefTemplate: (permalink: string) => `${permalink}`,
    })
    .use(remarkParse)
    .parse(molecule.content);

  return convertMarkdownToSections(markdownSyntaxTree).map((section) =>
    createItemMetaFromSection(molecule, section),
  );
};
