import { createGarden } from "../garden";

describe("file repository", () => {
  it("should throw error when initializing file repository", () => {
    expect(() => {
      createGarden({
        type: "file",
        content: {},
      });
    }).toThrow("File repository not yet implemented");
  });
});
