/**
 * Unit tests for repository implementations
 */

import {
  DirectoryNotFoundError,
  DocumentNotFoundError,
  FileNotFoundError,
} from "./errors";
import type { DocumentReference } from "./types";
import { FileRepository } from "./file-repository";
import { InMemoryRepository } from "./memory-repository";
import fs from "fs";
import os from "os";
import path from "path";

describe("FileRepository", () => {
  const nonExistentDir = "/non/existent/directory";

  describe("constructor", () => {
    it("should create repository for existing directory", () => {
      expect(() => new FileRepository(process.cwd())).not.toThrow();
    });

    it("should throw DirectoryNotFoundError for non-existent directory on first use", async () => {
      const repo = new FileRepository(nonExistentDir);

      // Directory validation is now lazy, so error occurs on first use
      const references = repo.findAll();
      await expect(references[Symbol.asyncIterator]().next()).rejects.toThrow(
        DirectoryNotFoundError,
      );
    });

    it("should use default options when none provided", () => {
      const repo = new FileRepository(process.cwd());
      expect(repo).toBeDefined();
    });

    it("should accept custom options", () => {
      const options = {
        excludes: ["custom_exclude"],
        includeHidden: true,
      };
      const repo = new FileRepository(process.cwd(), options);
      expect(repo).toBeDefined();
    });
  });

  describe("toDocumentReference", () => {
    let repository: FileRepository;

    beforeEach(() => {
      repository = new FileRepository(process.cwd());
    });

    it("should create reference with normalized ID", () => {
      const ref = repository.toDocumentReference(
        "test-file.md",
      ) as DocumentReference & { filename: string };

      expect(ref.id).toBe("test-file");
      expect(ref.filename).toBe("test-file.md");
      expect(ref.hash).toBeDefined();
    });

    it("should handle subdirectory paths", () => {
      const ref = repository.toDocumentReference(
        "subdir/test-file.md",
      ) as DocumentReference & { filename: string };

      expect(ref.id).toBe("test-file");
      expect(ref.filename).toBe("subdir/test-file.md");
    });

    it("should handle files without .md extension", () => {
      const ref = repository.toDocumentReference(
        "test-file",
      ) as DocumentReference & { filename: string };

      expect(ref.id).toBe("test-file");
      expect(ref.filename).toBe("test-file");
    });
  });

  describe("loadDocument", () => {
    let repository: FileRepository;
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "markdown-graph-test-repository-"),
      );
      repository = new FileRepository(tempDir);
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("should load existing markdown file", async () => {
      const content = "# Test File\nThis is test content.";
      const filePath = path.join(tempDir, "test.md");
      fs.writeFileSync(filePath, content);

      const ref = repository.toDocumentReference("test.md");
      const document = await repository.loadDocument(ref);

      expect(document.id).toBe("test");
      expect(document.content).toBe(content);
      expect(document.frontmatter).toEqual({});
    });

    it("should load file with frontmatter", async () => {
      const content = `---
title: Test Document
author: John Doe
---
# Test File
This is test content.`;
      const filePath = path.join(tempDir, "test.md");
      fs.writeFileSync(filePath, content);

      const ref = repository.toDocumentReference("test.md");
      const document = await repository.loadDocument(ref);

      expect(document.frontmatter.title).toBe("Test Document");
      expect(document.frontmatter.author).toBe("John Doe");
      expect(document.content).toContain("# Test File");
    });

    it("should throw FileNotFoundError for non-existent file", async () => {
      const ref = repository.toDocumentReference("non-existent.md");

      await expect(repository.loadDocument(ref)).rejects.toThrow(
        FileNotFoundError,
      );
    });

    it("should reject invalid reference type", async () => {
      const invalidRef: DocumentReference = {
        id: "test",
        hash: "hash123",
      };

      await expect(repository.loadDocument(invalidRef)).rejects.toThrow(
        "Invalid reference type for FileRepository",
      );
    });
  });

  describe("findAll", () => {
    let repository: FileRepository;
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync("test-repo-");
      repository = new FileRepository(tempDir);
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("should find no files in empty directory", async () => {
      const references = [];
      for await (const ref of repository.findAll()) {
        references.push(ref);
      }

      expect(references).toHaveLength(0);
    });

    it("should find markdown files in directory", async () => {
      fs.writeFileSync(path.join(tempDir, "file1.md"), "# File 1");
      fs.writeFileSync(path.join(tempDir, "file2.md"), "# File 2");
      fs.writeFileSync(path.join(tempDir, "not-md.txt"), "Not markdown");

      const references = [];
      for await (const ref of repository.findAll()) {
        references.push(ref);
      }

      expect(references).toHaveLength(2);
      const ids = references.map((ref) => ref.id);
      expect(ids).toContain("file1");
      expect(ids).toContain("file2");
    });

    it("should find files in subdirectories", async () => {
      const subDir = path.join(tempDir, "subdir");
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(tempDir, "root.md"), "# Root");
      fs.writeFileSync(path.join(subDir, "sub.md"), "# Sub");

      const references = [];
      for await (const ref of repository.findAll()) {
        references.push(ref);
      }

      expect(references).toHaveLength(2);
      const ids = references.map((ref) => ref.id);
      expect(ids).toContain("root");
      expect(ids).toContain("sub");
    });

    it("should exclude specified directories", async () => {
      const excludeDir = path.join(tempDir, "node_modules");
      fs.mkdirSync(excludeDir);
      fs.writeFileSync(path.join(tempDir, "include.md"), "# Include");
      fs.writeFileSync(path.join(excludeDir, "exclude.md"), "# Exclude");

      const references = [];
      for await (const ref of repository.findAll()) {
        references.push(ref);
      }

      expect(references).toHaveLength(1);
      expect(references[0].id).toBe("include");
    });

    it("should exclude hidden directories by default", async () => {
      const hiddenDir = path.join(tempDir, ".hidden");
      fs.mkdirSync(hiddenDir);
      fs.writeFileSync(path.join(tempDir, "visible.md"), "# Visible");
      fs.writeFileSync(path.join(hiddenDir, "hidden.md"), "# Hidden");

      const references = [];
      for await (const ref of repository.findAll()) {
        references.push(ref);
      }

      expect(references).toHaveLength(1);
      expect(references[0].id).toBe("visible");
    });

    it("should include hidden directories when option is set", async () => {
      const hiddenDir = path.join(tempDir, ".hidden");
      fs.mkdirSync(hiddenDir);
      fs.writeFileSync(path.join(tempDir, "visible.md"), "# Visible");
      fs.writeFileSync(path.join(hiddenDir, "hidden.md"), "# Hidden");

      const repository = new FileRepository(tempDir, { includeHidden: true });
      const references = [];
      for await (const ref of repository.findAll()) {
        references.push(ref);
      }

      expect(references).toHaveLength(2);
      const ids = references.map((ref) => ref.id);
      expect(ids).toContain("visible");
      expect(ids).toContain("hidden");
    });
  });
});

describe("InMemoryRepository", () => {
  describe("constructor", () => {
    it("should create empty repository", () => {
      const repository = new InMemoryRepository({});
      expect(repository.size()).toBe(0);
    });

    it("should create repository with content", () => {
      const content = {
        doc1: "# Document 1",
        doc2: "# Document 2",
      };
      const repository = new InMemoryRepository(content);
      expect(repository.size()).toBe(2);
    });

    it("should normalize keys to lowercase", () => {
      const content = {
        DOC1: "# Document 1",
        Doc2: "# Document 2",
      };
      const repository = new InMemoryRepository(content);

      expect(repository.hasDocument("doc1")).toBe(true);
      expect(repository.hasDocument("doc2")).toBe(true);
      expect(repository.hasDocument("DOC1")).toBe(true);
      expect(repository.hasDocument("Doc2")).toBe(true);
    });
  });

  describe("toDocumentReference", () => {
    let repository: InMemoryRepository;

    beforeEach(() => {
      repository = new InMemoryRepository({});
    });

    it("should create reference with normalized ID", () => {
      const ref = repository.toDocumentReference("Test-Doc.md");

      expect(ref.id).toBe("test-doc");
      expect(ref.hash).toBeDefined();
    });

    it("should remove .md extension", () => {
      const ref = repository.toDocumentReference("document.md");
      expect(ref.id).toBe("document");
    });

    it("should handle IDs without extension", () => {
      const ref = repository.toDocumentReference("document");
      expect(ref.id).toBe("document");
    });
  });

  describe("loadDocument", () => {
    let repository: InMemoryRepository;

    beforeEach(() => {
      const content = {
        doc1: "# Document 1\nContent here.",
        doc2: `---
title: Document 2
---
# Document 2`,
      };
      repository = new InMemoryRepository(content);
    });

    it("should load existing document", async () => {
      const ref = repository.toDocumentReference("doc1");
      const document = await repository.loadDocument(ref);

      expect(document.id).toBe("doc1");
      expect(document.content).toBe("# Document 1\nContent here.");
      expect(document.frontmatter).toEqual({});
    });

    it("should load document with frontmatter", async () => {
      const ref = repository.toDocumentReference("doc2");
      const document = await repository.loadDocument(ref);

      expect(document.frontmatter.title).toBe("Document 2");
      expect(document.content).toContain("# Document 2");
    });

    it("should throw DocumentNotFoundError for non-existent document", async () => {
      const ref = repository.toDocumentReference("non-existent");

      await expect(repository.loadDocument(ref)).rejects.toThrow(
        DocumentNotFoundError,
      );
    });

    it("should handle case-insensitive lookup", async () => {
      const ref = repository.toDocumentReference("DOC1");
      const document = await repository.loadDocument(ref);

      expect(document.id).toBe("doc1");
      expect(document.content).toBe("# Document 1\nContent here.");
    });
  });

  describe("findAll", () => {
    it("should return empty iterator for empty repository", async () => {
      const repository = new InMemoryRepository({});
      const references = [];

      for await (const ref of repository.findAll()) {
        references.push(ref);
      }

      expect(references).toHaveLength(0);
    });

    it("should return all documents", async () => {
      const content = {
        doc1: "# Document 1",
        doc2: "# Document 2",
        doc3: "# Document 3",
      };
      const repository = new InMemoryRepository(content);
      const references = [];

      for await (const ref of repository.findAll()) {
        references.push(ref);
      }

      expect(references).toHaveLength(3);
      const ids = references.map((ref) => ref.id);
      expect(ids).toContain("doc1");
      expect(ids).toContain("doc2");
      expect(ids).toContain("doc3");
    });
  });

  describe("utility methods", () => {
    let repository: InMemoryRepository;

    beforeEach(() => {
      const content = {
        doc1: "# Document 1",
        doc2: "# Document 2",
      };
      repository = new InMemoryRepository(content);
    });

    it("should return correct size", () => {
      expect(repository.size()).toBe(2);
    });

    it("should check document existence", () => {
      expect(repository.hasDocument("doc1")).toBe(true);
      expect(repository.hasDocument("DOC1")).toBe(true);
      expect(repository.hasDocument("non-existent")).toBe(false);
    });

    it("should return all document IDs", () => {
      const ids = repository.getDocumentIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain("doc1");
      expect(ids).toContain("doc2");
    });
  });
});
