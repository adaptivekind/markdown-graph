# Markdown Graph

[![Test](https://github.com/adaptivekind/markdown-graph/workflows/CI/badge.svg)](https://github.com/adaptivekind/markdown-graph/actions)
[![npm version](https://badge.fury.io/js/%40adaptivekind%2Fmarkdown-graph.svg)](https://badge.fury.io/js/%40adaptivekind%2Fmarkdown-graph)

Generate a graph JSON from a markdown repository with real-time file watching
capabilities. This TypeScript library parses markdown files and creates a graph
structure where each markdown file becomes a node, with wiki-style links between
documents. This graph JSON can be used by the [Graph
Gizmo](https://github.com/adaptivekind/graph-gizmo) to provide a visualisation
of the graph.

## Features

- 📝 **Parse markdown files** with frontmatter support
- 🔗 **Generate graph JSON** from markdown repositories
- 📊 **Graph interface** from `@adaptivekind/graph-schema`
- 🎯 **CLI tool** for generating graphs from directories
- 👀 **File watching** with real-time graph updates
- ⚡ **Incremental updates** for efficient performance
- 🛠️ **TypeScript support** with strict type checking

## Installation

```bash
npm install @adaptivekind/markdown-graph
```

## CLI Usage

The package provides a CLI tool for generating graphs from markdown directories:

### Generate Graph (One-time)

```bash
# Generate graph from current directory
npx markdown-graph

# Generate graph from specific directory
npx markdown-graph ./docs

# Generate graph with custom output file
npx markdown-graph ./docs -o ./output/graph.json

# Generate with verbose output
npx markdown-graph ./docs --verbose
```

### Watch Mode (Real-time Updates)

```bash
# Watch current directory for changes
npx markdown-graph watch

# Watch specific directory with verbose output
npx markdown-graph watch ./docs --verbose

# Watch with custom debounce delay
npx markdown-graph watch ./docs --debounce 500
```

### CLI Options

| Option             | Description                          | Default                            |
| ------------------ | ------------------------------------ | ---------------------------------- |
| `--output`, `-o`   | Output file path                     | `.garden-graph.json`               |
| `--verbose`, `-v`  | Enable verbose logging               | `false`                            |
| `--quiet`, `-q`    | Suppress all output except errors    | `false`                            |
| `--exclude`        | Patterns to exclude from scanning    | `["node_modules", "dist", ".git"]` |
| `--include-hidden` | Include hidden files and directories | `false`                            |
| `--debounce`       | Debounce delay for file changes (ms) | `300`                              |

## Library Usage

### Repository Types

#### In-Memory Repository

```typescript
import { createGarden } from "@adaptivekind/markdown-graph";

const garden = await createGarden({
  type: "inmemory",
  content: {
    "file1.md": "# Content\n\nThis links to [[file2]]",
    "file2.md": "# More Content\n\nThis links back to [[file1]]",
  },
});

console.log(garden.graph.nodes);
console.log(garden.graph.links);
```

#### File-Based Repository

```typescript
import { createGarden } from "@adaptivekind/markdown-graph";

const garden = await createGarden({
  type: "file",
  path: "./docs",
  excludes: ["node_modules", "dist"],
  includeHidden: false,
});

console.log(garden.graph.nodes);
console.log(garden.graph.links);
```

### Watch Mode Programming

```typescript
import { GraphWatcher } from "@adaptivekind/markdown-graph";

const watcher = new GraphWatcher({
  targetDirectory: "./docs",
  outputFile: "./graph.json",
  verbose: true,
  debounceMs: 300,
});

// Listen for events
watcher.on("initialized", (stats) => {
  console.log(`Graph initialized with ${stats.nodeCount} nodes`);
});

watcher.on("fileChanged", (data) => {
  console.log(`File ${data.changeType}: ${data.filePath}`);
});

watcher.on("graphWritten", (data) => {
  console.log(`Graph written to ${data.outputFile}`);
});

// Start watching
await watcher.start();
```

## Configuration

### Configuration Files

The tool supports configuration via:

- `.markdown-graph.json`
- `markdown-graph.config.json`
- `package.json` (in `"markdown-graph"` field)

Example configuration:

```json
{
  "targetDirectory": "./docs",
  "outputFile": "./graph.json",
  "verbose": false,
  "quiet": false,
  "excludes": ["node_modules", "dist", ".git"],
  "includeHidden": false
}
```

### Environment Variables

- `NODE_ENV=test` - Disables CLI execution during testing

## Link Types

The library supports multiple link formats:

### Wiki Links

```markdown
This is a [[wiki link]] to another document.
```

### Relative Links

```markdown
This is a [relative link](./other-document.md) to another document.
```

### Section Links

```markdown
This links to a [[document#section]] in another document.
```

## Frontmatter Support

The library supports YAML frontmatter in markdown files:

```markdown
---
tags: [project, documentation]
author: John Doe
created: 2024-01-01
---

# Document Title

Your markdown content here with [[links]] to other documents.
```

Frontmatter data is flattened and included in the graph nodes as metadata.

## Graph Structure

The generated graph follows the `@adaptivekind/graph-schema` format:

```typescript
interface Graph {
  nodes: {
    [nodeId: string]: {
      label: string;
      meta?: { [key: string]: string };
    };
  };
  links: Array<{
    source: string;
    target: string;
  }>;
}
```

### Node ID Generation

- **Root sections** (h1 headings): Use document ID directly
- **Subsections**: Use format `documentId#section-title`
- **Document IDs**: Normalized from filename (lowercase, dashes for spaces/slashes)

## Development

### Prerequisites

- Node.js 22.x
- npm 10.x

### Setup

```bash
git clone https://github.com/adaptivekind/markdown-graph.git
cd markdown-graph
npm install
```

### Scripts

```bash
# Development
npm run build              # Build the project
npm run build:watch        # Build in watch mode

# Testing
npm test                   # Run tests once
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report

# Code Quality
npm run lint               # Run linting (prettier + eslint + sonarjs)
npm run lint:fix           # Fix linting issues automatically
npm run knip               # Check for unused dependencies

# Demo
npm run demo:setup         # Set up demo environment
npm run demo:generate      # Generate graph from demo docs
npm run demo:watch         # Watch demo docs for changes
npm run demo:test          # Test file changes in demo
npm run demo:clean         # Clean up demo files
```

### Code Quality

The project uses comprehensive code quality tools:

- **ESLint** with TypeScript support
- **Prettier** for code formatting
- **SonarJS** for code quality analysis
- **Jest** with 100% test coverage
- **Husky** for pre-commit hooks
- **Knip** for dependency analysis

### Testing

The project includes comprehensive tests:

- **Unit tests** for core functionality
- **Integration tests** for CLI and file operations
- **Event-driven tests** for watch functionality
- **Error handling tests** for edge cases

Run tests with:

```bash
npm test                   # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report
```

## Performance

### Incremental Updates

The watch mode uses incremental updates for optimal performance:

- Only processes changed files
- Maintains document-to-node mappings
- Debounces file system events
- Efficient link resolution caching

### Optimization Features

- **Caching**: Link resolution and document processing
- **Debouncing**: File system events to prevent excessive updates
- **Streaming**: Async iterators for large repositories
- **Memory efficient**: Lazy loading and cleanup

## Error Handling

The library provides comprehensive error handling:

- **DirectoryNotFoundError**: When target directory doesn't exist
- **FileNotFoundError**: When referenced files are missing
- **MarkdownParsingError**: When markdown parsing fails
- **RepositoryConfigurationError**: When configuration is invalid

All errors include helpful suggestions for resolution.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass and linting is clean
5. Submit a pull request

## License

MIT © [Ian Homer](https://github.com/adaptivekind)
