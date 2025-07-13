import { createGarden } from "../garden";

describe("file repository", () => {
  it("should throw error when path is not provided", () => {
    expect(() => {
      createGarden({
        type: "file",
        content: {},
      });
    }).toThrow("File repository requires a path to be specified");
  });

  it("should throw error for non-existent directory", () => {
    expect(() => {
      createGarden({
        type: "file",
        path: "/non/existent/directory",
      });
    }).toThrow("Directory does not exist: /non/existent/directory");
  });
});
