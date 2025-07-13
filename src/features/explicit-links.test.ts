import { Link } from "@adaptivekind/graph-schema";
import { graphFrom } from "./feature-helpers";

const foo = `
# Foo

Foo content linking to [[bar]]
`;

const bar = `
# Bar

Bar content
`;

const toLinkTarget = (link: Link) => link.target;
const withSource = (id: string) => (link: Link) => link.source === id;

describe("content with explicit link to existing things", () => {
  it("should have links to existing things", async () => {
    const graph = await graphFrom({
      foo,
      bar,
    });
    expect(Object.keys(graph.nodes)).toHaveLength(2);
    expect(graph.nodes.foo.label).toBe("Foo");
    expect(graph.nodes.bar.label).toBe("Bar");
    expect(
      graph.links.filter(withSource("foo")).map(toLinkTarget),
    ).toStrictEqual(["bar"]);
  });
});
