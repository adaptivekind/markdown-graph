import { Graph } from "@adaptivekind/graph-schema";
import { graphFrom } from "./feature-helpers";

const foo = `---
foo: foo-value
a:
  aa: aa-value
---
# Foo

foo content
`;

describe("frontmatter", () => {
  it("should extra meta from frontmatter", async () => {
    const graph: Graph = await graphFrom({
      foo,
    });
    expect(graph.nodes?.foo.meta?.foo).toBe("foo-value");
    expect(graph.nodes?.foo.meta?.["a.aa"]).toBe("aa-value");
  });
});
