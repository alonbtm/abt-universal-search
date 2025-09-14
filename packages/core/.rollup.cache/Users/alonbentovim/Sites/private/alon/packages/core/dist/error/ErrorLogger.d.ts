import { IErrorLogger, ErrorLogEntry, ErrorReportingConfig, ErrorLogStats, SearchError, ErrorContext } from '../types/ErrorHandling';
export interface ErrorLoggerEvents {
    onLog?: (entry: ErrorLogEntry) => void;
    onFlush?: (entries: ErrorLogEntry[]) => void;
    onSanitizationWarning?: (field: string, value: any) => void;
    onAggregationTriggered?: (fingerprint: string, count: number) => void;
}
export interface LogBuffer {
    entries: ErrorLogEntry[];
    maxSize: number;
    flushThreshold: number;
    lastFlush: number;
}
export declare class ErrorLogger implements IErrorLogger {
    private config;
    private events;
    private stats;
    private buffer;
    private aggregationMap;
    private flushTimer;
    private readonly SENSITIVE_PATTERNS;
    private readonly PII_PATTERNS;
    constructor(config?: Partial<ErrorReportingConfig>, events?: ErrorLoggerEvents);
    private startPeriodicFlush;
    logError(error: SearchError, context?: ErrorContext): void;
    logWarning(message: string, context?: ErrorContext): void;
    logInfo(message: string, context?: ErrorContext): void;
    private shouldLog;
    private sanitizeError;
    private sanitizeContext;
    private sanitizeString;
    private sanitizeStackTrace;
    private sanitizePath;
    private sanitizeMetadata;
    private generateFingerprint;
    private normalizeMessage;
    private hashString;
    private shouldAggregate;
    private generateTags;
    private generateLogId;
    private generateCorrelationId;
    private getEnvironment;
    private getVersion;
    private addToBuffer;
    private updateStats;
    private updateTopErrors;
    flush(): Promise<void>;
    private flushToConsole;
    private flushToStorage;
    private flushToRemote;
    private createBatches;
    private sendBatch;
    getStats(): ErrorLogStats;
    setConfig(config: Partial<ErrorReportingConfig>): void;
    clearStats(): void;
    exportLogs(): string;
    testSanitization(input: string): string;
    dispose(): void;
}
//# sourceMappingURL=ErrorLogger.d.ts.map