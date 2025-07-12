import { graphFrom } from "./feature-helpers";
import { Graph } from "@adaptivekind/graph-schema";

const foo = `
# foo

foo content
`;

const bar = `
# bar

bar content
`;

describe("generate graph", () => {
  it("empty repository should have no notes", async () => {
    const graph: Graph = graphFrom({});
    expect(Object.keys(graph.nodes)).toHaveLength(0);
  });

  it("single content repository should have a single note", async () => {
    const graph: Graph = graphFrom({
      foo,
    });
    expect(Object.keys(graph.nodes)).toHaveLength(1);
  });
});
