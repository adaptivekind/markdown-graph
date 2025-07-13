# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Testing

- `npm test` - Run all tests using Jest
- `npm run test:watch` - Run tests in watch mode

### TypeScript

- The project uses TypeScript with ES modules and strict mode enabled
- Root source directory is `./src`
- Target: ES2020

## Architecture

This is a TypeScript library for generating graphs from markdown repositories. The core architecture follows these patterns:

### Core Components

- **Repository (`src/repository.ts`)** - Main entry point that creates graph structures from markdown content
- **BaseItem (`src/base-item.ts`)** - Handles individual markdown items with frontmatter parsing using gray-matter
- **Types (`src/types.ts`)** - Core interfaces including `Item`, `ItemReference`, `MetaData`, and `RepositoryOptions`
- **MarkdownMessage (`src/mardown-message.ts`)** - Utility for generating markdown error messages

### Key Concepts

- **Graph Structure**: Uses `@adaptivekind/graph-schema` with nodes and links
- **Frontmatter**: YAML frontmatter is parsed with explicit language setting to disable caching
- **Error Handling**: Frontmatter parsing errors are converted to markdown messages and appended to content
- **Repository Types**: Supports both "file" and "inmemory" repository types

### Test Architecture

- Tests are located in `src/features/` directory
- Helper functions in `feature-helpers.ts` provide utilities like `graphFrom()`
- Jest configuration uses JSdom environment and treats `.ts` files as ES modules
- Test files use `.test.ts` extension

### Development Notes

- The codebase uses ES modules (`"type": "module"` in package.json)
- Gray-matter caching is explicitly disabled by setting language option
- Strict TypeScript configuration with isolated modules
- Sort typescript imports by putting multiples first. Single import starting
  with a capital letter should be listed before single imports starting with a
  lower case.
