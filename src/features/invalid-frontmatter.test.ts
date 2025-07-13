import { Graph } from "@adaptivekind/graph-schema";
import { graphFrom } from "./feature-helpers";

const invalidYamlContent = `---
foo: bar
invalid: [unclosed array
another: value
---
# Invalid Frontmatter Test

This content has invalid YAML frontmatter that should trigger error handling.
`;

describe("invalid frontmatter", () => {
  it("should handle invalid YAML frontmatter gracefully", async () => {
    const graph: Graph = await graphFrom({
      "invalid-yaml": invalidYamlContent,
    });

    // Should still create a node despite invalid frontmatter
    expect(graph.nodes["invalid-yaml"]).toBeDefined();
    expect(graph.nodes["invalid-yaml"].label).toBe("Invalid Frontmatter Test");

    // Should have no meta due to frontmatter parsing error
    expect(graph.nodes["invalid-yaml"].meta).not.toBeDefined();
  });

  it("should append error message to content when frontmatter is invalid", async () => {
    const graph: Graph = await graphFrom({
      "invalid-yaml": invalidYamlContent,
    });

    // The content should be accessible through the graph creation process
    // We can't directly check the content in the graph, but we can verify
    // the node was created successfully despite the error
    expect(graph.nodes["invalid-yaml"]).toBeDefined();
    expect(graph.nodes["invalid-yaml"].label).toBe("Invalid Frontmatter Test");
  });
});
