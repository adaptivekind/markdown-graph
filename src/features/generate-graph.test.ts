import { Graph } from "@adaptivekind/graph-schema";
import { graphFrom } from "./feature-helpers";

const foo = `
# Foo

foo content
`;

describe("generate graph", () => {
  it("empty repository should have no notes", async () => {
    const graph: Graph = await graphFrom({});
    expect(Object.keys(graph.nodes)).toHaveLength(0);
  });

  it("single content repository should have a single note", async () => {
    const graph: Graph = await graphFrom({
      foo,
    });
    expect(Object.keys(graph.nodes)).toHaveLength(1);
    expect(graph.nodes.foo.label).toBe("Foo");
  });
});
