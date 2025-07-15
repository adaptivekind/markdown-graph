# CLAUDE.md

This file provides guidance to any agent modifying code in this repository.

## Purpose

This package generates graph JSON from markdown repositories.

## Architecture

Markdown content is parsed using the "unified" framework, which works with
content as Abstract Syntax Trees (AST). This provide the capability to extract
content and links from Markdown documents. These Markdown documents are
converted to Nodes and Links and assembled in a Graph.

The Node, Link and Graph interfaces are provided by the
`@adaptivekind/graph-schema` package.

The file repository is defined as all the Markdown files within a given
directory, including recursive scanning of child directories.

## Universal Directives

1. you MUST write code that is clear and explains meaning - prefer readability
   over condensed code.
2. you MUST test, lint and build before declaring done.
3. you MUST handle errors explicitly.
4. you MUST code in a way that matches the style of the existing code.
5. you MUST code in a way that makes it easier for future coders.
6. you MUST focus on the task at hand, do not make changes that do not help
   towards this goal.
7. you SHOULD ensure a test exists that describes the intended behaviour, before
   writing the code that delivers that behaviour. Once the test is passes you
   should refactor the implementation to ensure the universal directives are met.
8. you SHOULD from time to time review the code base holistically to check
   whether it satisfies the universal directives. If you have recommendation you
   MUST explain what you feel should be done. Only proceed with the fixes when
   explicitly asked to.

### Code Strategy

- Codebase > Documentation as source of truth.
- you MUST not use the `any` type.
- Sort typescript imports by putting multiple imports first. After that single
  imports should be sorted starting with a imports starting with a capital letter,
  after which single imports starting with a lower case letter should be sorted.
- Prefer feature tests which test the public interfaces for this package as opposed
  to unit tests based on internal functions. This asserts the desired behaviour of
  the package.
- Markdown should have a `textwidth` of 80 characters

## Engineering guidance

- NEVER assume, always question
- be BRUTALLY HONEST in assessments
- NO NONSENSE, NO HYPE, NO MARKETING SPEAK - prefer hard facts and stay
  objective
- Use slash commands for consistent workflows

## Commands

- `npm test` - Run all tests using Jest.
- `npm run lint` - Check that files are linted correctly.
- `npm run build` - Build the package with rollup.
- `npm run dev` - Run the CLI in dev mode.

## Public Interfaces

- Command line interface implemented in `./src/cli.ts`
- Library public interfaces described in `.src/index.ts`. This includes
  `createGarden` which is the primary programmatic entry point.

## Test Strategy

- See jest.config.js for jest configuration
- Extra setup for jest is in jest.config.js
- Helper functions in `feature-helpers.ts` provide utilities like `graphFrom()`
- Test files use `.test.ts` extension
- Feature tests in `src/features/` directory
- Use `graphFrom()` helper for test setup
- Test files written to `target/` directory
- Mock file system operations only when necessary

## Technical Design

- This package is implemented with TypeScript
- See tsconfig.json for TypeScript configuration
- See the dependencies in package.json for packages used

## Performance Guidelines

- Use controlled concurrency for file operations
- Prefer batch processing for large repositories
- Implement debouncing for file watchers

## Development Notes

- The codebase uses ES modules (`"type": "module"` in package.json)
- Gray-matter caching is explicitly disabled by setting language option
- Strict TypeScript configuration with isolated modules
- Content in markdown files should not have more than 80 characters on a line.
- If any processes, such as testing generate, create files, these should be
  written to the target/ folder so that they can be easily clean up.
