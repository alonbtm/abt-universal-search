/**
 * OfflineStorage - IndexedDB storage for offline search functionality
 * Provides persistent storage for search data and results
 */

export interface StorageConfig {
  dbName?: string;
  dbVersion?: number;
  objectStoreName?: string;
  maxEntries?: number;
  enableCompression?: boolean;
}

export interface StoredSearchData {
  id: string;
  query: string;
  results: any[];
  timestamp: number;
  ttl?: number;
  metadata?: {
    source: string;
    totalResults: number;
    searchDuration: number;
  };
}

export class OfflineStorage {
  private config: Required<StorageConfig>;
  private db: IDBDatabase | null = null;
  private isSupported: boolean;

  constructor(config: StorageConfig = {}) {
    this.config = {
      dbName: 'UniversalSearchDB',
      dbVersion: 1,
      objectStoreName: 'searchResults',
      maxEntries: 1000,
      enableCompression: false,
      ...config
    };

    this.isSupported = 'indexedDB' in window;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[OfflineStorage] IndexedDB not supported');
      return false;
    }

    try {
      this.db = await this.openDatabase();
      console.log('[OfflineStorage] Database initialized successfully');
      return true;
    } catch (error) {
      console.error('[OfflineStorage] Failed to initialize database:', error);
      return false;
    }
  }

  /**
   * Store search results for offline access
   */
  async storeSearchResults(
    query: string,
    results: any[],
    metadata?: Partial<StoredSearchData['metadata']>
  ): Promise<boolean> {
    if (!this.db) {
      console.warn('[OfflineStorage] Database not initialized');
      return false;
    }

    try {
      const transaction = this.db.transaction([this.config.objectStoreName], 'readwrite');
      const store = transaction.objectStore(this.config.objectStoreName);

      const searchData: StoredSearchData = {
        id: this.generateId(query),
        query: query.trim(),
        results: this.config.enableCompression ? this.compressData(results) : results,
        timestamp: Date.now(),
        metadata: {
          source: 'api',
          totalResults: results.length,
          searchDuration: 0,
          ...metadata
        }
      };

      await this.promisifyRequest(store.put(searchData));

      // Clean up old entries if we exceed maxEntries
      await this.cleanupOldEntries(store);

      console.log(`[OfflineStorage] Stored ${results.length} results for query: "${query}"`);
      return true;
    } catch (error) {
      console.error('[OfflineStorage] Failed to store search results:', error);
      return false;
    }
  }

  /**
   * Retrieve cached search results
   */
  async getSearchResults(query: string): Promise<StoredSearchData | null> {
    if (!this.db) {
      console.warn('[OfflineStorage] Database not initialized');
      return null;
    }

    try {
      const transaction = this.db.transaction([this.config.objectStoreName], 'readonly');
      const store = transaction.objectStore(this.config.objectStoreName);
      const id = this.generateId(query);

      const result = await this.promisifyRequest(store.get(id));

      if (result && this.isValidEntry(result)) {
        // Decompress data if compression is enabled
        if (this.config.enableCompression && result.results) {
          result.results = this.decompressData(result.results);
        }
        return result;
      }

      return null;
    } catch (error) {
      console.error('[OfflineStorage] Failed to retrieve search results:', error);
      return null;
    }
  }

  /**
   * Search stored queries (fuzzy match)
   */
  async searchStoredQueries(query: string, limit: number = 10): Promise<StoredSearchData[]> {
    if (!this.db) {
      return [];
    }

    try {
      const transaction = this.db.transaction([this.config.objectStoreName], 'readonly');
      const store = transaction.objectStore(this.config.objectStoreName);

      const results: StoredSearchData[] = [];
      const request = store.openCursor();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor && results.length < limit) {
            const data = cursor.value as StoredSearchData;

            // Simple fuzzy matching
            if (this.isQueryMatch(data.query, query)) {
              if (this.config.enableCompression && data.results) {
                data.results = this.decompressData(data.results);
              }
              results.push(data);
            }

            cursor.continue();
          } else {
            resolve(results.sort((a, b) => b.timestamp - a.timestamp));
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineStorage] Failed to search stored queries:', error);
      return [];
    }
  }

  /**
   * Get all cached queries (for autocomplete)
   */
  async getCachedQueries(limit: number = 20): Promise<string[]> {
    if (!this.db) {
      return [];
    }

    try {
      const transaction = this.db.transaction([this.config.objectStoreName], 'readonly');
      const store = transaction.objectStore(this.config.objectStoreName);

      const queries: string[] = [];
      const request = store.openCursor();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor && queries.length < limit) {
            const data = cursor.value as StoredSearchData;
            if (this.isValidEntry(data)) {
              queries.push(data.query);
            }
            cursor.continue();
          } else {
            resolve(queries.sort());
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineStorage] Failed to get cached queries:', error);
      return [];
    }
  }

  /**
   * Remove cached search results
   */
  async removeSearchResults(query: string): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      const transaction = this.db.transaction([this.config.objectStoreName], 'readwrite');
      const store = transaction.objectStore(this.config.objectStoreName);
      const id = this.generateId(query);

      await this.promisifyRequest(store.delete(id));
      return true;
    } catch (error) {
      console.error('[OfflineStorage] Failed to remove search results:', error);
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllData(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      const transaction = this.db.transaction([this.config.objectStoreName], 'readwrite');
      const store = transaction.objectStore(this.config.objectStoreName);

      await this.promisifyRequest(store.clear());
      console.log('[OfflineStorage] All cached data cleared');
      return true;
    } catch (error) {
      console.error('[OfflineStorage] Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    entryCount: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    if (!this.db) {
      return { entryCount: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
    }

    try {
      const transaction = this.db.transaction([this.config.objectStoreName], 'readonly');
      const store = transaction.objectStore(this.config.objectStoreName);

      let entryCount = 0;
      let totalSize = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;

      const request = store.openCursor();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const data = cursor.value as StoredSearchData;
            entryCount++;
            totalSize += JSON.stringify(data).length;
            oldestEntry = Math.min(oldestEntry, data.timestamp);
            newestEntry = Math.max(newestEntry, data.timestamp);
            cursor.continue();
          } else {
            resolve({ entryCount, totalSize, oldestEntry, newestEntry });
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineStorage] Failed to get storage stats:', error);
      return { entryCount: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.config.objectStoreName)) {
          const store = db.createObjectStore(this.config.objectStoreName, { keyPath: 'id' });
          store.createIndex('query', 'query', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Convert IDBRequest to Promise
   */
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generate unique ID for query
   */
  private generateId(query: string): string {
    return `search_${btoa(query.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Check if stored entry is still valid
   */
  private isValidEntry(entry: StoredSearchData): boolean {
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      return false;
    }

    // Default TTL of 7 days
    const defaultTtl = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - entry.timestamp < defaultTtl;
  }

  /**
   * Simple fuzzy query matching
   */
  private isQueryMatch(stored: string, search: string): boolean {
    const storedLower = stored.toLowerCase();
    const searchLower = search.toLowerCase();

    return storedLower.includes(searchLower) ||
           searchLower.includes(storedLower) ||
           this.calculateLevenshteinDistance(storedLower, searchLower) <= 2;
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Clean up old entries to maintain maxEntries limit
   */
  private async cleanupOldEntries(store: IDBObjectStore): Promise<void> {
    const countRequest = store.count();
    const count = await this.promisifyRequest(countRequest);

    if (count <= this.config.maxEntries) {
      return;
    }

    // Get entries sorted by timestamp (oldest first)
    const entries: StoredSearchData[] = [];
    const request = store.index('timestamp').openCursor();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          // Remove oldest entries
          const entriesToRemove = entries.slice(0, count - this.config.maxEntries);
          const deletePromises = entriesToRemove.map(entry =>
            this.promisifyRequest(store.delete(entry.id))
          );

          Promise.all(deletePromises).then(() => resolve()).catch(reject);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Compress data (simple JSON compression)
   */
  private compressData(data: any): any {
    // Simple compression - in production, consider using a proper compression library
    return JSON.stringify(data);
  }

  /**
   * Decompress data
   */
  private decompressData(data: any): any {
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return data;
    }
  }
}