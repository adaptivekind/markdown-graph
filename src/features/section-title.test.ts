import { Graph } from "@adaptivekind/graph-schema";
import { graphFrom } from "./feature-helpers";

describe("section title", () => {
  it("should take title from first line", async () => {
    const graph: Graph = await graphFrom({
      foo: `foo content`,
    });
    expect(graph.nodes.foo.label).toBe("foo content");
  });
});
