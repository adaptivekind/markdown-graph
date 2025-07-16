import { Graph } from "@adaptivekind/graph-schema";
import { graphFrom } from "./feature-helpers";

describe("natural language", () => {
  it("should implicitly link to a mentioned node ", async () => {
    const graph: Graph = await graphFrom({
      dog: `# A dog\n\na dog, a cat and a fish are animals`,
      cat: `A cat`,
    });
    expect(graph.nodes.dog.label).toBe("A dog");
    expect(graph.links).toStrictEqual([{ source: "dog", target: "cat" }]);
  });
});
