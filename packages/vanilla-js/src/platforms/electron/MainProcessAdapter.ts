/**
 * MainProcessAdapter - Electron main process integration for Universal Search
 * Provides file system search, IPC coordination, and native integration
 */

export interface MainProcessConfig {
  enableFileSystemSearch?: boolean;
  fileSystemPaths?: string[];
  excludePatterns?: string[];
  enableIpcCommunication?: boolean;
  maxFileSize?: number; // bytes
  supportedExtensions?: string[];
}

export interface FileSearchResult {
  path: string;
  name: string;
  size: number;
  modified: number;
  content?: string;
  type: 'file' | 'directory';
  extension?: string;
}

export interface IpcMessage {
  id: string;
  type: 'search' | 'file-content' | 'index-files' | 'get-metadata';
  payload: any;
  timestamp: number;
}

export class MainProcessAdapter {
  private config: Required<MainProcessConfig>;
  private isElectronMain: boolean;
  private ipc: any = null;
  private fs: any = null;
  private path: any = null;
  private glob: any = null;

  constructor(config: MainProcessConfig = {}) {
    this.config = {
      enableFileSystemSearch: config.enableFileSystemSearch ?? true,
      fileSystemPaths: config.fileSystemPaths || [process.cwd?.() || '.'],
      excludePatterns: config.excludePatterns || [
        'node_modules/**',
        '.git/**',
        '*.log',
        'dist/**',
        'build/**'
      ],
      enableIpcCommunication: config.enableIpcCommunication ?? true,
      maxFileSize: config.maxFileSize || 1024 * 1024, // 1MB
      supportedExtensions: config.supportedExtensions || [
        '.txt', '.md', '.js', '.ts', '.json', '.html', '.css',
        '.py', '.java', '.c', '.cpp', '.h', '.php', '.rb'
      ],
      ...config
    };

    this.isElectronMain = this.detectElectronMain();
    this.init();
  }

  /**
   * Initialize the main process adapter
   */
  private async init(): Promise<void> {
    if (!this.isElectronMain) {
      console.warn('[MainProcessAdapter] Not running in Electron main process');
      return;
    }

    try {
      // Dynamically import Node.js modules (only available in main process)
      this.fs = await this.safeRequire('fs/promises');
      this.path = await this.safeRequire('path');

      if (this.config.enableIpcCommunication) {
        this.ipc = await this.safeRequire('electron');
        this.setupIpcHandlers();
      }

      console.log('[MainProcessAdapter] Initialized successfully');
    } catch (error) {
      console.error('[MainProcessAdapter] Initialization failed:', error);
    }
  }

  /**
   * Search files in the file system
   */
  async searchFiles(query: string, options: {
    searchContent?: boolean;
    limit?: number;
    sortBy?: 'name' | 'modified' | 'size';
  } = {}): Promise<FileSearchResult[]> {
    if (!this.isElectronMain || !this.fs || !this.path) {
      return [];
    }

    const {
      searchContent = false,
      limit = 100,
      sortBy = 'modified'
    } = options;

    try {
      const results: FileSearchResult[] = [];
      const searchTerm = query.toLowerCase();

      for (const searchPath of this.config.fileSystemPaths) {
        const pathResults = await this.searchInPath(searchPath, searchTerm, {
          searchContent,
          limit: limit - results.length
        });
        results.push(...pathResults);

        if (results.length >= limit) {
          break;
        }
      }

      // Sort results
      return this.sortResults(results, sortBy).slice(0, limit);
    } catch (error) {
      console.error('[MainProcessAdapter] File search failed:', error);
      return [];
    }
  }

  /**
   * Get file content for search indexing
   */
  async getFileContent(filePath: string): Promise<string | null> {
    if (!this.isElectronMain || !this.fs) {
      return null;
    }

    try {
      const stats = await this.fs.stat(filePath);

      if (stats.size > this.config.maxFileSize) {
        return null; // File too large
      }

      const content = await this.fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`[MainProcessAdapter] Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Index files in specified directories
   */
  async indexFiles(progressCallback?: (progress: number, current: string) => void): Promise<FileSearchResult[]> {
    if (!this.isElectronMain || !this.fs || !this.path) {
      return [];
    }

    try {
      const allFiles: FileSearchResult[] = [];
      let processed = 0;

      for (const searchPath of this.config.fileSystemPaths) {
        const files = await this.getFilesInPath(searchPath);

        for (const file of files) {
          try {
            const stats = await this.fs.stat(file);
            const ext = this.path.extname(file);

            if (this.config.supportedExtensions.includes(ext)) {
              const result: FileSearchResult = {
                path: file,
                name: this.path.basename(file),
                size: stats.size,
                modified: stats.mtime.getTime(),
                type: stats.isDirectory() ? 'directory' : 'file',
                extension: ext
              };

              // Add content for indexing if file is small enough
              if (stats.size <= this.config.maxFileSize && !stats.isDirectory()) {
                try {
                  result.content = await this.fs.readFile(file, 'utf-8');
                } catch {
                  // Ignore content reading errors
                }
              }

              allFiles.push(result);
            }

            processed++;
            if (progressCallback) {
              progressCallback(processed, file);
            }
          } catch (error) {
            // Skip files that can't be accessed
            console.warn(`[MainProcessAdapter] Skipping file ${file}:`, error);
          }
        }
      }

      return allFiles;
    } catch (error) {
      console.error('[MainProcessAdapter] File indexing failed:', error);
      return [];
    }
  }

  /**
   * Setup IPC handlers for renderer process communication
   */
  private setupIpcHandlers(): void {
    if (!this.ipc?.ipcMain) {
      return;
    }

    // Handle search requests
    this.ipc.ipcMain.handle('universal-search:file-search', async (event: any, query: string, options: any) => {
      return await this.searchFiles(query, options);
    });

    // Handle file content requests
    this.ipc.ipcMain.handle('universal-search:file-content', async (event: any, filePath: string) => {
      return await this.getFileContent(filePath);
    });

    // Handle indexing requests
    this.ipc.ipcMain.handle('universal-search:index-files', async (event: any, progressId?: string) => {
      return await this.indexFiles((progress, current) => {
        if (progressId) {
          event.sender.send('universal-search:index-progress', { progressId, progress, current });
        }
      });
    });

    // Handle metadata requests
    this.ipc.ipcMain.handle('universal-search:file-metadata', async (event: any, filePath: string) => {
      try {
        const stats = await this.fs.stat(filePath);
        return {
          size: stats.size,
          modified: stats.mtime.getTime(),
          created: stats.birthtime.getTime(),
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile()
        };
      } catch (error) {
        return null;
      }
    });

    console.log('[MainProcessAdapter] IPC handlers registered');
  }

  /**
   * Search files in a specific path
   */
  private async searchInPath(searchPath: string, query: string, options: {
    searchContent: boolean;
    limit: number;
  }): Promise<FileSearchResult[]> {
    const results: FileSearchResult[] = [];
    const files = await this.getFilesInPath(searchPath);

    for (const file of files) {
      if (results.length >= options.limit) {
        break;
      }

      try {
        const stats = await this.fs.stat(file);
        const fileName = this.path.basename(file);
        const ext = this.path.extname(file);

        // Skip if not supported extension
        if (!this.config.supportedExtensions.includes(ext) && !stats.isDirectory()) {
          continue;
        }

        let matches = false;

        // Check filename match
        if (fileName.toLowerCase().includes(query)) {
          matches = true;
        }

        // Check content match if requested
        if (!matches && options.searchContent && !stats.isDirectory() && stats.size <= this.config.maxFileSize) {
          try {
            const content = await this.fs.readFile(file, 'utf-8');
            if (content.toLowerCase().includes(query)) {
              matches = true;
            }
          } catch {
            // Ignore content read errors
          }
        }

        if (matches) {
          results.push({
            path: file,
            name: fileName,
            size: stats.size,
            modified: stats.mtime.getTime(),
            type: stats.isDirectory() ? 'directory' : 'file',
            extension: ext
          });
        }
      } catch (error) {
        // Skip files with access errors
        continue;
      }
    }

    return results;
  }

  /**
   * Get all files in a path (recursive)
   */
  private async getFilesInPath(searchPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await this.fs.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = this.path.join(searchPath, entry.name);

        // Skip excluded patterns
        if (this.isExcluded(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          try {
            const subFiles = await this.getFilesInPath(fullPath);
            files.push(...subFiles);
          } catch {
            // Skip directories with access errors
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`[MainProcessAdapter] Cannot read directory ${searchPath}:`, error);
    }

    return files;
  }

  /**
   * Check if path should be excluded
   */
  private isExcluded(filePath: string): boolean {
    const relativePath = this.path.relative(process.cwd(), filePath);

    return this.config.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(relativePath);
    });
  }

  /**
   * Sort search results
   */
  private sortResults(results: FileSearchResult[], sortBy: 'name' | 'modified' | 'size'): FileSearchResult[] {
    return results.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'modified':
          return b.modified - a.modified; // Most recent first
        case 'size':
          return b.size - a.size; // Largest first
        default:
          return 0;
      }
    });
  }

  /**
   * Detect if running in Electron main process
   */
  private detectElectronMain(): boolean {
    try {
      return typeof process !== 'undefined' &&
             process.type === 'browser' &&
             typeof require !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Safely require a module (only in main process)
   */
  private async safeRequire(moduleName: string): Promise<any> {
    try {
      if (typeof require !== 'undefined') {
        return require(moduleName);
      }
      return null;
    } catch (error) {
      console.warn(`[MainProcessAdapter] Cannot require ${moduleName}:`, error);
      return null;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.ipc?.ipcMain) {
      // Remove IPC handlers
      this.ipc.ipcMain.removeAllListeners('universal-search:file-search');
      this.ipc.ipcMain.removeAllListeners('universal-search:file-content');
      this.ipc.ipcMain.removeAllListeners('universal-search:index-files');
      this.ipc.ipcMain.removeAllListeners('universal-search:file-metadata');
    }
  }
}