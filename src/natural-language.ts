import Three from "compromise/types/view/three";
import nlp from "compromise";

interface Noun {
  adjectives: string[];
  root: string;
}

interface Term {
  noun: Noun;
}

// convenience function to filter out duplicates in an array
export const unique = (value: string, index: number, self: string[]) =>
  self.indexOf(value) === index;

const strip = (text: string) =>
  text.trim().replace(/\s/g, "-").replace(/[._]/g, "");

const symbols = "|;\\/:*\\p{Ps}\\p{Pe}\\p{S}";
const matchDashSymbols = /\p{Pd}/gu;
const matchIgnoreSymbols = /"/g;
const matchCleanUpSymbols = /\s\u064D/g;
const matchAlternativeSentanceEnd = /\|+/g;
const matchMultipleSpaces = /\s+/g;
const matchMultipleCommas = /,+/g;
const matchMultipleFullstops = /\.+/g;
// eslint-disable-next-line sonarjs/slow-regex
const matchSpacesBeforePunctuation = /(\s+)(?=[,.])/g;
const matchLeadingSymbols = new RegExp(`^[${symbols}\\p{Zs}]+`, "gu");
const matchTrailingSymbols = new RegExp(`[${symbols}\\p{Zs}]+$`, "gu");
const matchSymbols = new RegExp(`[${symbols}]`, "gu");
const matchApostropheNotContraction = /'(?!t|s|ve)/g;
const matchMarkdownUri = /(?<=])\(.*\)/g;
const matchCodeBlock = /`[^`]+`/g;

export const preStrip = (text: string) =>
  text
    .trim()
    .replace(matchMarkdownUri, "")
    .replace(matchCodeBlock, "")
    .replace(matchCleanUpSymbols, "")
    .replace(matchIgnoreSymbols, "")
    .replace(matchApostropheNotContraction, "")
    .replace(matchDashSymbols, " ")
    .replace(matchLeadingSymbols, "")
    .replace(matchAlternativeSentanceEnd, ". ")
    .replace(matchTrailingSymbols, ".")
    .replace(matchSymbols, ", ")
    .replace(matchSpacesBeforePunctuation, "")
    .replace(matchMultipleCommas, ",")
    .replace(matchMultipleFullstops, ".")
    .replace(matchMultipleSpaces, " ");

// Return array of aliases for words
export function naturalAliases(name: string): string[] {
  const one = nlp(name);
  return [
    ...nlp(one.nouns().isPlural().text()).nouns().toSingular().out("array"),
    ...nlp(one.verbs().text()).verbs().toInfinitive().out("array"),
  ];
}

const postStrip = /,|'s/g;

const allowedLinks = (name: string) => name.length > 1;

export function naturalProcess(
  content: string,
  excludes: string[] = [],
): { links: string[] } {
  const document = nlp(preStrip(content));
  const enhancedExcludes = [...excludes, "", ",", "s", "ing"];
  const links: string[] = (document.not("#Pronoun") as Three)
    .nouns()
    .toLowerCase()
    .json()
    .map((term: Term) => {
      const rawRoot = strip(term.noun.root);
      const root = rawRoot.replace(postStrip, "");
      if (term.noun.adjectives.length === 0) {
        return root;
      }
      return [
        root,
        ...term.noun.adjectives.map((adjective) => strip(adjective)),
        ...term.noun.adjectives.map((adjective) =>
          [strip(adjective), root].join("-"),
        ),
      ];
    })
    .flat()
    .filter(allowedLinks)
    .filter((name: string) => !enhancedExcludes.includes(name))
    .filter(unique)
    .map((name: string) => name);
  return { links };
}
