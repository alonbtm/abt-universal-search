import {
  IErrorLogger,
  ErrorLogEntry,
  SanitizedError,
  SanitizedContext,
  ErrorReportingConfig,
  ErrorLogStats,
  SearchError,
  ErrorContext,
  ErrorType,
  ErrorSeverity,
} from '../types/ErrorHandling';

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

export class ErrorLogger implements IErrorLogger {
  private config: Required<ErrorReportingConfig>;
  private events: ErrorLoggerEvents;
  private stats: ErrorLogStats;
  private buffer: LogBuffer;
  private aggregationMap: Map<string, { count: number; lastSeen: number; firstSeen: number }> =
    new Map();
  private flushTimer: NodeJS.Timeout | null = null;

  // Sensitive data patterns to remove/replace
  private readonly SENSITIVE_PATTERNS = [
    /password['":\s]*['"]\w+['"]/gi,
    /token['":\s]*['"]\w+['"]/gi,
    /key['":\s]*['"]\w+['"]/gi,
    /secret['":\s]*['"]\w+['"]/gi,
    /authorization['":\s]*['"]\w+['"]/gi,
    /cookie['":\s]*['"]\w+['"]/gi,
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses (optional)
  ];

  private readonly PII_PATTERNS = [
    /\b(?:name|firstname|lastname|email|phone|address)\s*['":\s]*['"]\w+['"]/gi,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses (optional)
  ];

  constructor(config?: Partial<ErrorReportingConfig>, events: ErrorLoggerEvents = {}) {
    this.config = {
      enableReporting: true,
      reportingLevel: 'error',
      sanitization: {
        enableStackTrace: true,
        enableContext: true,
        enableUserData: false,
        removePatterns: this.SENSITIVE_PATTERNS,
        replacePatterns: [
          { pattern: /password/gi, replacement: '[PASSWORD]' },
          { pattern: /token/gi, replacement: '[TOKEN]' },
          { pattern: /key/gi, replacement: '[KEY]' },
          { pattern: /secret/gi, replacement: '[SECRET]' },
        ],
      },
      aggregation: {
        enableAggregation: true,
        aggregationWindow: 300000, // 5 minutes
        maxDuplicates: 10,
      },
      destination: {
        console: true,
        storage: false,
        remote: undefined,
      },
      ...config,
    };

    this.events = events;

    this.stats = {
      totalErrors: 0,
      errorsByType: {} as Record<ErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recentErrors: [],
      topErrors: [],
    };

    this.buffer = {
      entries: [],
      maxSize: 100,
      flushThreshold: 10,
      lastFlush: Date.now(),
    };

    this.startPeriodicFlush();
  }

  private startPeriodicFlush(): void {
    const flushInterval = this.config.destination.remote?.flushInterval || 30000; // 30 seconds

    this.flushTimer = setInterval(() => {
      this.flush();
    }, flushInterval);
  }

  public logError(error: SearchError, context?: ErrorContext): void {
    if (!this.config.enableReporting) return;
    if (!this.shouldLog('error')) return;

    const sanitizedError = this.sanitizeError(error);
    const sanitizedContext = this.sanitizeContext(context);
    const fingerprint = this.generateFingerprint(error);

    // Check for aggregation
    if (this.config.aggregation.enableAggregation) {
      if (this.shouldAggregate(fingerprint)) {
        this.events.onAggregationTriggered?.(
          fingerprint,
          this.aggregationMap.get(fingerprint)!.count
        );
        return;
      }
    }

    const logEntry: ErrorLogEntry = {
      id: this.generateLogId(),
      correlationId: error.correlationId,
      timestamp: Date.now(),
      level: 'error',
      error: sanitizedError,
      context: sanitizedContext,
      tags: this.generateTags(error, context),
      fingerprint,
      environment: this.getEnvironment(),
      version: this.getVersion(),
    };

    this.addToBuffer(logEntry);
    this.updateStats(error);
    this.events.onLog?.(logEntry);
  }

  public logWarning(message: string, context?: ErrorContext): void {
    if (!this.shouldLog('warn')) return;

    const warningError: SearchError = {
      name: 'Warning',
      message,
      type: 'system',
      code: 'WARNING',
      severity: 'medium',
      recoverability: 'recoverable',
      timestamp: Date.now(),
      correlationId: this.generateCorrelationId(),
    };

    this.logError(warningError, context);
  }

  public logInfo(message: string, context?: ErrorContext): void {
    if (!this.shouldLog('info')) return;

    const infoError: SearchError = {
      name: 'Info',
      message,
      type: 'system',
      code: 'INFO',
      severity: 'info',
      recoverability: 'recoverable',
      timestamp: Date.now(),
      correlationId: this.generateCorrelationId(),
    };

    this.logError(infoError, context);
  }

  private shouldLog(level: 'error' | 'warn' | 'info' | 'debug'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.reportingLevel);
    const logLevelIndex = levels.indexOf(level);

    return logLevelIndex >= currentLevelIndex;
  }

  private sanitizeError(error: SearchError): SanitizedError {
    const sanitized: SanitizedError = {
      type: error.type,
      code: error.code,
      message: this.sanitizeString(error.message),
      severity: error.severity,
      stack: undefined,
      cause: undefined,
    };

    // Include stack trace if enabled and available
    if (this.config.sanitization.enableStackTrace && error.originalError?.stack) {
      sanitized.stack = this.sanitizeStackTrace(error.originalError.stack);
    }

    // Handle nested errors
    if (error.originalError && 'cause' in error.originalError && error.originalError.cause) {
      sanitized.cause = this.sanitizeError(error.originalError.cause as SearchError);
    }

    return sanitized;
  }

  private sanitizeContext(context?: ErrorContext): SanitizedContext {
    if (!context || !this.config.sanitization.enableContext) {
      return {};
    }

    const sanitized: SanitizedContext = {};

    // Safe context fields
    if (context.adapter) {
      sanitized.adapter = context.adapter;
    }

    if (context.operation?.name) {
      sanitized.operation = context.operation.name;
    }

    if (context.operation?.duration) {
      sanitized.duration = context.operation.duration;
    }

    if (context.operation?.retryCount) {
      sanitized.retryCount = context.operation.retryCount;
    }

    // System information (generally safe)
    if (context.system) {
      sanitized.system = {
        version: context.system.version,
        environment: context.system.environment,
      };
    }

    // Request information (with sanitization)
    if (context.request) {
      sanitized.request = {
        method: context.request.method,
        path: this.sanitizePath(context.request.url),
        statusCode: Number(context.request.headers?.status) || undefined,
      };
    }

    // Metadata (with heavy sanitization)
    if (context.metadata) {
      sanitized.metadata = this.sanitizeMetadata(context.metadata);
    }

    return sanitized;
  }

  private sanitizeString(text: string): string {
    let sanitized = text;

    // Apply removal patterns
    this.config.sanitization.removePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REMOVED]');
    });

    // Apply replacement patterns
    this.config.sanitization.replacePatterns.forEach(({ pattern, replacement }) => {
      sanitized = sanitized.replace(pattern, replacement);
    });

    // Remove PII if user data is disabled
    if (!this.config.sanitization.enableUserData) {
      this.PII_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[PII]');
      });
    }

    return sanitized;
  }

  private sanitizeStackTrace(stack: string): string[] {
    return stack
      .split('\n')
      .map(line => this.sanitizeString(line))
      .filter(line => line.length > 0)
      .slice(0, 10); // Limit stack trace depth
  }

  private sanitizePath(path?: string): string | undefined {
    if (!path) return undefined;

    // Remove query parameters that might contain sensitive data
    const url = new URL(path, 'http://localhost');
    return url.pathname;
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    const safeKeys = ['query', 'adapter', 'timeout', 'retries', 'source'];

    for (const [key, value] of Object.entries(metadata)) {
      if (safeKeys.includes(key.toLowerCase())) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  private generateFingerprint(error: SearchError): string {
    // Create a fingerprint based on error characteristics
    const components = [
      error.type,
      error.code,
      this.normalizeMessage(error.message),
      error.context?.adapter || 'unknown',
    ];

    const fingerprint = components.join('|');
    return this.hashString(fingerprint);
  }

  private normalizeMessage(message: string): string {
    // Normalize error message for fingerprinting
    return message
      .toLowerCase()
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private shouldAggregate(fingerprint: string): boolean {
    const existing = this.aggregationMap.get(fingerprint);
    const now = Date.now();

    if (!existing) {
      this.aggregationMap.set(fingerprint, {
        count: 1,
        lastSeen: now,
        firstSeen: now,
      });
      return false;
    }

    // Check if within aggregation window
    const windowStart = now - this.config.aggregation.aggregationWindow;
    if (existing.firstSeen < windowStart) {
      // Reset aggregation for new window
      this.aggregationMap.set(fingerprint, {
        count: 1,
        lastSeen: now,
        firstSeen: now,
      });
      return false;
    }

    // Update existing aggregation
    existing.count++;
    existing.lastSeen = now;

    // Check if should aggregate
    return existing.count > this.config.aggregation.maxDuplicates;
  }

  private generateTags(error: SearchError, context?: ErrorContext): string[] {
    const tags: string[] = [
      `type:${error.type}`,
      `severity:${error.severity}`,
      `recoverable:${error.recoverability}`,
    ];

    if (context?.adapter) {
      tags.push(`adapter:${context.adapter}`);
    }

    if (context?.system?.environment) {
      tags.push(`env:${context.system.environment}`);
    }

    if (context?.operation?.retryCount && context.operation.retryCount > 0) {
      tags.push('retry');
    }

    return tags;
  }

  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEnvironment(): string {
    if (typeof window !== 'undefined') return 'browser';
    if (typeof process !== 'undefined') return process.env.NODE_ENV || 'development';
    return 'unknown';
  }

  private getVersion(): string {
    // In a real implementation, this would come from package.json or build info
    return '1.0.0';
  }

  private addToBuffer(entry: ErrorLogEntry): void {
    this.buffer.entries.push(entry);

    // Update recent errors (keep last 50)
    this.stats.recentErrors.push(entry);
    if (this.stats.recentErrors.length > 50) {
      this.stats.recentErrors.shift();
    }

    // Trigger flush if threshold reached
    if (this.buffer.entries.length >= this.buffer.flushThreshold) {
      this.flush();
    }
  }

  private updateStats(error: SearchError): void {
    this.stats.totalErrors++;

    // Update type breakdown
    if (!this.stats.errorsByType[error.type]) {
      this.stats.errorsByType[error.type] = 0;
    }
    this.stats.errorsByType[error.type]++;

    // Update severity breakdown
    if (!this.stats.errorsBySeverity[error.severity]) {
      this.stats.errorsBySeverity[error.severity] = 0;
    }
    this.stats.errorsBySeverity[error.severity]++;

    // Update top errors
    this.updateTopErrors(error);
  }

  private updateTopErrors(error: SearchError): void {
    const fingerprint = this.generateFingerprint(error);
    const existing = this.stats.topErrors.find(te => te.fingerprint === fingerprint);

    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
    } else {
      this.stats.topErrors.push({
        fingerprint,
        count: 1,
        lastSeen: Date.now(),
      });
    }

    // Keep only top 20 errors, sorted by count
    this.stats.topErrors.sort((a, b) => b.count - a.count);
    if (this.stats.topErrors.length > 20) {
      this.stats.topErrors = this.stats.topErrors.slice(0, 20);
    }
  }

  public async flush(): Promise<void> {
    if (this.buffer.entries.length === 0) return;

    const entriesToFlush = [...this.buffer.entries];
    this.buffer.entries = [];
    this.buffer.lastFlush = Date.now();

    this.events.onFlush?.(entriesToFlush);

    // Send to destinations
    const promises: Promise<void>[] = [];

    if (this.config.destination.console) {
      promises.push(this.flushToConsole(entriesToFlush));
    }

    if (this.config.destination.storage) {
      promises.push(this.flushToStorage(entriesToFlush));
    }

    if (this.config.destination.remote) {
      promises.push(this.flushToRemote(entriesToFlush));
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      // Re-add entries to buffer if flush failed
      this.buffer.entries.unshift(...entriesToFlush);
      throw error;
    }
  }

  private async flushToConsole(entries: ErrorLogEntry[]): Promise<void> {
    entries.forEach(entry => {
      const logMethod =
        entry.level === 'error'
          ? console.error
          : entry.level === 'warn'
            ? console.warn
            : console.log;

      logMethod(`[${entry.level.toUpperCase()}] ${entry.error.message}`, {
        id: entry.id,
        fingerprint: entry.fingerprint,
        tags: entry.tags,
        context: entry.context,
      });
    });
  }

  private async flushToStorage(entries: ErrorLogEntry[]): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      const existing = localStorage.getItem('error-logs');
      const logs = existing ? JSON.parse(existing) : [];

      logs.push(...entries);

      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      localStorage.setItem('error-logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to store error logs:', error);
    }
  }

  private async flushToRemote(entries: ErrorLogEntry[]): Promise<void> {
    const remote = this.config.destination.remote!;

    const batches = this.createBatches(entries, remote.batchSize);

    for (const batch of batches) {
      await this.sendBatch(batch, remote);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async sendBatch(
    entries: ErrorLogEntry[],
    remote: NonNullable<ErrorReportingConfig['destination']['remote']>
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (remote.apiKey) {
      headers['Authorization'] = `Bearer ${remote.apiKey}`;
    }

    const response = await fetch(remote.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ errors: entries }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send error logs: ${response.status} ${response.statusText}`);
    }
  }

  public getStats(): ErrorLogStats {
    return { ...this.stats };
  }

  public setConfig(config: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...config } as Required<ErrorReportingConfig>;
  }

  public clearStats(): void {
    this.stats = {
      totalErrors: 0,
      errorsByType: {} as Record<ErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recentErrors: [],
      topErrors: [],
    };
  }

  public exportLogs(): string {
    return JSON.stringify(
      {
        stats: this.stats,
        buffer: this.buffer.entries,
        config: this.config,
      },
      null,
      2
    );
  }

  public testSanitization(input: string): string {
    return this.sanitizeString(input);
  }

  public dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    this.flush().catch(console.error);
  }
}
