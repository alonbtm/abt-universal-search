interface LegacySystemConfig {
    name: string;
    type: 'mainframe' | 'soap' | 'ftp' | 'edi' | 'csv' | 'xml' | 'fixed-width' | 'cobol' | 'custom';
    connection: {
        host: string;
        port: number;
        protocol: 'tcp' | 'http' | 'https' | 'ftp' | 'sftp' | 'ssh';
        authentication: {
            type: 'none' | 'basic' | 'certificate' | 'kerberos' | 'ntlm';
            credentials?: Record<string, string>;
        };
        timeout: number;
        retries: number;
        keepAlive: boolean;
    };
    dataFormat: {
        encoding: 'ascii' | 'utf8' | 'utf16' | 'ebcdic' | 'binary';
        delimiter?: string;
        recordLength?: number;
        fields?: FieldDefinition[];
    };
    transformation: {
        enabled: boolean;
        rules: TransformationRule[];
        validation: ValidationRule[];
    };
    scheduling: {
        enabled: boolean;
        frequency: string; // cron expression
        batchSize: number;
        parallelProcessing: boolean;
    };
}

interface FieldDefinition {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'binary';
    position?: number;
    length?: number;
    format?: string; // date format, number format, etc.
    required: boolean;
    defaultValue?: any;
}

interface TransformationRule {
    sourceField: string;
    targetField: string;
    operation: 'copy' | 'map' | 'calculate' | 'format' | 'split' | 'join';
    parameters?: Record<string, any>;
    condition?: string;
}

interface ValidationRule {
    field: string;
    rule: 'required' | 'length' | 'format' | 'range' | 'custom';
    parameters?: Record<string, any>;
    errorMessage: string;
}

interface DataExchangeRecord {
    id: string;
    timestamp: Date;
    source: string;
    destination: string;
    operation: 'import' | 'export' | 'sync';
    status: 'pending' | 'processing' | 'success' | 'failed' | 'partial';
    recordCount: number;
    processedCount: number;
    errorCount: number;
    errors: ProcessingError[];
    metadata: Record<string, any>;
}

interface ProcessingError {
    record: number;
    field?: string;
    error: string;
    severity: 'warning' | 'error' | 'critical';
    originalData?: any;
}

interface SyncResult {
    success: boolean;
    recordsProcessed: number;
    recordsSuccess: number;
    recordsError: number;
    errors: ProcessingError[];
    duration: number;
    metadata: Record<string, any>;
}

export abstract class LegacySystemAdapter {
    protected config: LegacySystemConfig;
    protected connected = false;
    protected exchangeHistory: DataExchangeRecord[] = [];

    constructor(config: LegacySystemConfig) {
        this.config = config;
    }

    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract testConnection(): Promise<boolean>;
    abstract exportData(data: any[]): Promise<SyncResult>;
    abstract importData(): Promise<{ data: any[]; metadata: Record<string, any> }>;

    protected transformData(data: any[], direction: 'import' | 'export'): any[] {
        if (!this.config.transformation.enabled) {
            return data;
        }

        return data.map((record, index) => {
            const transformed: any = {};
            const errors: ProcessingError[] = [];

            for (const rule of this.config.transformation.rules) {
                try {
                    const value = this.applyTransformationRule(record, rule);
                    if (value !== undefined) {
                        transformed[rule.targetField] = value;
                    }
                } catch (error) {
                    errors.push({
                        record: index,
                        field: rule.targetField,
                        error: error instanceof Error ? error.message : String(error),
                        severity: 'error',
                        originalData: record[rule.sourceField]
                    });
                }
            }

            // Validate transformed data
            const validationErrors = this.validateRecord(transformed, index);
            errors.push(...validationErrors);

            if (errors.length > 0) {
                throw new Error(`Transformation errors: ${errors.map(e => e.error).join(', ')}`);
            }

            return transformed;
        });
    }

    private applyTransformationRule(record: any, rule: TransformationRule): any {
        const sourceValue = record[rule.sourceField];

        switch (rule.operation) {
            case 'copy':
                return sourceValue;

            case 'map':
                const mapping = rule.parameters?.mapping as Record<string, any>;
                return mapping?.[sourceValue] || rule.parameters?.defaultValue;

            case 'calculate':
                return this.evaluateExpression(rule.parameters?.expression || '', record);

            case 'format':
                return this.formatValue(sourceValue, rule.parameters?.format || '');

            case 'split':
                if (typeof sourceValue === 'string') {
                    const delimiter = rule.parameters?.delimiter || ',';
                    const index = rule.parameters?.index || 0;
                    return sourceValue.split(delimiter)[index];
                }
                return sourceValue;

            case 'join':
                const fields = rule.parameters?.fields as string[] || [];
                const delimiter = rule.parameters?.delimiter || '';
                return fields.map(field => record[field] || '').join(delimiter);

            default:
                return sourceValue;
        }
    }

    private evaluateExpression(expression: string, record: any): any {
        // Simple expression evaluation (in production, use a proper expression engine)
        try {
            // Replace field references with actual values
            let processedExpression = expression;
            for (const [key, value] of Object.entries(record)) {
                const regex = new RegExp(`\\b${key}\\b`, 'g');
                processedExpression = processedExpression.replace(regex, JSON.stringify(value));
            }

            // Basic math operations only
            if (/^[\d\s+\-*/.()]+$/.test(processedExpression)) {
                return Function(`"use strict"; return (${processedExpression})`)();
            }

            return expression;
        } catch {
            return expression;
        }
    }

    private formatValue(value: any, format: string): any {
        if (value === null || value === undefined) return value;

        switch (format) {
            case 'uppercase':
                return String(value).toUpperCase();
            case 'lowercase':
                return String(value).toLowerCase();
            case 'trim':
                return String(value).trim();
            case 'currency':
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
            default:
                return value;
        }
    }

    private validateRecord(record: any, recordIndex: number): ProcessingError[] {
        const errors: ProcessingError[] = [];

        for (const rule of this.config.transformation.validation) {
            const value = record[rule.field];

            switch (rule.rule) {
                case 'required':
                    if (value === null || value === undefined || value === '') {
                        errors.push({
                            record: recordIndex,
                            field: rule.field,
                            error: rule.errorMessage,
                            severity: 'error'
                        });
                    }
                    break;

                case 'length':
                    const minLength = rule.parameters?.min || 0;
                    const maxLength = rule.parameters?.max || Infinity;
                    const valueLength = String(value || '').length;

                    if (valueLength < minLength || valueLength > maxLength) {
                        errors.push({
                            record: recordIndex,
                            field: rule.field,
                            error: rule.errorMessage,
                            severity: 'error'
                        });
                    }
                    break;

                case 'format':
                    const pattern = rule.parameters?.pattern;
                    if (pattern && !new RegExp(pattern).test(String(value || ''))) {
                        errors.push({
                            record: recordIndex,
                            field: rule.field,
                            error: rule.errorMessage,
                            severity: 'error'
                        });
                    }
                    break;

                case 'range':
                    const numValue = Number(value);
                    const min = rule.parameters?.min;
                    const max = rule.parameters?.max;

                    if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
                        errors.push({
                            record: recordIndex,
                            field: rule.field,
                            error: rule.errorMessage,
                            severity: 'error'
                        });
                    }
                    break;
            }
        }

        return errors;
    }

    protected recordExchange(operation: DataExchangeRecord['operation'], result: SyncResult): void {
        const record: DataExchangeRecord = {
            id: this.generateExchangeId(),
            timestamp: new Date(),
            source: this.config.name,
            destination: 'universal-search',
            operation,
            status: result.success ? 'success' : 'failed',
            recordCount: result.recordsProcessed,
            processedCount: result.recordsSuccess,
            errorCount: result.recordsError,
            errors: result.errors,
            metadata: result.metadata
        };

        this.exchangeHistory.push(record);

        // Keep only last 100 records
        if (this.exchangeHistory.length > 100) {
            this.exchangeHistory = this.exchangeHistory.slice(-100);
        }
    }

    protected generateExchangeId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    getExchangeHistory(limit = 50): DataExchangeRecord[] {
        return this.exchangeHistory
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    getStatistics(): {
        totalExchanges: number;
        successRate: number;
        averageRecordsPerExchange: number;
        lastExchange?: Date;
        errorsByType: Record<string, number>;
    } {
        const totalExchanges = this.exchangeHistory.length;
        const successful = this.exchangeHistory.filter(r => r.status === 'success').length;
        const successRate = totalExchanges > 0 ? (successful / totalExchanges) * 100 : 0;

        const totalRecords = this.exchangeHistory.reduce((sum, r) => sum + r.recordCount, 0);
        const averageRecordsPerExchange = totalExchanges > 0 ? totalRecords / totalExchanges : 0;

        const lastExchange = this.exchangeHistory.length > 0
            ? this.exchangeHistory[this.exchangeHistory.length - 1].timestamp
            : undefined;

        const errorsByType: Record<string, number> = {};
        this.exchangeHistory.forEach(record => {
            record.errors.forEach(error => {
                errorsByType[error.error] = (errorsByType[error.error] || 0) + 1;
            });
        });

        return {
            totalExchanges,
            successRate,
            averageRecordsPerExchange,
            lastExchange,
            errorsByType
        };
    }
}

export class MainframeAdapter extends LegacySystemAdapter {
    private connection: any;

    async connect(): Promise<void> {
        try {
            // Simulated mainframe connection (in production, use tn3270 or similar)
            this.connection = {
                send: async (data: string) => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return 'OK';
                },
                receive: async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return 'DATA_RESPONSE';
                }
            };

            this.connected = true;
            console.log(`Mainframe connection established: ${this.config.name}`);
        } catch (error) {
            console.error('Failed to connect to mainframe:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.connection) {
            this.connection = null;
            this.connected = false;
            console.log(`Mainframe connection closed: ${this.config.name}`);
        }
    }

    async testConnection(): Promise<boolean> {
        if (!this.connected || !this.connection) return false;

        try {
            await this.connection.send('PING');
            return true;
        } catch {
            return false;
        }
    }

    async exportData(data: any[]): Promise<SyncResult> {
        if (!this.connected) {
            throw new Error('Not connected to mainframe');
        }

        const startTime = Date.now();
        const errors: ProcessingError[] = [];
        let successCount = 0;

        try {
            // Transform data to mainframe format
            const transformedData = this.transformData(data, 'export');

            // Convert to fixed-width format
            const fixedWidthData = transformedData.map((record, index) => {
                try {
                    return this.formatFixedWidth(record);
                } catch (error) {
                    errors.push({
                        record: index,
                        error: error instanceof Error ? error.message : String(error),
                        severity: 'error',
                        originalData: record
                    });
                    return null;
                }
            }).filter(Boolean);

            // Send data to mainframe
            for (const record of fixedWidthData) {
                try {
                    await this.connection.send(record);
                    successCount++;
                } catch (error) {
                    errors.push({
                        record: successCount,
                        error: error instanceof Error ? error.message : String(error),
                        severity: 'error'
                    });
                }
            }

            const result: SyncResult = {
                success: errors.length === 0,
                recordsProcessed: data.length,
                recordsSuccess: successCount,
                recordsError: errors.length,
                errors,
                duration: Date.now() - startTime,
                metadata: { format: 'fixed-width', encoding: this.config.dataFormat.encoding }
            };

            this.recordExchange('export', result);
            return result;

        } catch (error) {
            const result: SyncResult = {
                success: false,
                recordsProcessed: data.length,
                recordsSuccess: 0,
                recordsError: data.length,
                errors: [{ record: 0, error: error instanceof Error ? error.message : String(error), severity: 'critical' }],
                duration: Date.now() - startTime,
                metadata: {}
            };

            this.recordExchange('export', result);
            return result;
        }
    }

    async importData(): Promise<{ data: any[]; metadata: Record<string, any> }> {
        if (!this.connected) {
            throw new Error('Not connected to mainframe');
        }

        try {
            // Receive data from mainframe
            const rawData = await this.connection.receive();

            // Parse fixed-width data
            const records = this.parseFixedWidth(rawData);

            // Transform data from mainframe format
            const transformedData = this.transformData(records, 'import');

            return {
                data: transformedData,
                metadata: {
                    format: 'fixed-width',
                    encoding: this.config.dataFormat.encoding,
                    recordCount: transformedData.length
                }
            };

        } catch (error) {
            throw new Error(`Mainframe import failed: ${error}`);
        }
    }

    private formatFixedWidth(record: any): string {
        if (!this.config.dataFormat.fields) {
            throw new Error('Field definitions required for fixed-width format');
        }

        let result = '';
        for (const field of this.config.dataFormat.fields) {
            const value = String(record[field.name] || field.defaultValue || '');
            const length = field.length || 10;

            if (value.length > length) {
                result += value.substring(0, length);
            } else {
                result += value.padEnd(length);
            }
        }

        return result;
    }

    private parseFixedWidth(data: string): any[] {
        if (!this.config.dataFormat.fields) {
            throw new Error('Field definitions required for fixed-width format');
        }

        const records: any[] = [];
        const lines = data.split('\n').filter(line => line.trim());

        for (const line of lines) {
            const record: any = {};
            let position = 0;

            for (const field of this.config.dataFormat.fields) {
                const length = field.length || 10;
                const value = line.substring(position, position + length).trim();

                record[field.name] = this.convertValue(value, field.type, field.format);
                position += length;
            }

            records.push(record);
        }

        return records;
    }

    private convertValue(value: string, type: FieldDefinition['type'], format?: string): any {
        if (!value) return null;

        switch (type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return value.toLowerCase() === 'true' || value === '1';
            case 'date':
                return format ? this.parseDate(value, format) : new Date(value);
            default:
                return value;
        }
    }

    private parseDate(value: string, format: string): Date {
        // Simple date parsing (in production, use a proper date library)
        if (format === 'YYYYMMDD') {
            const year = parseInt(value.substring(0, 4));
            const month = parseInt(value.substring(4, 6)) - 1;
            const day = parseInt(value.substring(6, 8));
            return new Date(year, month, day);
        }
        return new Date(value);
    }
}

export class SOAPAdapter extends LegacySystemAdapter {
    private soapClient: any;

    async connect(): Promise<void> {
        try {
            // Simulated SOAP client (in production, use a SOAP library)
            this.soapClient = {
                call: async (method: string, params: any) => {
                    await new Promise(resolve => setTimeout(resolve, 200));

                    if (method === 'GetData') {
                        return {
                            GetDataResponse: {
                                Records: [
                                    { ID: 1, Name: 'Test Record', Status: 'Active' }
                                ]
                            }
                        };
                    }

                    return { Success: true };
                }
            };

            this.connected = true;
            console.log(`SOAP connection established: ${this.config.name}`);
        } catch (error) {
            console.error('Failed to connect to SOAP service:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.soapClient) {
            this.soapClient = null;
            this.connected = false;
            console.log(`SOAP connection closed: ${this.config.name}`);
        }
    }

    async testConnection(): Promise<boolean> {
        if (!this.connected || !this.soapClient) return false;

        try {
            await this.soapClient.call('Ping', {});
            return true;
        } catch {
            return false;
        }
    }

    async exportData(data: any[]): Promise<SyncResult> {
        if (!this.connected) {
            throw new Error('Not connected to SOAP service');
        }

        const startTime = Date.now();
        const errors: ProcessingError[] = [];
        let successCount = 0;

        try {
            const transformedData = this.transformData(data, 'export');

            for (const [index, record] of transformedData.entries()) {
                try {
                    await this.soapClient.call('InsertRecord', { Record: record });
                    successCount++;
                } catch (error) {
                    errors.push({
                        record: index,
                        error: error instanceof Error ? error.message : String(error),
                        severity: 'error',
                        originalData: record
                    });
                }
            }

            const result: SyncResult = {
                success: errors.length === 0,
                recordsProcessed: data.length,
                recordsSuccess: successCount,
                recordsError: errors.length,
                errors,
                duration: Date.now() - startTime,
                metadata: { protocol: 'SOAP', endpoint: this.config.connection.host }
            };

            this.recordExchange('export', result);
            return result;

        } catch (error) {
            const result: SyncResult = {
                success: false,
                recordsProcessed: data.length,
                recordsSuccess: 0,
                recordsError: data.length,
                errors: [{ record: 0, error: error instanceof Error ? error.message : String(error), severity: 'critical' }],
                duration: Date.now() - startTime,
                metadata: {}
            };

            this.recordExchange('export', result);
            return result;
        }
    }

    async importData(): Promise<{ data: any[]; metadata: Record<string, any> }> {
        if (!this.connected) {
            throw new Error('Not connected to SOAP service');
        }

        try {
            const response = await this.soapClient.call('GetData', {});
            const rawData = response.GetDataResponse?.Records || [];

            const transformedData = this.transformData(rawData, 'import');

            return {
                data: transformedData,
                metadata: {
                    protocol: 'SOAP',
                    endpoint: this.config.connection.host,
                    recordCount: transformedData.length
                }
            };

        } catch (error) {
            throw new Error(`SOAP import failed: ${error}`);
        }
    }
}

export class EDIAdapter extends LegacySystemAdapter {
    async connect(): Promise<void> {
        this.connected = true;
        console.log(`EDI adapter initialized: ${this.config.name}`);
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        console.log(`EDI adapter closed: ${this.config.name}`);
    }

    async testConnection(): Promise<boolean> {
        return this.connected;
    }

    async exportData(data: any[]): Promise<SyncResult> {
        const startTime = Date.now();
        const errors: ProcessingError[] = [];

        try {
            const transformedData = this.transformData(data, 'export');
            const ediDocument = this.formatEDI(transformedData);

            // In production, this would send the EDI document to the trading partner
            console.log('EDI document generated:', ediDocument.substring(0, 200) + '...');

            const result: SyncResult = {
                success: true,
                recordsProcessed: data.length,
                recordsSuccess: data.length,
                recordsError: 0,
                errors: [],
                duration: Date.now() - startTime,
                metadata: { format: 'EDI', documentType: 'X12' }
            };

            this.recordExchange('export', result);
            return result;

        } catch (error) {
            const result: SyncResult = {
                success: false,
                recordsProcessed: data.length,
                recordsSuccess: 0,
                recordsError: data.length,
                errors: [{ record: 0, error: error instanceof Error ? error.message : String(error), severity: 'critical' }],
                duration: Date.now() - startTime,
                metadata: {}
            };

            this.recordExchange('export', result);
            return result;
        }
    }

    async importData(): Promise<{ data: any[]; metadata: Record<string, any> }> {
        try {
            // Simulated EDI document parsing
            const ediDocument = "ISA*00*          *00*          *01*123456789      *01*987654321      *200101*1000*U*00401*000000001*0*P*>~";
            const records = this.parseEDI(ediDocument);
            const transformedData = this.transformData(records, 'import');

            return {
                data: transformedData,
                metadata: {
                    format: 'EDI',
                    documentType: 'X12',
                    recordCount: transformedData.length
                }
            };

        } catch (error) {
            throw new Error(`EDI import failed: ${error}`);
        }
    }

    private formatEDI(data: any[]): string {
        // Simplified EDI formatting
        let edi = "ISA*00*          *00*          *01*123456789      *01*987654321      *" +
                  new Date().toISOString().replace(/[-:]/g, '').substring(0, 12) + "*U*00401*000000001*0*P*>~\n";

        data.forEach((record, index) => {
            edi += `ST*850*${index + 1}~\n`;
            edi += `BEG*00*SA*${record.orderNumber || ''}*${new Date().toISOString().substring(0, 10).replace(/-/g, '')}~\n`;
            edi += `SE*${index + 3}*${index + 1}~\n`;
        });

        edi += "GE*1*1~\nIEA*1*000000001~";
        return edi;
    }

    private parseEDI(ediDocument: string): any[] {
        // Simplified EDI parsing
        const segments = ediDocument.split('~');
        const records: any[] = [];

        for (const segment of segments) {
            if (segment.startsWith('BEG*')) {
                const fields = segment.split('*');
                records.push({
                    transactionType: fields[1],
                    orderNumber: fields[3],
                    date: fields[4]
                });
            }
        }

        return records;
    }
}

export class LegacySystemManager {
    private adapters = new Map<string, LegacySystemAdapter>();

    registerAdapter(name: string, adapter: LegacySystemAdapter): void {
        this.adapters.set(name, adapter);
        console.log(`Legacy system adapter registered: ${name}`);
    }

    getAdapter(name: string): LegacySystemAdapter {
        const adapter = this.adapters.get(name);
        if (!adapter) {
            throw new Error(`Legacy system adapter not found: ${name}`);
        }
        return adapter;
    }

    async connectAll(): Promise<void> {
        for (const [name, adapter] of this.adapters) {
            try {
                await adapter.connect();
            } catch (error) {
                console.error(`Failed to connect adapter ${name}:`, error);
            }
        }
    }

    async disconnectAll(): Promise<void> {
        for (const [name, adapter] of this.adapters) {
            try {
                await adapter.disconnect();
            } catch (error) {
                console.error(`Failed to disconnect adapter ${name}:`, error);
            }
        }
    }

    async testAllConnections(): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        for (const [name, adapter] of this.adapters) {
            try {
                results[name] = await adapter.testConnection();
            } catch (error) {
                results[name] = false;
            }
        }

        return results;
    }

    getAllStatistics(): Record<string, any> {
        const stats: Record<string, any> = {};

        for (const [name, adapter] of this.adapters) {
            stats[name] = adapter.getStatistics();
        }

        return stats;
    }

    getAdapterNames(): string[] {
        return Array.from(this.adapters.keys());
    }
}