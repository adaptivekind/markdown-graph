import { Graph } from "@adaptivekind/graph-schema";
import { graphFrom } from "./feature-helpers";

const foo = `
# Foo

foo content

## Foo section

foo section content
`;

describe("multiple sections", () => {
  it("content with multiple sections should have multiple notes", async () => {
    const graph: Graph = await graphFrom({
      foo,
    });
    expect(Object.keys(graph.nodes)).toHaveLength(2);
    expect(graph.nodes.foo.label).toBe("Foo");
    expect(graph.nodes["foo#foo-section"].label).toBe("Foo section");
  });

  it("subsections should have parent-child links", async () => {
    const graph: Graph = await graphFrom({
      foo,
    });

    // Should have one parent-child link (subsection -> parent)
    const parentChildLinks = graph.links.filter(
      (link) => link.source === "foo#foo-section" && link.target === "foo",
    );
    expect(parentChildLinks).toHaveLength(1);
    expect(parentChildLinks[0].source).toBe("foo#foo-section");
    expect(parentChildLinks[0].target).toBe("foo");
  });
});
