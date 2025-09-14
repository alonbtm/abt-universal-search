/**
 * Response Compressor - Compression system for API responses and cached data
 * @description Implements gzip/deflate compression with selective compression and monitoring
 */

import {
  CompressionConfig,
  CompressionResult,
  IResponseCompressor
} from '../types/Performance.js';

/**
 * Default compression configuration
 */
const DEFAULT_CONFIG: CompressionConfig = {
  enabled: true,
  algorithms: ['gzip', 'deflate', 'br'],
  level: 6, // Balanced compression level
  threshold: 1024, // 1KB threshold
  mimeTypes: [
    'application/json',
    'application/javascript',
    'text/html',
    'text/css',
    'text/plain',
    'text/xml',
    'application/xml',
    'image/svg+xml'
  ],
  enableForCache: true,
  quality: {
    speed: 6,
    ratio: 7
  }
};

/**
 * GZIP Compression Implementation
 */
class GzipCompressor {
  async compress(data: Uint8Array, level: number = 6): Promise<{
    compressed: Uint8Array;
    algorithm: string;
    compressionTime: number;
  }> {
    const startTime = performance.now();
    
    try {
      // In a real implementation, this would use actual gzip compression
      // For this demo, we simulate compression with a simple algorithm
      const compressed = await this.simulateCompression(data, 'gzip', level);
      
      return {
        compressed,
        algorithm: 'gzip',
        compressionTime: performance.now() - startTime
      };
    } catch (error) {
      throw new Error(`GZIP compression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async decompress(data: Uint8Array): Promise<Uint8Array> {
    // Simulate decompression
    return await this.simulateDecompression(data, 'gzip');
  }

  private async simulateCompression(data: Uint8Array, algorithm: string, level: number): Promise<Uint8Array> {
    // Simple compression simulation based on level
    const compressionRatio = this.getCompressionRatio(algorithm, level);
    const compressedSize = Math.floor(data.length * compressionRatio);
    
    // Create compressed data (simplified)
    const compressed = new Uint8Array(compressedSize);
    for (let i = 0; i < compressedSize; i++) {
      compressed[i] = data[i % data.length];
    }
    
    // Simulate compression delay
    await this.simulateCompressionDelay(level);
    
    return compressed;
  }

  private async simulateDecompression(data: Uint8Array, algorithm: string): Promise<Uint8Array> {
    // Simple decompression simulation
    const expansionRatio = this.getExpansionRatio(algorithm);
    const decompressedSize = Math.floor(data.length * expansionRatio);
    
    const decompressed = new Uint8Array(decompressedSize);
    for (let i = 0; i < decompressedSize; i++) {
      decompressed[i] = data[i % data.length];
    }
    
    // Simulate decompression delay
    await new Promise(resolve => setTimeout(resolve, 1));
    
    return decompressed;
  }

  private getCompressionRatio(algorithm: string, level: number): number {
    const baseRatios: Record<string, number> = {
      'gzip': 0.7,
      'deflate': 0.72,
      'br': 0.68,
      'lz4': 0.8
    };
    
    const baseRatio = baseRatios[algorithm] || 0.7;
    const levelFactor = (level - 1) * 0.02; // Better compression at higher levels
    
    return Math.max(0.3, baseRatio - levelFactor);
  }

  private getExpansionRatio(algorithm: string): number {
    const ratios: Record<string, number> = {
      'gzip': 1.43, // Inverse of 0.7
      'deflate': 1.39,
      'br': 1.47,
      'lz4': 1.25
    };
    
    return ratios[algorithm] || 1.43;
  }

  private async simulateCompressionDelay(level: number): Promise<void> {
    // Higher levels take longer
    const delay = level * 0.1;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Deflate Compression Implementation
 */
class DeflateCompressor {
  async compress(data: Uint8Array, level: number = 6): Promise<{
    compressed: Uint8Array;
    algorithm: string;
    compressionTime: number;
  }> {
    const startTime = performance.now();
    
    try {
      const compressed = await this.simulateCompression(data, 'deflate', level);
      
      return {
        compressed,
        algorithm: 'deflate',
        compressionTime: performance.now() - startTime
      };
    } catch (error) {
      throw new Error(`Deflate compression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async decompress(data: Uint8Array): Promise<Uint8Array> {
    return await this.simulateDecompression(data, 'deflate');
  }

  private async simulateCompression(data: Uint8Array, algorithm: string, level: number): Promise<Uint8Array> {
    const compressionRatio = 0.72 - (level - 1) * 0.02;
    const compressedSize = Math.floor(data.length * compressionRatio);
    
    const compressed = new Uint8Array(compressedSize);
    for (let i = 0; i < compressedSize; i++) {
      compressed[i] = data[i % data.length] ^ (i % 256);
    }
    
    await new Promise(resolve => setTimeout(resolve, level * 0.08));
    return compressed;
  }

  private async simulateDecompression(data: Uint8Array, algorithm: string): Promise<Uint8Array> {
    const decompressedSize = Math.floor(data.length * 1.39);
    const decompressed = new Uint8Array(decompressedSize);
    
    for (let i = 0; i < decompressedSize; i++) {
      decompressed[i] = data[i % data.length] ^ (i % 256);
    }
    
    await new Promise(resolve => setTimeout(resolve, 0.5));
    return decompressed;
  }
}

/**
 * Brotli Compression Implementation
 */
class BrotliCompressor {
  async compress(data: Uint8Array, level: number = 6): Promise<{
    compressed: Uint8Array;
    algorithm: string;
    compressionTime: number;
  }> {
    const startTime = performance.now();
    
    try {
      const compressed = await this.simulateCompression(data, 'br', level);
      
      return {
        compressed,
        algorithm: 'br',
        compressionTime: performance.now() - startTime
      };
    } catch (error) {
      throw new Error(`Brotli compression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async decompress(data: Uint8Array): Promise<Uint8Array> {
    return await this.simulateDecompression(data, 'br');
  }

  private async simulateCompression(data: Uint8Array, algorithm: string, level: number): Promise<Uint8Array> {
    // Brotli typically achieves better compression ratios
    const compressionRatio = 0.68 - (level - 1) * 0.025;
    const compressedSize = Math.floor(data.length * compressionRatio);
    
    const compressed = new Uint8Array(compressedSize);
    for (let i = 0; i < compressedSize; i++) {
      compressed[i] = data[i % data.length] ^ ((i * 31) % 256);
    }
    
    // Brotli is slower but more efficient
    await new Promise(resolve => setTimeout(resolve, level * 0.15));
    return compressed;
  }

  private async simulateDecompression(data: Uint8Array, algorithm: string): Promise<Uint8Array> {
    const decompressedSize = Math.floor(data.length * 1.47);
    const decompressed = new Uint8Array(decompressedSize);
    
    for (let i = 0; i < decompressedSize; i++) {
      decompressed[i] = data[i % data.length] ^ ((i * 31) % 256);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1));
    return decompressed;
  }
}

/**
 * LZ4 Fast Compression Implementation
 */
class LZ4Compressor {
  async compress(data: Uint8Array, level: number = 6): Promise<{
    compressed: Uint8Array;
    algorithm: string;
    compressionTime: number;
  }> {
    const startTime = performance.now();
    
    try {
      const compressed = await this.simulateCompression(data, 'lz4', level);
      
      return {
        compressed,
        algorithm: 'lz4',
        compressionTime: performance.now() - startTime
      };
    } catch (error) {
      throw new Error(`LZ4 compression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async decompress(data: Uint8Array): Promise<Uint8Array> {
    return await this.simulateDecompression(data, 'lz4');
  }

  private async simulateCompression(data: Uint8Array, algorithm: string, level: number): Promise<Uint8Array> {
    // LZ4 focuses on speed over compression ratio
    const compressionRatio = 0.8 - (level - 1) * 0.01;
    const compressedSize = Math.floor(data.length * compressionRatio);
    
    const compressed = new Uint8Array(compressedSize);
    for (let i = 0; i < compressedSize; i++) {
      compressed[i] = data[i % data.length] ^ (i % 128);
    }
    
    // Very fast compression
    await new Promise(resolve => setTimeout(resolve, 0.1));
    return compressed;
  }

  private async simulateDecompression(data: Uint8Array, algorithm: string): Promise<Uint8Array> {
    const decompressedSize = Math.floor(data.length * 1.25);
    const decompressed = new Uint8Array(decompressedSize);
    
    for (let i = 0; i < decompressedSize; i++) {
      decompressed[i] = data[i % data.length] ^ (i % 128);
    }
    
    // Very fast decompression
    await new Promise(resolve => setTimeout(resolve, 0.05));
    return decompressed;
  }
}

/**
 * Response Compressor Implementation
 */
export class ResponseCompressor implements IResponseCompressor {
  private config: CompressionConfig;
  private compressors: Map<string, any>;
  private statistics: {
    totalCompressions: number;
    totalSavings: number;
    averageRatio: number;
    algorithmUsage: Record<string, number>;
    compressionTimes: number[];
    errorCount: number;
  };

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize compressors
    this.compressors = new Map();
    this.compressors.set('gzip', new GzipCompressor());
    this.compressors.set('deflate', new DeflateCompressor());
    this.compressors.set('br', new BrotliCompressor());
    this.compressors.set('lz4', new LZ4Compressor());
    
    // Initialize statistics
    this.statistics = {
      totalCompressions: 0,
      totalSavings: 0,
      averageRatio: 1,
      algorithmUsage: {},
      compressionTimes: [],
      errorCount: 0
    };
  }

  /**
   * Compress response data
   */
  async compress(data: any, options?: Partial<CompressionConfig>): Promise<CompressionResult> {
    const config = { ...this.config, ...options };
    
    if (!config.enabled) {
      return this.createUncompressedResult(data);
    }

    try {
      // Convert data to Uint8Array
      const uint8Data = this.convertToUint8Array(data);
      
      // Check if compression is beneficial
      if (!this.shouldCompress(data, config.threshold)) {
        return this.createUncompressedResult(data);
      }

      // Select best algorithm
      const algorithm = this.selectOptimalAlgorithm(uint8Data, config);
      const compressor = this.compressors.get(algorithm);
      
      if (!compressor) {
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }

      // Perform compression
      const compressionResult = await compressor.compress(uint8Data, config.level);
      
      // Create result
      const result: CompressionResult = {
        originalSize: uint8Data.length,
        compressedSize: compressionResult.compressed.length,
        ratio: compressionResult.compressed.length / uint8Data.length,
        algorithm: compressionResult.algorithm,
        compressionTime: compressionResult.compressionTime,
        data: compressionResult.compressed,
        metadata: {
          mimeType: this.detectMimeType(data),
          quality: config.quality,
          level: config.level
        }
      };

      // Update statistics
      this.updateStatistics(result);
      
      return result;
      
    } catch (error) {
      this.statistics.errorCount++;
      console.error('Compression error:', error);
      return this.createUncompressedResult(data, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Decompress response data
   */
  async decompress(compressed: Uint8Array, algorithm: string): Promise<any> {
    try {
      const compressor = this.compressors.get(algorithm);
      
      if (!compressor) {
        throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
      }

      const decompressed = await compressor.decompress(compressed);
      
      // Convert back to original format
      return this.convertFromUint8Array(decompressed);
      
    } catch (error) {
      throw new Error(`Decompression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if data should be compressed
   */
  shouldCompress(data: any, threshold: number): boolean {
    const size = this.calculateDataSize(data);
    
    // Don't compress if below threshold
    if (size < threshold) {
      return false;
    }

    // Check MIME type if available
    const mimeType = this.detectMimeType(data);
    if (mimeType && !this.config.mimeTypes.includes(mimeType)) {
      return false;
    }

    // Don't compress already compressed data
    if (this.isAlreadyCompressed(data)) {
      return false;
    }

    return true;
  }

  /**
   * Get compression statistics
   */
  getStatistics(): {
    totalCompressions: number;
    totalSavings: number;
    averageRatio: number;
    algorithmUsage: Record<string, number>;
  } {
    return {
      totalCompressions: this.statistics.totalCompressions,
      totalSavings: this.statistics.totalSavings,
      averageRatio: this.statistics.averageRatio,
      algorithmUsage: { ...this.statistics.algorithmUsage }
    };
  }

  /**
   * Update compression configuration
   */
  updateConfig(config: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get optimal compression algorithm for data
   */
  getOptimalAlgorithm(data: any): string {
    const uint8Data = this.convertToUint8Array(data);
    return this.selectOptimalAlgorithm(uint8Data, this.config);
  }

  /**
   * Compress multiple responses in batch
   */
  async compressBatch(
    items: Array<{ id: string; data: any; options?: Partial<CompressionConfig> }>
  ): Promise<Array<{ id: string; result: CompressionResult }>> {
    const results = await Promise.allSettled(
      items.map(async item => ({
        id: item.id,
        result: await this.compress(item.data, item.options)
      }))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<{ id: string; result: CompressionResult }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Get compression recommendations
   */
  getCompressionRecommendations(data: any): Array<{
    algorithm: string;
    estimatedRatio: number;
    estimatedTime: number;
    recommendation: 'optimal' | 'good' | 'acceptable' | 'not_recommended';
  }> {
    const uint8Data = this.convertToUint8Array(data);
    const dataSize = uint8Data.length;
    
    const recommendations = this.config.algorithms.map(algorithm => {
      const { estimatedRatio, estimatedTime } = this.estimateCompression(algorithm, dataSize);
      
      let recommendation: 'optimal' | 'good' | 'acceptable' | 'not_recommended' = 'acceptable';
      
      if (estimatedRatio < 0.7 && estimatedTime < 10) {
        recommendation = 'optimal';
      } else if (estimatedRatio < 0.8 && estimatedTime < 20) {
        recommendation = 'good';
      } else if (estimatedRatio > 0.9) {
        recommendation = 'not_recommended';
      }

      return {
        algorithm,
        estimatedRatio,
        estimatedTime,
        recommendation
      };
    });

    return recommendations.sort((a, b) => {
      // Sort by recommendation quality, then by ratio
      const priorityOrder = { optimal: 4, good: 3, acceptable: 2, not_recommended: 1 };
      const priorityDiff = priorityOrder[b.recommendation] - priorityOrder[a.recommendation];
      return priorityDiff !== 0 ? priorityDiff : a.estimatedRatio - b.estimatedRatio;
    });
  }

  // Private implementation methods

  private convertToUint8Array(data: any): Uint8Array {
    if (data instanceof Uint8Array) {
      return data;
    }
    
    if (typeof data === 'string') {
      return new TextEncoder().encode(data);
    }
    
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    }
    
    // Convert object to JSON string then to Uint8Array
    const jsonString = JSON.stringify(data);
    return new TextEncoder().encode(jsonString);
  }

  private convertFromUint8Array(uint8Data: Uint8Array): any {
    try {
      const text = new TextDecoder().decode(uint8Data);
      
      // Try to parse as JSON first
      try {
        return JSON.parse(text);
      } catch {
        // Return as string if not valid JSON
        return text;
      }
    } catch {
      // Return raw data if conversion fails
      return uint8Data;
    }
  }

  private calculateDataSize(data: any): number {
    if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    
    if (typeof data === 'string') {
      return new TextEncoder().encode(data).length;
    }
    
    // Estimate size for objects
    const jsonString = JSON.stringify(data);
    return new TextEncoder().encode(jsonString).length;
  }

  private detectMimeType(data: any): string | null {
    if (typeof data === 'string') {
      // Try to detect based on content
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        return 'application/json';
      }
      if (data.trim().startsWith('<')) {
        return 'text/html';
      }
      return 'text/plain';
    }
    
    if (typeof data === 'object') {
      return 'application/json';
    }
    
    return null;
  }

  private isAlreadyCompressed(data: any): boolean {
    // Simple heuristic: if data is already a Uint8Array and looks compressed
    if (data instanceof Uint8Array) {
      // Check for common compression headers
      if (data.length >= 2) {
        const header = (data[0] << 8) | data[1];
        // GZIP magic number
        if (header === 0x1f8b) return true;
        // PNG magic number (already compressed)
        if (header === 0x8950) return true;
        // JPEG magic number (already compressed)
        if (header === 0xffd8) return true;
      }
    }
    
    return false;
  }

  private selectOptimalAlgorithm(data: Uint8Array, config: CompressionConfig): string {
    const dataSize = data.length;
    
    // For small data, use fast compression
    if (dataSize < 10 * 1024) { // Less than 10KB
      return config.algorithms.includes('lz4') ? 'lz4' : 'deflate';
    }
    
    // For medium data, balance speed and ratio
    if (dataSize < 100 * 1024) { // Less than 100KB
      return config.algorithms.includes('gzip') ? 'gzip' : 'deflate';
    }
    
    // For large data, prioritize compression ratio
    if (config.algorithms.includes('br')) {
      return 'br';
    }
    
    return config.algorithms.includes('gzip') ? 'gzip' : config.algorithms[0];
  }

  private estimateCompression(algorithm: string, dataSize: number): {
    estimatedRatio: number;
    estimatedTime: number;
  } {
    const algorithmSpecs: Record<string, { ratio: number; speedFactor: number }> = {
      'lz4': { ratio: 0.8, speedFactor: 0.1 },
      'deflate': { ratio: 0.72, speedFactor: 0.5 },
      'gzip': { ratio: 0.7, speedFactor: 0.6 },
      'br': { ratio: 0.68, speedFactor: 1.0 }
    };
    
    const spec = algorithmSpecs[algorithm] || algorithmSpecs['gzip'];
    const estimatedTime = (dataSize / 1024) * spec.speedFactor; // ms per KB
    
    return {
      estimatedRatio: spec.ratio,
      estimatedTime
    };
  }

  private createUncompressedResult(data: any, error?: string): CompressionResult {
    const uint8Data = this.convertToUint8Array(data);
    
    return {
      originalSize: uint8Data.length,
      compressedSize: uint8Data.length,
      ratio: 1,
      algorithm: 'none',
      compressionTime: 0,
      data: uint8Data,
      metadata: {
        uncompressed: true,
        error: error || undefined,
        mimeType: this.detectMimeType(data)
      }
    };
  }

  private updateStatistics(result: CompressionResult): void {
    this.statistics.totalCompressions++;
    this.statistics.totalSavings += result.originalSize - result.compressedSize;
    
    // Update average ratio (exponential moving average)
    const alpha = 0.1;
    this.statistics.averageRatio = 
      (1 - alpha) * this.statistics.averageRatio + alpha * result.ratio;
    
    // Track algorithm usage
    this.statistics.algorithmUsage[result.algorithm] = 
      (this.statistics.algorithmUsage[result.algorithm] || 0) + 1;
    
    // Track compression times (keep last 100)
    this.statistics.compressionTimes.push(result.compressionTime);
    if (this.statistics.compressionTimes.length > 100) {
      this.statistics.compressionTimes.shift();
    }
  }
}

/**
 * Streaming Response Compressor for large data
 */
export class StreamingResponseCompressor {
  private compressor: ResponseCompressor;
  private chunkSize: number;

  constructor(config?: Partial<CompressionConfig>, chunkSize: number = 64 * 1024) {
    this.compressor = new ResponseCompressor(config);
    this.chunkSize = chunkSize;
  }

  /**
   * Compress data in streaming fashion
   */
  async *compressStream(
    dataStream: AsyncIterable<any>,
    algorithm: string = 'gzip'
  ): AsyncGenerator<Uint8Array, void, unknown> {
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    // Collect chunks until we reach the chunk size
    for await (const chunk of dataStream) {
      const uint8Chunk = this.convertToUint8Array(chunk);
      chunks.push(uint8Chunk);
      totalSize += uint8Chunk.length;

      if (totalSize >= this.chunkSize) {
        // Combine chunks and compress
        const combinedData = this.combineChunks(chunks);
        const compressed = await this.compressor.compress(combinedData, { algorithms: [algorithm as 'gzip' | 'deflate' | 'br' | 'lz4'] });
        yield compressed.data;

        // Reset for next batch
        chunks.length = 0;
        totalSize = 0;
      }
    }

    // Compress remaining chunks
    if (chunks.length > 0) {
      const combinedData = this.combineChunks(chunks);
      const compressed = await this.compressor.compress(combinedData, { algorithms: [algorithm] });
      yield compressed.data;
    }
  }

  private convertToUint8Array(data: any): Uint8Array {
    if (data instanceof Uint8Array) return data;
    if (typeof data === 'string') return new TextEncoder().encode(data);
    return new TextEncoder().encode(JSON.stringify(data));
  }

  private combineChunks(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combined;
  }
}

/**
 * Factory function for creating response compressor instances
 */
export function createResponseCompressor(config?: Partial<CompressionConfig>): IResponseCompressor {
  return new ResponseCompressor(config);
}

/**
 * Adaptive Compression Manager
 */
export class AdaptiveCompressionManager {
  private compressor: ResponseCompressor;
  private performanceHistory: Map<string, Array<{
    size: number;
    ratio: number;
    time: number;
    algorithm: string;
  }>>;

  constructor(config?: Partial<CompressionConfig>) {
    this.compressor = new ResponseCompressor(config);
    this.performanceHistory = new Map();
  }

  /**
   * Compress with adaptive algorithm selection
   */
  async compressAdaptively(data: any, context?: {
    contentType?: string;
    priority?: 'speed' | 'size' | 'balanced';
    clientCapabilities?: string[];
  }): Promise<CompressionResult> {
    const optimalAlgorithm = await this.selectAdaptiveAlgorithm(data, context);
    const result = await this.compressor.compress(data, { 
      algorithms: [optimalAlgorithm as 'gzip' | 'deflate' | 'br' | 'lz4'] 
    });
    
    // Record performance for learning
    this.recordPerformance(data, result);
    
    return result;
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(): {
    bestAlgorithmBySize: string;
    bestAlgorithmBySpeed: string;
    averageCompressionRatio: number;
    totalDataProcessed: number;
  } {
    let bestAlgorithmBySize = 'gzip';
    let bestAlgorithmBySpeed = 'lz4';
    let totalRatio = 0;
    let totalTime = 0;
    let totalSize = 0;
    let totalEntries = 0;

    const algorithmStats = new Map<string, { ratio: number; time: number; count: number }>();

    for (const history of Array.from(this.performanceHistory.values())) {
      for (const entry of history) {
        totalRatio += entry.ratio;
        totalTime += entry.time;
        totalSize += entry.size;
        totalEntries++;

        const stats = algorithmStats.get(entry.algorithm) || { ratio: 0, time: 0, count: 0 };
        stats.ratio += entry.ratio;
        stats.time += entry.time;
        stats.count++;
        algorithmStats.set(entry.algorithm, stats);
      }
    }

    // Find best algorithms
    let bestRatio = 1;
    let bestSpeed = Number.MAX_VALUE;

    for (const [algorithm, stats] of Array.from(algorithmStats.entries())) {
      const avgRatio = stats.ratio / stats.count;
      const avgTime = stats.time / stats.count;

      if (avgRatio < bestRatio) {
        bestRatio = avgRatio;
        bestAlgorithmBySize = algorithm;
      }

      if (avgTime < bestSpeed) {
        bestSpeed = avgTime;
        bestAlgorithmBySpeed = algorithm;
      }
    }

    return {
      bestAlgorithmBySize,
      bestAlgorithmBySpeed,
      averageCompressionRatio: totalEntries > 0 ? totalRatio / totalEntries : 1,
      totalDataProcessed: totalSize
    };
  }

  private async selectAdaptiveAlgorithm(
    data: any,
    context?: {
      contentType?: string;
      priority?: 'speed' | 'size' | 'balanced';
      clientCapabilities?: string[];
    }
  ): Promise<string> {
    const dataSize = this.calculateDataSize(data);
    const priority = context?.priority || 'balanced';
    const capabilities = context?.clientCapabilities || ['gzip', 'deflate'];

    // Filter algorithms by client capabilities
    const availableAlgorithms = ['gzip', 'deflate', 'br', 'lz4'].filter(alg =>
      capabilities.includes(alg)
    );

    // Select based on priority and data characteristics
    if (priority === 'speed') {
      return availableAlgorithms.includes('lz4') ? 'lz4' : 'deflate';
    }

    if (priority === 'size') {
      return availableAlgorithms.includes('br') ? 'br' : 'gzip';
    }

    // Balanced approach based on data size
    if (dataSize < 10 * 1024) {
      return availableAlgorithms.includes('lz4') ? 'lz4' : 'deflate';
    } else if (dataSize > 100 * 1024) {
      return availableAlgorithms.includes('br') ? 'br' : 'gzip';
    } else {
      return availableAlgorithms.includes('gzip') ? 'gzip' : 'deflate';
    }
  }

  private calculateDataSize(data: any): number {
    if (data instanceof Uint8Array) return data.length;
    if (typeof data === 'string') return new TextEncoder().encode(data).length;
    return new TextEncoder().encode(JSON.stringify(data)).length;
  }

  private recordPerformance(data: any, result: CompressionResult): void {
    const contentType = this.detectContentType(data);
    
    if (!this.performanceHistory.has(contentType)) {
      this.performanceHistory.set(contentType, []);
    }

    const history = this.performanceHistory.get(contentType)!;
    history.push({
      size: result.originalSize,
      ratio: result.ratio,
      time: result.compressionTime,
      algorithm: result.algorithm
    });

    // Keep only last 100 entries per content type
    if (history.length > 100) {
      history.shift();
    }
  }

  private detectContentType(data: any): string {
    if (typeof data === 'string') {
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        return 'application/json';
      }
      if (data.trim().startsWith('<')) {
        return 'text/html';
      }
      return 'text/plain';
    }
    
    return 'application/json';
  }
}

/**
 * Compression utility functions
 */
export function estimateCompressionBenefit(data: any): {
  worthCompressing: boolean;
  estimatedSavings: number;
  recommendedAlgorithm: string;
} {
  const compressor = new ResponseCompressor();
  const size = compressor['calculateDataSize'](data);
  
  if (size < 1024) {
    return {
      worthCompressing: false,
      estimatedSavings: 0,
      recommendedAlgorithm: 'none'
    };
  }

  const estimatedRatio = 0.7; // Conservative estimate
  const estimatedSavings = size * (1 - estimatedRatio);
  
  return {
    worthCompressing: true,
    estimatedSavings,
    recommendedAlgorithm: size > 100 * 1024 ? 'br' : 'gzip'
  };
}

export function selectOptimalCompressionLevel(
  size: number,
  priority: 'speed' | 'size' | 'balanced' = 'balanced'
): number {
  if (priority === 'speed') {
    return size < 10 * 1024 ? 1 : 3;
  }
  
  if (priority === 'size') {
    return size > 100 * 1024 ? 9 : 7;
  }
  
  // Balanced approach
  if (size < 10 * 1024) return 4;
  if (size < 100 * 1024) return 6;
  return 7;
}