import { graphFrom } from "./feature-helpers";
import { Graph } from "@adaptivekind/graph-schema";

const thing = `
# Thing

Thing content
`;

describe("generate graph", () => {
  it("empty repository should have no notes", async () => {
    const graph: Graph = await graphFrom({});
    expect(Object.keys(graph.nodes)).toHaveLength(0);
  });

  it("repository should have a single note", async () => {
    const graph: Graph = await graphFrom({
      thing,
    });
    expect(Object.keys(graph.nodes)).toHaveLength(1);
  });
});
