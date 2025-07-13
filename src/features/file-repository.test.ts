import { createGarden } from "../garden";

describe("file repository", () => {
  it("should throw error when path is not provided", async () => {
    await expect(async () => {
      await createGarden({
        type: "file",
        content: {},
      });
    }).rejects.toThrow("File repository requires a path to be specified");
  });

  it("should throw error for non-existent directory", async () => {
    await expect(async () => {
      await createGarden({
        type: "file",
        path: "/non/existent/directory",
      });
    }).rejects.toThrow("Directory does not exist: /non/existent/directory");
  });
});
