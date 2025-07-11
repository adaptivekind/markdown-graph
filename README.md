# Markdown Graph

[![Test](https://github.com/adaptivekind/markdown-graph/workflows/Test/badge.svg)](https://github.com/adaptivekind/markdown-graph/actions)
[![npm version](https://badge.fury.io/js/%40adaptivekind%2Fmarkdown-graph.svg)](https://badge.fury.io/js/%40adaptivekind%2Fmarkdown-graph)

Generate a graph from a markdown repository. This TypeScript library parses markdown files and creates a graph structure where each markdown file becomes a node, with potential for wiki-style links between documents.

## Features

- 📝 Parse markdown files with frontmatter support
- 🔗 Generate graph structures from markdown repositories
- 🏷️ Extract tags and metadata from YAML frontmatter
- ⚡ Support for both file-based and in-memory repositories
- 🛡️ Robust error handling for malformed frontmatter
- 📊 Compatible with `@adaptivekind/graph-schema`

## Installation

```bash
npm install @adaptivekind/markdown-graph
```

### Repository Types

#### In-Memory Repository

```typescript
const repository = createRepository({
  content: {
    "file1.md": "# Content",
    "file2.md": "# More Content",
  },
  type: "inmemory",
});
```

#### File-Based Repository

```typescript
const repository = createRepository({
  type: "file",
  // Additional file-based configuration would go here
});
```

## API Reference

### `createRepository(options: RepositoryOptions)`

Creates a new repository instance that generates a graph from markdown content.

**Parameters:**

- `options.content` - Object mapping filenames to markdown content strings
- `options.type` - Repository type: `"inmemory"` or `"file"`

**Returns:**

- Object with `graph` property containing nodes and links

## Frontmatter Support

The library supports YAML frontmatter in markdown files:

```markdown
---
tags: [project, documentation]
author: John Doe
---

# Document Title

Your markdown content here.
```

- Frontmatter is parsed using [gray-matter](https://github.com/jonschlinkert/gray-matter)
- Malformed frontmatter is handled gracefully with error messages appended to content
- Caching is disabled to ensure consistent reloading behavior

## Development

### Prerequisites

- Node.js 22.x

### Setup

```bash
git clone https://github.com/adaptivekind/markdown-graph.git
cd markdown-graph
npm install
```

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Project Structure

```
src/
├── repository.ts         # Main repository creation logic
├── base-item.ts         # BaseItem class for individual markdown files
├── types.ts             # TypeScript type definitions
├── mardown-message.ts   # Utility for markdown error messages
└── features/
    ├── feature-helpers.ts    # Test utilities
    └── generate-graph.test.ts # Test suite
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

## License

MIT © [Ian Homer](https://github.com/adaptivekind)

## Links

- [GitHub Repository](https://github.com/adaptivekind/markdown-graph)
- [Issues](https://github.com/adaptivekind/markdown-graph/issues)
- [npm Package](https://www.npmjs.com/package/@adaptivekind/markdown-graph)
