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
    const graph: Graph = graphFrom({
      foo,
    });
    expect(Object.keys(graph.nodes)).toHaveLength(2);
    expect(graph.nodes.foo.label).toBe("Foo");
    expect(graph.nodes["foo#foo-section"].label).toBe("Foo section");
  });
});
