import * as chokidar from "chokidar";
import { EventEmitter } from "events";
import { FileRepository } from "./file-repository";
import { GraphManager } from "./graph-manager";
import { consola } from "consola";
import { debounce } from "es-toolkit";
import fs from "fs";
import path from "path";

// File watcher configuration constants
const DEFAULT_DEBOUNCE_MS = 300;
const FILE_STABILITY_THRESHOLD_MS = 100;
const POLL_INTERVAL_MS = 50;
const KEEPALIVE_INTERVAL_MS = 30000;
const JSON_INDENT_SPACES = 2;

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
export class GraphWatcher extends EventEmitter {
  private watcher?: chokidar.FSWatcher;
  private graphManager: GraphManager;
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
    super();
    this.options = {
      debounceMs: DEFAULT_DEBOUNCE_MS,
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

    this.graphManager = new GraphManager(
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
   * Returns a Promise that never resolves to keep the process alive
   */
  async start(): Promise<never> {
    try {
      // Initialize the graph
      consola.start(`Initializing graph from ${this.options.targetDirectory}`);
      await this.graphManager.initialize();
      this.updateStats();

      // Emit initialization complete event
      this.emit("initialized", this.getStats());

      // Write initial graph and emit event
      this.writeGraphToFile();

      consola.success(
        `Initial graph created with ${this.stats.nodeCount} nodes and ${this.stats.linkCount} links`,
      );

      this.watcher = chokidar.watch(this.options.targetDirectory, {
        persistent: true,
        ignoreInitial: true,
        ignored: (path: string, stats) =>
          !!stats?.isFile() && !path.endsWith(".md"),
        awaitWriteFinish: {
          stabilityThreshold: FILE_STABILITY_THRESHOLD_MS,
          pollInterval: POLL_INTERVAL_MS,
        },
        usePolling: false,
      });

      this.setupWatcherHandlers(this.watcher);

      consola.info(`Watching for changes in ${this.options.targetDirectory}`);
      consola.info("Press Ctrl+C to stop watching");

      // Return a promise that never resolves to keep the process alive
      return new Promise<never>(() => {
        // Keep the event loop active with a timer to prevent process exit
        setInterval(() => {
          // Do nothing, just keep the event loop busy
        }, KEEPALIVE_INTERVAL_MS); // Check every 30 seconds
      });
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
  private setupWatcherHandlers(watcher: chokidar.FSWatcher): void {
    this.setupFileChangeHandlers(watcher);
    this.setupWatcherLifecycleHandlers(watcher);
  }

  /**
   * Set up handlers for file change events (add, change, unlink)
   */
  private setupFileChangeHandlers(watcher: chokidar.FSWatcher): void {
    watcher.on("add", (filePath: string) => {
      this.logFileEvent("File added", filePath);
      this.handleFileChange(filePath, "added");
    });

    watcher.on("change", (filePath: string) => {
      this.logFileEvent("File changed", filePath);
      this.handleFileChange(filePath, "changed");
    });

    watcher.on("unlink", (filePath: string) => {
      this.logFileEvent("File removed", filePath);
      this.handleFileRemoval(filePath);
    });
  }

  /**
   * Set up handlers for watcher lifecycle events (error, ready)
   */
  private setupWatcherLifecycleHandlers(watcher: chokidar.FSWatcher): void {
    watcher.on("error", (error: unknown) => {
      consola.error("Watcher error:", error);
    });

    watcher.on("ready", () => {
      if (this.options.verbose) {
        consola.debug("Initial scan complete. Ready for changes");
      }
      this.emit("ready");
    });
  }

  /**
   * Log file events if verbose logging is enabled
   */
  private logFileEvent(eventType: string, filePath: string): void {
    if (this.options.verbose) {
      consola.info(`${eventType}: ${filePath}`);
    }
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

      const fileName = path.basename(filePath);
      if (this.options.verbose) {
        consola.info(`Graph updated: ${fileName} ${changeType} (${filePath})`);
      } else {
        consola.info(`Graph updated: ${fileName} ${changeType}`);
      }

      // Emit file change event
      this.emit("fileChanged", {
        filePath,
        changeType,
        stats: this.getStats(),
      });
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

      const fileName = path.basename(filePath);
      if (this.options.verbose) {
        consola.info(`Graph updated: ${fileName} removed (${filePath})`);
      } else {
        consola.info(`Graph updated: ${fileName} removed`);
      }

      // Emit file removal event
      this.emit("fileChanged", {
        filePath,
        changeType: "removed",
        stats: this.getStats(),
      });
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
      const nodeCount = Object.keys(graph.nodes).length;
      const linkCount = graph.links.length;
      const jsonContent = JSON.stringify(graph, null, JSON_INDENT_SPACES);

      // Ensure output directory exists
      const outputDir = path.dirname(this.options.outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(this.options.outputFile, jsonContent);

      if (this.options.verbose) {
        consola.debug(
          `Graph written to ${this.options.outputFile} (${nodeCount} nodes, ${linkCount} links)`,
        );
      }

      // Emit graph written event
      this.emit("graphWritten", {
        outputFile: this.options.outputFile,
        nodeCount,
        linkCount,
      });
    } catch (error) {
      consola.error("Failed to write graph file:", error);
    }
  }

  /**
   * Build ignore patterns for chokidar
   */
  private buildIgnorePatterns(filePath: string): boolean {
    // Return true to ignore the file, false to watch it

    // Check exclude patterns
    if (this.options.excludes) {
      for (const exclude of this.options.excludes) {
        if (filePath.includes(exclude)) {
          return true;
        }
      }
    }

    // Check hidden files
    if (!this.options.includeHidden) {
      const fileName = path.basename(filePath);
      if (fileName.startsWith(".")) {
        return true;
      }
    }

    // Don't ignore this file - watch it
    return false;
  }
}
