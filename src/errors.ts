// Custom error types for markdown graph processing

export class MarkdownGraphError extends Error {
  public cause?: Error;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "MarkdownGraphError";
    if (cause) {
      if (cause instanceof Error) {
        this.cause = cause;
      } else {
        this.cause = Error(JSON.stringify(cause));
      }
    }
  }
}

export class FileNotFoundError extends MarkdownGraphError {
  constructor(filepath: string) {
    super(`File not found: ${filepath}`);
    this.name = "FileNotFoundError";
  }
}

export class DirectoryNotFoundError extends MarkdownGraphError {
  constructor(directory: string, cause?: unknown) {
    super(`Directory does not exist: ${directory}`, cause);
    this.name = "DirectoryNotFoundError";
  }
}

export class MarkdownParsingError extends MarkdownGraphError {
  constructor(filename: string, cause: Error) {
    super(`Failed to parse markdown in ${filename}: ${cause.message}`, cause);
    this.name = "MarkdownParsingError";
  }
}

export class DocumentNotFoundError extends MarkdownGraphError {
  constructor(documentId: string, repositoryDescription: string) {
    super(
      `Cannot load document ${documentId}: does not exist in ${repositoryDescription}`,
    );
    this.name = "DocumentNotFoundError";
  }
}

export class RepositoryConfigurationError extends MarkdownGraphError {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryConfigurationError";
  }
}
