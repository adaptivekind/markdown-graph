import { graphFrom } from "./feature-helpers";
import { Graph } from "@adaptivekind/graph-schema";

const thing = `
# Thing

Thing content
`;

describe("generate graph", () => {
  it("should have a simple note", async () => {
    const graph: Graph = await graphFrom({
      thing,
    });
    expect(Object.keys(graph.nodes)).toHaveLength(1);
  });
});
