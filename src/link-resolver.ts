// Cache for link resolution to avoid repeated string operations
const linkCache = new Map<string, string>();

/**
 * Generate the link name given for the text. This is a common normalisation for
 * any text so that it can be referenced in a URL.
 *
 * Uses caching to improve performance for repeated calls.
 *
 * @param name - text to normalise to a link name
 * @returns normalised link name
 */
export const linkResolver = (name: string): string => {
  const cached = linkCache.get(name);
  if (cached !== undefined) return cached;

  const result = name
    .replace(/[ /\\.]/g, "-")
    .toLowerCase()
    // normalize according to NFD - canonical decompisition - https://unicode.org/reports/tr15/
    // NFD effectively removes accents and reduces variations on to single form
    // more suitable for URLs
    .normalize("NFD")
    .replace(/[^a-z0-9-]/g, "");

  linkCache.set(name, result);
  return result;
};
