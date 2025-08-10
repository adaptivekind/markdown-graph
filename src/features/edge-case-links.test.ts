import { graphFrom } from "./feature-helpers";

const emptyLink = `
# Empty Link

Link with no content [](/link)
`;

describe("content with links with edge cases should be OK", () => {
  it("should load noad with links without content", async () => {
    const graph = await graphFrom({
      emptyLink,
    });
    expect(Object.keys(graph.nodes)).toHaveLength(1);
  });
});
