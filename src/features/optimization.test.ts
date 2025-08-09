import { createGarden } from "../garden";
import { parseMarkdownDocument } from "../markdown";

// Mock the parseMarkdownDocument function to verify it's not called
jest.mock("../markdown", () => ({
  parseMarkdownDocument: jest.fn(),
}));

const mockedParseMarkdownDocument =
  parseMarkdownDocument as jest.MockedFunction<typeof parseMarkdownDocument>;

const testMarkdownContent = {
  note1: `# Note 1

This is some content with [[note2]] link.

## Section 1.1

More content here.`,

  note2: `# Note 2

This references back to [[note1]].

## Section 2.1

Some metadata content.`,

  note3: `# Note 3

Independent note with no sections.`,
};

describe("optimization for noSections + justNodeNames", () => {
  beforeEach(() => {
    mockedParseMarkdownDocument.mockClear();
  });

  it("should skip markdown parsing when both noSections and justNodeNames are true", async () => {
    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      noSections: true,
      justNodeNames: true,
    });

    const graph = garden.graph;

    // Should have the correct nodes
    expect(Object.keys(graph.nodes)).toHaveLength(3);
    expect("note1" in graph.nodes).toBe(true);
    expect("note2" in graph.nodes).toBe(true);
    expect("note3" in graph.nodes).toBe(true);

    // Nodes should be empty (no metadata)
    for (const [, node] of Object.entries(graph.nodes)) {
      expect(Object.keys(node)).toHaveLength(0);
    }

    // Should have no links
    expect(graph.links).toHaveLength(0);

    // Most importantly: parseMarkdownDocument should NOT have been called
    expect(mockedParseMarkdownDocument).not.toHaveBeenCalled();
  });

  it("should parse markdown normally when only noSections is true", async () => {
    // Import the real implementation for this test
    const { parseMarkdownDocument: realParseMarkdownDocument } =
      jest.requireActual("../markdown");
    mockedParseMarkdownDocument.mockImplementation(realParseMarkdownDocument);

    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      noSections: true,
      justNodeNames: false,
    });

    const graph = garden.graph;

    // Should have nodes with metadata
    expect(Object.keys(graph.nodes)).toHaveLength(3);
    expect(graph.nodes.note1.label).toBe("Note 1");

    // parseMarkdownDocument should have been called
    expect(mockedParseMarkdownDocument).toHaveBeenCalled();
  });

  it("should parse markdown normally when only justNodeNames is true", async () => {
    // Import the real implementation for this test
    const { parseMarkdownDocument: realParseMarkdownDocument } =
      jest.requireActual("../markdown");
    mockedParseMarkdownDocument.mockImplementation(realParseMarkdownDocument);

    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      noSections: false,
      justNodeNames: true,
    });

    const graph = garden.graph;

    // Should have nodes including sections
    expect(Object.keys(graph.nodes).length).toBeGreaterThan(3);

    // parseMarkdownDocument should have been called
    expect(mockedParseMarkdownDocument).toHaveBeenCalled();
  });

  it("should parse markdown normally when both options are false", async () => {
    // Import the real implementation for this test
    const { parseMarkdownDocument: realParseMarkdownDocument } =
      jest.requireActual("../markdown");
    mockedParseMarkdownDocument.mockImplementation(realParseMarkdownDocument);

    const garden = await createGarden({
      content: testMarkdownContent,
      type: "inmemory",
      noSections: false,
      justNodeNames: false,
    });

    const graph = garden.graph;

    // Should have full nodes with metadata and sections
    expect(Object.keys(graph.nodes).length).toBeGreaterThan(3);
    expect(graph.nodes.note1.label).toBe("Note 1");
    expect(graph.links.length).toBeGreaterThan(0);

    // parseMarkdownDocument should have been called
    expect(mockedParseMarkdownDocument).toHaveBeenCalled();
  });
});
