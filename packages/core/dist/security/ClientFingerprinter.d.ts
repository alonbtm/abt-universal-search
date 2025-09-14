/**
 * Client Fingerprinter - Track usage patterns to identify and throttle abusive behavior
 * @description Implements client behavior tracking and abuse detection with privacy compliance
 */
import type { ClientFingerprintConfig, ClientFingerprint, IClientFingerprinter } from '../types/RateLimiting';
/**
 * Client fingerprinter with behavior tracking and abuse detection
 */
export declare class ClientFingerprinter implements IClientFingerprinter {
    private config;
    private fingerprints;
    private sessionStartTimes;
    constructor(config: ClientFingerprintConfig);
    /**
     * Generate client fingerprint
     */
    generateFingerprint(): Promise<ClientFingerprint>;
    /**
     * Update behavior data
     */
    updateBehavior(clientId: string, behaviorData: Partial<ClientFingerprint['behaviorFingerprint']>): void;
    /**
     * Check if client should be throttled
     */
    shouldThrottle(clientId: string): {
        shouldThrottle: boolean;
        throttleLevel: ClientFingerprint['throttleLevel'];
        reason: string;
    };
    /**
     * Get client fingerprint
     */
    getFingerprint(clientId: string): ClientFingerprint | null;
    /**
     * Clean up expired fingerprints
     */
    cleanup(): void;
    /**
     * Generate unique client ID
     */
    private generateClientId;
    /**
     * Start cleanup interval
     */
    private startCleanupInterval;
    /**
     * Get all client fingerprints (for debugging)
     */
    getAllFingerprints(): ClientFingerprint[];
    /**
     * Get suspicious clients
     */
    getSuspiciousClients(): ClientFingerprint[];
    /**
     * Get throttled clients
     */
    getThrottledClients(): ClientFingerprint[];
    /**
     * Update configuration
     */
    updateConfig(config: Partial<ClientFingerprintConfig>): void;
    /**
     * Reset client fingerprint
     */
    resetClient(clientId: string): void;
    /**
     * Get fingerprinting statistics
     */
    getStatistics(): {
        totalClients: number;
        suspiciousClients: number;
        throttledClients: number;
        averageSuspiciousScore: number;
        throttleLevelDistribution: Record<ClientFingerprint['throttleLevel'], number>;
    };
}
/**
 * Default client fingerprint configuration
 */
export declare const defaultClientFingerprintConfig: ClientFingerprintConfig;
/**
 * Create client fingerprinter with default configuration
 */
export declare function createClientFingerprinter(config?: Partial<ClientFingerprintConfig>): ClientFingerprinter;
//# sourceMappingURL=ClientFingerprinter.d.ts.map