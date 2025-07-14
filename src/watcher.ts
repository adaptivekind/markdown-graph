import * as chokidar from "chokidar";
import { FileRepository } from "./file-repository";
import { IncrementalGraphManager } from "./incremental-graph-manager";
import { consola } from "consola";
import { debounce } from "es-toolkit";
import fs from "fs";
import path from "path";

export interface WatchOptions {
  targetDirectory: string;
  outputFile: string;
  verbose?: boolean;
  excludes?: string[];
  includeHidden?: boolean;
  debounceMs?: number;
}

export interface WatchStats {
  totalFiles: number;
  nodeCount: number;
  linkCount: number;
  lastUpdate: Date;
}

/**
 * File system watcher that efficiently updates graph JSON when markdown files change
 */
export class GraphWatcher {
  private watcher?: chokidar.FSWatcher;
  private graphManager: IncrementalGraphManager;
  private options: Required<WatchOptions>;
  private stats: WatchStats = {
    totalFiles: 0,
    nodeCount: 0,
    linkCount: 0,
    lastUpdate: new Date(),
  };

  // Debounced function to write graph to file
  private debouncedWriteGraph: () => void;

  constructor(options: WatchOptions) {
    this.options = {
      debounceMs: 300,
      excludes: ["node_modules", "dist", ".git"],
      includeHidden: false,
      verbose: false,
      ...options,
    };

    // Create repository and graph manager
    const repository = new FileRepository(this.options.targetDirectory, {
      excludes: this.options.excludes,
      includeHidden: this.options.includeHidden,
    });

    this.graphManager = new IncrementalGraphManager(
      repository,
      this.options.targetDirectory,
    );

    // Create debounced write function
    this.debouncedWriteGraph = debounce(() => {
      this.writeGraphToFile();
    }, this.options.debounceMs);
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    try {
      // Initialize the graph
      consola.start(`Initializing graph from ${this.options.targetDirectory}`);
      await this.graphManager.initialize();
      this.updateStats();
      this.writeGraphToFile();

      consola.success(
        `Initial graph created with ${this.stats.nodeCount} nodes and ${this.stats.linkCount} links`,
      );

      // Set up file watcher
      const watchPattern = path.join(this.options.targetDirectory, "**/*.md");

      this.watcher = chokidar.watch(watchPattern, {
        persistent: true,
        ignoreInitial: true,
        ignored: this.buildIgnorePatterns(),
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      this.setupWatcherHandlers();

      consola.info(`Watching for changes in ${this.options.targetDirectory}`);
      consola.info("Press Ctrl+C to stop watching");
    } catch (error) {
      consola.error("Failed to start watcher:", error);
      throw error;
    }
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
      consola.info("File watcher stopped");
    }
  }

  /**
   * Get current watch statistics
   */
  getStats(): WatchStats {
    return { ...this.stats };
  }

  /**
   * Set up event handlers for the file watcher
   */
  private setupWatcherHandlers(): void {
    if (!this.watcher) return;

    this.watcher.on("add", (filePath: string) => {
      if (this.options.verbose) {
        consola.info(`File added: ${filePath}`);
      }
      this.handleFileChange(filePath, "added");
    });

    this.watcher.on("change", (filePath: string) => {
      if (this.options.verbose) {
        consola.info(`File changed: ${filePath}`);
      }
      this.handleFileChange(filePath, "changed");
    });

    this.watcher.on("unlink", (filePath: string) => {
      if (this.options.verbose) {
        consola.info(`File removed: ${filePath}`);
      }
      this.handleFileRemoval(filePath);
    });

    this.watcher.on("error", (error: unknown) => {
      consola.error("Watcher error:", error);
    });

    this.watcher.on("ready", () => {
      if (this.options.verbose) {
        consola.debug("Initial scan complete. Ready for changes");
      }
    });
  }

  /**
   * Handle file addition or modification
   */
  private async handleFileChange(
    filePath: string,
    changeType: "added" | "changed",
  ): Promise<void> {
    try {
      await this.graphManager.updateFile(filePath);
      this.updateStats();
      this.debouncedWriteGraph();

      if (!this.options.verbose) {
        const fileName = path.basename(filePath);
        consola.info(`Graph updated: ${fileName} ${changeType}`);
      }
    } catch (error) {
      consola.warn(`Failed to handle file ${changeType}: ${filePath}`, error);
    }
  }

  /**
   * Handle file removal
   */
  private handleFileRemoval(filePath: string): void {
    try {
      this.graphManager.removeFile(filePath);
      this.updateStats();
      this.debouncedWriteGraph();

      if (!this.options.verbose) {
        const fileName = path.basename(filePath);
        consola.info(`Graph updated: ${fileName} removed`);
      }
    } catch (error) {
      consola.warn(`Failed to handle file removal: ${filePath}`, error);
    }
  }

  /**
   * Update internal statistics
   */
  private updateStats(): void {
    const graphStats = this.graphManager.getStats();
    this.stats = {
      totalFiles: this.stats.totalFiles, // This would need to be tracked separately
      nodeCount: graphStats.nodeCount,
      linkCount: graphStats.linkCount,
      lastUpdate: new Date(),
    };
  }

  /**
   * Write the current graph to the output file
   */
  private writeGraphToFile(): void {
    try {
      const graph = this.graphManager.getGraph();
      const jsonContent = JSON.stringify(graph, null, 2);

      // Ensure output directory exists
      const outputDir = path.dirname(this.options.outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(this.options.outputFile, jsonContent);

      if (this.options.verbose) {
        consola.debug(`Graph written to ${this.options.outputFile}`);
      }
    } catch (error) {
      consola.error("Failed to write graph file:", error);
    }
  }

  /**
   * Build ignore patterns for chokidar
   */
  private buildIgnorePatterns(): (string | RegExp)[] {
    const patterns: (string | RegExp)[] = [];

    // Add exclude patterns
    this.options.excludes.forEach((exclude) => {
      patterns.push(`**/${exclude}/**`);
    });

    // Add hidden file patterns if not including hidden files
    if (!this.options.includeHidden) {
      patterns.push(/(^|[/\\])\../); // Matches hidden files/directories
    }

    return patterns;
  }
}
