import { createGarden } from "../garden";

const foo = `
# Foo

foo content
`;

describe("file garden repository", () => {
  it("should get content from memory repository", async () => {
    const garden = await createGarden({
      content: { foo },
      type: "inmemory",
    });

    const document = await garden.repository.find("foo");
    expect(document).toBeDefined();
    expect(document.content).toContain("Foo");
  });
});
