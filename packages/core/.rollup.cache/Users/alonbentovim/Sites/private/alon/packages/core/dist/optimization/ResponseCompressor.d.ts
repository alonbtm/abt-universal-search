/**
 * Response Compressor - Compression system for API responses and cached data
 * @description Implements gzip/deflate compression with selective compression and monitoring
 */
import { CompressionConfig, CompressionResult, IResponseCompressor } from '../types/Performance.js';
/**
 * Response Compressor Implementation
 */
export declare class ResponseCompressor implements IResponseCompressor {
    private config;
    private compressors;
    private statistics;
    constructor(config?: Partial<CompressionConfig>);
    /**
     * Compress response data
     */
    compress(data: any, options?: Partial<CompressionConfig>): Promise<CompressionResult>;
    /**
     * Decompress response data
     */
    decompress(compressed: Uint8Array, algorithm: string): Promise<any>;
    /**
     * Check if data should be compressed
     */
    shouldCompress(data: any, threshold: number): boolean;
    /**
     * Get compression statistics
     */
    getStatistics(): {
        totalCompressions: number;
        totalSavings: number;
        averageRatio: number;
        algorithmUsage: Record<string, number>;
    };
    /**
     * Update compression configuration
     */
    updateConfig(config: Partial<CompressionConfig>): void;
    /**
     * Get optimal compression algorithm for data
     */
    getOptimalAlgorithm(data: any): string;
    /**
     * Compress multiple responses in batch
     */
    compressBatch(items: Array<{
        id: string;
        data: any;
        options?: Partial<CompressionConfig>;
    }>): Promise<Array<{
        id: string;
        result: CompressionResult;
    }>>;
    /**
     * Get compression recommendations
     */
    getCompressionRecommendations(data: any): Array<{
        algorithm: string;
        estimatedRatio: number;
        estimatedTime: number;
        recommendation: 'optimal' | 'good' | 'acceptable' | 'not_recommended';
    }>;
    private convertToUint8Array;
    private convertFromUint8Array;
    private calculateDataSize;
    private detectMimeType;
    private isAlreadyCompressed;
    private selectOptimalAlgorithm;
    private estimateCompression;
    private createUncompressedResult;
    private updateStatistics;
}
/**
 * Streaming Response Compressor for large data
 */
export declare class StreamingResponseCompressor {
    private compressor;
    private chunkSize;
    constructor(config?: Partial<CompressionConfig>, chunkSize?: number);
    /**
     * Compress data in streaming fashion
     */
    compressStream(dataStream: AsyncIterable<any>, algorithm?: string): AsyncGenerator<Uint8Array, void, unknown>;
    private convertToUint8Array;
    private combineChunks;
}
/**
 * Factory function for creating response compressor instances
 */
export declare function createResponseCompressor(config?: Partial<CompressionConfig>): IResponseCompressor;
/**
 * Adaptive Compression Manager
 */
export declare class AdaptiveCompressionManager {
    private compressor;
    private performanceHistory;
    constructor(config?: Partial<CompressionConfig>);
    /**
     * Compress with adaptive algorithm selection
     */
    compressAdaptively(data: any, context?: {
        contentType?: string;
        priority?: 'speed' | 'size' | 'balanced';
        clientCapabilities?: string[];
    }): Promise<CompressionResult>;
    /**
     * Get performance insights
     */
    getPerformanceInsights(): {
        bestAlgorithmBySize: string;
        bestAlgorithmBySpeed: string;
        averageCompressionRatio: number;
        totalDataProcessed: number;
    };
    private selectAdaptiveAlgorithm;
    private calculateDataSize;
    private recordPerformance;
    private detectContentType;
}
/**
 * Compression utility functions
 */
export declare function estimateCompressionBenefit(data: any): {
    worthCompressing: boolean;
    estimatedSavings: number;
    recommendedAlgorithm: string;
};
export declare function selectOptimalCompressionLevel(size: number, priority?: 'speed' | 'size' | 'balanced'): number;
//# sourceMappingURL=ResponseCompressor.d.ts.map