# Watch Mode Demo

This document explains how to test the new watch functionality that efficiently updates the graph JSON file when markdown files change.

## Features

- **Incremental Updates**: Only updates the nodes that correspond to changed files
- **Debounced Writes**: Prevents excessive file writes during rapid changes
- **File System Events**: Uses `chokidar` for efficient file watching
- **Link Tracking**: Maintains relationships between files and their generated nodes

## Demo Scripts

The following npm scripts are available for testing:

### Setup Demo Environment

```bash
npm run demo:setup
```

This creates a `target/demo-docs/` directory with sample markdown files that include:

- Cross-references between documents
- Frontmatter metadata
- Multiple heading levels

### Generate Initial Graph

```bash
npm run build
npm run demo:generate
```

This creates the initial graph JSON file at `target/demo-docs/.garden-graph.json`.

### Start Watch Mode

```bash
npm run demo:watch
```

This starts the file watcher in verbose mode. You'll see:

- Initial graph generation
- Real-time updates when files change
- Statistics about nodes and links

### Test Live Changes

```bash
# In a separate terminal:
npm run demo:test
```

This script demonstrates various change scenarios:

1. Adding new files
2. Modifying existing files
3. Adding/changing links between documents
4. Adding frontmatter metadata

## Manual Testing

You can also manually test by:

1. Starting watch mode: `npm run demo:watch`
2. In another terminal, edit files in `target/demo-docs/`
3. Save changes and watch the console output
4. Check `target/demo-docs/.garden-graph.json` to see updates

### Clean Up Demo Files

```bash
npm run demo:clean
```

This removes the entire `target/` directory when you're done testing.

## Performance Features

- **Debouncing**: Changes are batched with a 300ms delay (configurable with `--debounce`)
- **Incremental Updates**: Only affected nodes are recalculated
- **Efficient File Watching**: Uses native file system events
- **Memory Optimization**: Tracks file-to-node mappings to avoid full rebuilds

## CLI Options

```bash
# Watch with custom settings
npx markdown-graph watch ./my-docs --output ./graph.json --debounce 500 --verbose

# Watch excluding certain directories
npx markdown-graph watch ./docs --exclude node_modules dist --include-hidden
```

## Architecture

The watch functionality uses:

- **IncrementalGraphManager**: Manages partial graph updates
- **GraphWatcher**: Handles file system events and orchestrates updates
- **Chokidar**: Cross-platform file watching
- **Debouncing**: Reduces unnecessary writes during rapid changes

## Use Cases

Perfect for:

- Documentation sites that need live graph updates
- Development environments where markdown files change frequently
- CI/CD pipelines that need efficient graph regeneration
- Large documentation sets where full rebuilds are expensive
