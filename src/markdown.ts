import { unified } from "unified";
import remarkWikiLink from "remark-wiki-link";
import { toString } from "mdast-util-to-string";
import { Node, Parent } from "unist";
import { Content, Item, ItemMeta } from "./types";
import { Heading, Link, Literal } from "mdast";
import remarkParse from "remark-parse";
import { linkResolver } from "./link-resolver";

interface Section {
  children: Node[];
  sections: Section[];
  depth: number;
  title: string;
}

const isAngleBracketLink = (node: Node) =>
  node.type === "link" &&
  (node as Link).url === ((node as Parent).children[0] as Literal).value;

const justTextNodes = (node: Node) => !!node && !isAngleBracketLink(node);

const getFirstValue = (node: Node, filter: (node: Node) => boolean): string => {
  return toString((node as Parent).children.filter(filter));
};

const getFrontText = (node: Section, filter: (node: Node) => boolean) => {
  const firstParagraph = node.children.find(
    (node) => node.type === "paragraph",
  );
  if (firstParagraph) {
    return getFirstValue(firstParagraph, filter);
  }
  return null;
};

const extractTitle = (node: Section) => {
  const firstHeading = node.children.find((node) => node.type === "heading");
  if (!firstHeading) {
    return getFrontText(node, justTextNodes) ?? "no title";
  }

  return getFirstValue(firstHeading, justTextNodes);
};

const toSections = (root: Parent) => {
  const sections: Section[] = [
    { children: [], sections: [], depth: 1, title: "title-not-set" },
  ];
  let sectionCount = 1;
  let depth = 1;
  let foundHeading1 = false;
  let skip;
  const sectionStack: Section[] = new Array<Section>(6);
  sectionStack[0] = sections[0];
  root.children.forEach((node) => {
    skip = false;
    if ("depth" in node) {
      if ((node as Heading).depth > 1) {
        if (foundHeading1) {
          sectionCount++;
          depth = (node as Heading).depth;
        } else {
          skip = true;
        }
      } else {
        depth = 1;
        foundHeading1 = true;
      }
    }
    while (sections.length < sectionCount) {
      const section = {
        children: [],
        sections: [],
        depth,
        title: "section-title-not-set",
      };
      sections.push(section);
      sectionStack[depth - 1] = section;
      if (depth > 1) {
        const parentSection = sectionStack[depth - 2];
        if (parentSection) {
          parentSection.sections.push(section);
        }
      }
    }
    const section = depth === 1 ? sections[0] : sections[sectionCount - 1];
    if (!skip) {
      section.children.push(node);
    }
  });

  sections.forEach((section) => (section.title = extractTitle(section)));
  return sections;
};

const flattenParent = (parent: Parent): Node[] => {
  const children = parent.children;
  return children
    ? [
        ...children,
        ...children.map((child) => flattenParent(child as Parent)).flat(),
      ]
    : [];
};

const flatten = (section: Section): Node[] => {
  const children = section.children;
  return children
    ? [
        ...children,
        ...children.map((child) => flattenParent(child as Parent)).flat(),
      ]
    : [];
};

const extractName = (url: string) => {
  const match = /([^/]*?)(?:.md|\/)*$/.exec(url);
  return match ? match[1] : url;
};

export const toItemMeta = (item: Item, section: Section): ItemMeta => {
  const explicitLinks = flatten(section)
    .filter(
      (node) =>
        node.type === "wikiLink" ||
        (node.type === "link" && (node as Link).url.startsWith("./")),
    )
    .map((link) =>
      link.type === "wikiLink"
        ? linkResolver((link as Literal).value)
        : extractName((link as Link).url),
    );

  return {
    label: section.title,
    hash: item.hash,
    links: explicitLinks,
  };
};

export const parse = (item: Item): ItemMeta[] => {
  const root: Parent = unified()
    .use(remarkWikiLink, {
      hrefTemplate: (permalink: string) => `${permalink}`,
    })
    .use(remarkParse)
    .parse(item.content);

  return toSections(root).map((section) => toItemMeta(item, section));
};

export const loadItem = () => {};
