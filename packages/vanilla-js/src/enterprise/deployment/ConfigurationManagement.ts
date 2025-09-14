interface EnvironmentConfig {
    name: string;
    type: 'development' | 'testing' | 'staging' | 'production';
    variables: Record<string, ConfigValue>;
    secrets: Record<string, SecretConfig>;
    features: Record<string, boolean>;
    resources: ResourceConfig;
    monitoring: MonitoringConfig;
    networking: NetworkConfig;
}

interface ConfigValue {
    value: string | number | boolean;
    encrypted?: boolean;
    description?: string;
    required?: boolean;
    validation?: ConfigValidation;
    source?: 'env' | 'file' | 'vault' | 'k8s' | 'aws';
}

interface SecretConfig {
    source: 'env' | 'vault' | 'k8s' | 'aws-secrets';
    key: string;
    version?: string;
    rotationPolicy?: {
        enabled: boolean;
        interval: string; // e.g., '30d', '90d'
        notifyBefore: string; // e.g., '7d'
    };
}

interface ConfigValidation {
    type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'regex';
    pattern?: string;
    min?: number;
    max?: number;
    enum?: (string | number)[];
}

interface ResourceConfig {
    cpu: {
        request: string;
        limit: string;
    };
    memory: {
        request: string;
        limit: string;
    };
    storage: {
        size: string;
        class: string;
    };
    replicas: {
        min: number;
        max: number;
        default: number;
    };
}

interface MonitoringConfig {
    enabled: boolean;
    metrics: {
        interval: number;
        retention: string;
    };
    alerts: {
        channels: string[];
        thresholds: Record<string, number>;
    };
    logging: {
        level: string;
        format: 'json' | 'text';
        destinations: string[];
    };
}

interface NetworkConfig {
    ingress: {
        enabled: boolean;
        tls: boolean;
        domains: string[];
        rateLimiting: {
            enabled: boolean;
            rps: number;
        };
    };
    security: {
        cors: {
            enabled: boolean;
            origins: string[];
            credentials: boolean;
        };
        csp: {
            enabled: boolean;
            policy: string;
        };
    };
}

interface ConfigTemplate {
    name: string;
    version: string;
    environments: string[];
    parameters: Record<string, {
        type: string;
        description: string;
        default?: any;
        required: boolean;
    }>;
    resources: string[];
}

interface DeploymentManifest {
    apiVersion: string;
    kind: string;
    metadata: {
        name: string;
        namespace?: string;
        labels: Record<string, string>;
        annotations?: Record<string, string>;
    };
    spec: Record<string, any>;
}

export class ConfigurationManagement {
    private environments = new Map<string, EnvironmentConfig>();
    private templates = new Map<string, ConfigTemplate>();
    private secretsCache = new Map<string, { value: string; expires: Date }>();
    private configHistory: { timestamp: Date; environment: string; changes: any[] }[] = [];

    constructor() {
        this.initializeDefaultEnvironments();
        this.initializeTemplates();
    }

    private initializeDefaultEnvironments(): void {
        // Development environment
        this.addEnvironment({
            name: 'development',
            type: 'development',
            variables: {
                NODE_ENV: { value: 'development', required: true },
                PORT: { value: 3000, validation: { type: 'number', min: 1000, max: 65535 } },
                LOG_LEVEL: { value: 'debug', validation: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] } },
                DATABASE_URL: { value: 'postgresql://localhost:5432/universalsearch_dev', required: true },
                REDIS_URL: { value: 'redis://localhost:6379/0', required: false },
                ENABLE_DEBUG: { value: true }
            },
            secrets: {
                JWT_SECRET: { source: 'env', key: 'JWT_SECRET_DEV' },
                API_KEY: { source: 'env', key: 'API_KEY_DEV' }
            },
            features: {
                enableCaching: true,
                enableMetrics: false,
                enableDebugMode: true,
                enableHotReload: true
            },
            resources: {
                cpu: { request: '100m', limit: '200m' },
                memory: { request: '256Mi', limit: '512Mi' },
                storage: { size: '1Gi', class: 'standard' },
                replicas: { min: 1, max: 1, default: 1 }
            },
            monitoring: {
                enabled: false,
                metrics: { interval: 30, retention: '1d' },
                alerts: { channels: ['console'], thresholds: {} },
                logging: { level: 'debug', format: 'text', destinations: ['console'] }
            },
            networking: {
                ingress: { enabled: false, tls: false, domains: [], rateLimiting: { enabled: false, rps: 0 } },
                security: {
                    cors: { enabled: true, origins: ['http://localhost:3000'], credentials: true },
                    csp: { enabled: false, policy: '' }
                }
            }
        });

        // Staging environment
        this.addEnvironment({
            name: 'staging',
            type: 'staging',
            variables: {
                NODE_ENV: { value: 'staging', required: true },
                PORT: { value: 3000, required: true },
                LOG_LEVEL: { value: 'info', required: true },
                DATABASE_URL: { value: 'postgresql://staging-db:5432/universalsearch', required: true },
                REDIS_URL: { value: 'redis://staging-redis:6379/0', required: true },
                CDN_URL: { value: 'https://cdn-staging.universalsearch.com', validation: { type: 'url' } }
            },
            secrets: {
                JWT_SECRET: { source: 'k8s', key: 'jwt-secret' },
                DATABASE_PASSWORD: { source: 'k8s', key: 'db-password' },
                REDIS_PASSWORD: { source: 'k8s', key: 'redis-password' }
            },
            features: {
                enableCaching: true,
                enableMetrics: true,
                enableDebugMode: false,
                enableHotReload: false,
                enableFeatureFlags: true
            },
            resources: {
                cpu: { request: '200m', limit: '500m' },
                memory: { request: '512Mi', limit: '1Gi' },
                storage: { size: '5Gi', class: 'ssd' },
                replicas: { min: 2, max: 5, default: 2 }
            },
            monitoring: {
                enabled: true,
                metrics: { interval: 15, retention: '7d' },
                alerts: { channels: ['slack'], thresholds: { cpu: 80, memory: 85, errorRate: 5 } },
                logging: { level: 'info', format: 'json', destinations: ['stdout', 'cloudwatch'] }
            },
            networking: {
                ingress: {
                    enabled: true,
                    tls: true,
                    domains: ['staging.universalsearch.com'],
                    rateLimiting: { enabled: true, rps: 100 }
                },
                security: {
                    cors: { enabled: true, origins: ['https://staging.universalsearch.com'], credentials: true },
                    csp: { enabled: true, policy: "default-src 'self'; script-src 'self' 'unsafe-inline'" }
                }
            }
        });

        // Production environment
        this.addEnvironment({
            name: 'production',
            type: 'production',
            variables: {
                NODE_ENV: { value: 'production', required: true },
                PORT: { value: 3000, required: true },
                LOG_LEVEL: { value: 'warn', required: true },
                DATABASE_URL: { value: 'postgresql://prod-db:5432/universalsearch', required: true },
                REDIS_URL: { value: 'redis://prod-redis:6379/0', required: true },
                CDN_URL: { value: 'https://cdn.universalsearch.com', required: true },
                MAX_CONNECTIONS: { value: 1000, validation: { type: 'number', min: 100, max: 10000 } }
            },
            secrets: {
                JWT_SECRET: {
                    source: 'aws-secrets',
                    key: 'prod/universalsearch/jwt-secret',
                    rotationPolicy: { enabled: true, interval: '90d', notifyBefore: '7d' }
                },
                DATABASE_PASSWORD: {
                    source: 'aws-secrets',
                    key: 'prod/universalsearch/db-password',
                    rotationPolicy: { enabled: true, interval: '30d', notifyBefore: '3d' }
                },
                API_KEYS: { source: 'vault', key: 'secret/prod/api-keys' }
            },
            features: {
                enableCaching: true,
                enableMetrics: true,
                enableDebugMode: false,
                enableHotReload: false,
                enableFeatureFlags: true,
                enableCircuitBreaker: true,
                enableRateLimiting: true
            },
            resources: {
                cpu: { request: '500m', limit: '1000m' },
                memory: { request: '1Gi', limit: '2Gi' },
                storage: { size: '50Gi', class: 'ssd-encrypted' },
                replicas: { min: 5, max: 50, default: 5 }
            },
            monitoring: {
                enabled: true,
                metrics: { interval: 10, retention: '30d' },
                alerts: {
                    channels: ['pagerduty', 'slack', 'email'],
                    thresholds: { cpu: 70, memory: 80, errorRate: 1, latency: 500 }
                },
                logging: { level: 'warn', format: 'json', destinations: ['cloudwatch', 'datadog'] }
            },
            networking: {
                ingress: {
                    enabled: true,
                    tls: true,
                    domains: ['universalsearch.com', 'www.universalsearch.com', 'api.universalsearch.com'],
                    rateLimiting: { enabled: true, rps: 1000 }
                },
                security: {
                    cors: { enabled: true, origins: ['https://universalsearch.com'], credentials: true },
                    csp: { enabled: true, policy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'" }
                }
            }
        });
    }

    private initializeTemplates(): void {
        const webAppTemplate: ConfigTemplate = {
            name: 'web-application',
            version: '1.0.0',
            environments: ['development', 'staging', 'production'],
            parameters: {
                appName: { type: 'string', description: 'Application name', required: true },
                replicas: { type: 'number', description: 'Number of replicas', default: 3, required: false },
                enableTLS: { type: 'boolean', description: 'Enable TLS/HTTPS', default: true, required: false }
            },
            resources: ['deployment', 'service', 'ingress', 'configmap', 'secret']
        };

        const databaseTemplate: ConfigTemplate = {
            name: 'database',
            version: '1.0.0',
            environments: ['staging', 'production'],
            parameters: {
                dbType: { type: 'string', description: 'Database type', required: true },
                storageSize: { type: 'string', description: 'Storage size', default: '10Gi', required: false },
                backupEnabled: { type: 'boolean', description: 'Enable backups', default: true, required: false }
            },
            resources: ['statefulset', 'service', 'pvc', 'secret']
        };

        this.templates.set(webAppTemplate.name, webAppTemplate);
        this.templates.set(databaseTemplate.name, databaseTemplate);
    }

    addEnvironment(config: EnvironmentConfig): void {
        this.validateEnvironmentConfig(config);
        this.environments.set(config.name, config);

        this.logConfigChange(config.name, 'environment_added', { environment: config.name });
        console.log(`Environment '${config.name}' added successfully`);
    }

    private validateEnvironmentConfig(config: EnvironmentConfig): void {
        // Validate required fields
        if (!config.name || !config.type) {
            throw new Error('Environment name and type are required');
        }

        // Validate variables
        for (const [key, variable] of Object.entries(config.variables)) {
            if (variable.required && (variable.value === undefined || variable.value === null)) {
                throw new Error(`Required variable '${key}' is missing value`);
            }

            if (variable.validation) {
                this.validateConfigValue(key, variable.value, variable.validation);
            }
        }
    }

    private validateConfigValue(key: string, value: any, validation: ConfigValidation): void {
        switch (validation.type) {
            case 'string':
                if (typeof value !== 'string') {
                    throw new Error(`Variable '${key}' must be a string`);
                }
                if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
                    throw new Error(`Variable '${key}' does not match pattern: ${validation.pattern}`);
                }
                break;

            case 'number':
                if (typeof value !== 'number') {
                    throw new Error(`Variable '${key}' must be a number`);
                }
                if (validation.min !== undefined && value < validation.min) {
                    throw new Error(`Variable '${key}' must be >= ${validation.min}`);
                }
                if (validation.max !== undefined && value > validation.max) {
                    throw new Error(`Variable '${key}' must be <= ${validation.max}`);
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    throw new Error(`Variable '${key}' must be a boolean`);
                }
                break;

            case 'email':
                if (typeof value !== 'string' || !value.includes('@')) {
                    throw new Error(`Variable '${key}' must be a valid email`);
                }
                break;

            case 'url':
                if (typeof value !== 'string' || !value.startsWith('http')) {
                    throw new Error(`Variable '${key}' must be a valid URL`);
                }
                break;

            case 'regex':
                if (validation.pattern && !new RegExp(validation.pattern).test(String(value))) {
                    throw new Error(`Variable '${key}' does not match regex: ${validation.pattern}`);
                }
                break;
        }

        if (validation.enum && !validation.enum.includes(value)) {
            throw new Error(`Variable '${key}' must be one of: ${validation.enum.join(', ')}`);
        }
    }

    async getConfig(environmentName: string): Promise<Record<string, any>> {
        const environment = this.environments.get(environmentName);
        if (!environment) {
            throw new Error(`Environment '${environmentName}' not found`);
        }

        const config: Record<string, any> = {};

        // Add variables
        for (const [key, configValue] of Object.entries(environment.variables)) {
            config[key] = configValue.value;
        }

        // Add secrets
        for (const [key, secretConfig] of Object.entries(environment.secrets)) {
            config[key] = await this.getSecret(key, secretConfig);
        }

        // Add feature flags
        config.FEATURES = environment.features;

        return config;
    }

    private async getSecret(key: string, secretConfig: SecretConfig): Promise<string> {
        const cacheKey = `${secretConfig.source}:${secretConfig.key}`;
        const cached = this.secretsCache.get(cacheKey);

        if (cached && cached.expires > new Date()) {
            return cached.value;
        }

        let secretValue: string;

        switch (secretConfig.source) {
            case 'env':
                secretValue = process.env[secretConfig.key] || '';
                break;

            case 'k8s':
                secretValue = await this.getKubernetesSecret(secretConfig.key);
                break;

            case 'vault':
                secretValue = await this.getVaultSecret(secretConfig.key, secretConfig.version);
                break;

            case 'aws-secrets':
                secretValue = await this.getAWSSecret(secretConfig.key, secretConfig.version);
                break;

            default:
                throw new Error(`Unsupported secret source: ${secretConfig.source}`);
        }

        // Cache for 5 minutes
        this.secretsCache.set(cacheKey, {
            value: secretValue,
            expires: new Date(Date.now() + 5 * 60 * 1000)
        });

        return secretValue;
    }

    private async getKubernetesSecret(key: string): Promise<string> {
        // In a real implementation, this would use the Kubernetes API
        return process.env[key] || `k8s-secret-${key}`;
    }

    private async getVaultSecret(key: string, version?: string): Promise<string> {
        // In a real implementation, this would use the Vault API
        return `vault-secret-${key}${version ? `-v${version}` : ''}`;
    }

    private async getAWSSecret(key: string, version?: string): Promise<string> {
        // In a real implementation, this would use AWS Secrets Manager
        return `aws-secret-${key}${version ? `-v${version}` : ''}`;
    }

    generateKubernetesManifests(environmentName: string, templateName?: string): DeploymentManifest[] {
        const environment = this.environments.get(environmentName);
        if (!environment) {
            throw new Error(`Environment '${environmentName}' not found`);
        }

        const manifests: DeploymentManifest[] = [];

        // Generate ConfigMap
        manifests.push(this.generateConfigMap(environment));

        // Generate Secret
        manifests.push(this.generateSecret(environment));

        // Generate Deployment
        manifests.push(this.generateDeployment(environment));

        // Generate Service
        manifests.push(this.generateService(environment));

        // Generate Ingress (if enabled)
        if (environment.networking.ingress.enabled) {
            manifests.push(this.generateIngress(environment));
        }

        // Generate HPA (for production)
        if (environment.type === 'production' || environment.type === 'staging') {
            manifests.push(this.generateHPA(environment));
        }

        return manifests;
    }

    private generateConfigMap(environment: EnvironmentConfig): DeploymentManifest {
        const data: Record<string, string> = {};

        for (const [key, configValue] of Object.entries(environment.variables)) {
            if (!configValue.encrypted) {
                data[key] = String(configValue.value);
            }
        }

        // Add feature flags
        data.FEATURES = JSON.stringify(environment.features);

        return {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: {
                name: `universal-search-config-${environment.name}`,
                namespace: 'universal-search',
                labels: {
                    app: 'universal-search',
                    environment: environment.name,
                    component: 'config'
                }
            },
            spec: { data }
        };
    }

    private generateSecret(environment: EnvironmentConfig): DeploymentManifest {
        const data: Record<string, string> = {};

        // Add encrypted variables
        for (const [key, configValue] of Object.entries(environment.variables)) {
            if (configValue.encrypted) {
                data[key] = Buffer.from(String(configValue.value)).toString('base64');
            }
        }

        // Add secret references (would be populated externally)
        for (const secretKey of Object.keys(environment.secrets)) {
            data[secretKey] = Buffer.from(`placeholder-${secretKey}`).toString('base64');
        }

        return {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: `universal-search-secrets-${environment.name}`,
                namespace: 'universal-search',
                labels: {
                    app: 'universal-search',
                    environment: environment.name,
                    component: 'secrets'
                }
            },
            spec: {
                type: 'Opaque',
                data
            }
        };
    }

    private generateDeployment(environment: EnvironmentConfig): DeploymentManifest {
        return {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name: `universal-search-${environment.name}`,
                namespace: 'universal-search',
                labels: {
                    app: 'universal-search',
                    environment: environment.name,
                    component: 'app'
                }
            },
            spec: {
                replicas: environment.resources.replicas.default,
                selector: {
                    matchLabels: {
                        app: 'universal-search',
                        environment: environment.name
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            app: 'universal-search',
                            environment: environment.name
                        }
                    },
                    spec: {
                        containers: [{
                            name: 'app',
                            image: 'universal-search:latest',
                            ports: [{ containerPort: 3000 }],
                            resources: {
                                requests: {
                                    cpu: environment.resources.cpu.request,
                                    memory: environment.resources.memory.request
                                },
                                limits: {
                                    cpu: environment.resources.cpu.limit,
                                    memory: environment.resources.memory.limit
                                }
                            },
                            envFrom: [
                                {
                                    configMapRef: {
                                        name: `universal-search-config-${environment.name}`
                                    }
                                },
                                {
                                    secretRef: {
                                        name: `universal-search-secrets-${environment.name}`
                                    }
                                }
                            ],
                            livenessProbe: {
                                httpGet: {
                                    path: '/health',
                                    port: 3000
                                },
                                initialDelaySeconds: 30,
                                periodSeconds: 10
                            },
                            readinessProbe: {
                                httpGet: {
                                    path: '/health',
                                    port: 3000
                                },
                                initialDelaySeconds: 5,
                                periodSeconds: 5
                            }
                        }]
                    }
                }
            }
        };
    }

    private generateService(environment: EnvironmentConfig): DeploymentManifest {
        return {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: `universal-search-service-${environment.name}`,
                namespace: 'universal-search',
                labels: {
                    app: 'universal-search',
                    environment: environment.name,
                    component: 'service'
                }
            },
            spec: {
                selector: {
                    app: 'universal-search',
                    environment: environment.name
                },
                ports: [{
                    port: 80,
                    targetPort: 3000,
                    protocol: 'TCP'
                }],
                type: 'ClusterIP'
            }
        };
    }

    private generateIngress(environment: EnvironmentConfig): DeploymentManifest {
        const ingress = environment.networking.ingress;

        return {
            apiVersion: 'networking.k8s.io/v1',
            kind: 'Ingress',
            metadata: {
                name: `universal-search-ingress-${environment.name}`,
                namespace: 'universal-search',
                labels: {
                    app: 'universal-search',
                    environment: environment.name,
                    component: 'ingress'
                },
                annotations: {
                    'kubernetes.io/ingress.class': 'nginx',
                    'nginx.ingress.kubernetes.io/ssl-redirect': ingress.tls ? 'true' : 'false',
                    ...(ingress.rateLimiting.enabled && {
                        'nginx.ingress.kubernetes.io/rate-limit': String(ingress.rateLimiting.rps)
                    })
                }
            },
            spec: {
                ...(ingress.tls && {
                    tls: [{
                        hosts: ingress.domains,
                        secretName: `universal-search-tls-${environment.name}`
                    }]
                }),
                rules: ingress.domains.map(domain => ({
                    host: domain,
                    http: {
                        paths: [{
                            path: '/',
                            pathType: 'Prefix',
                            backend: {
                                service: {
                                    name: `universal-search-service-${environment.name}`,
                                    port: { number: 80 }
                                }
                            }
                        }]
                    }
                }))
            }
        };
    }

    private generateHPA(environment: EnvironmentConfig): DeploymentManifest {
        return {
            apiVersion: 'autoscaling/v2',
            kind: 'HorizontalPodAutoscaler',
            metadata: {
                name: `universal-search-hpa-${environment.name}`,
                namespace: 'universal-search',
                labels: {
                    app: 'universal-search',
                    environment: environment.name,
                    component: 'hpa'
                }
            },
            spec: {
                scaleTargetRef: {
                    apiVersion: 'apps/v1',
                    kind: 'Deployment',
                    name: `universal-search-${environment.name}`
                },
                minReplicas: environment.resources.replicas.min,
                maxReplicas: environment.resources.replicas.max,
                metrics: [
                    {
                        type: 'Resource',
                        resource: {
                            name: 'cpu',
                            target: {
                                type: 'Utilization',
                                averageUtilization: 70
                            }
                        }
                    },
                    {
                        type: 'Resource',
                        resource: {
                            name: 'memory',
                            target: {
                                type: 'Utilization',
                                averageUtilization: 80
                            }
                        }
                    }
                ]
            }
        };
    }

    exportEnvironmentConfig(environmentName: string, format: 'yaml' | 'json' | 'env' = 'yaml'): string {
        const environment = this.environments.get(environmentName);
        if (!environment) {
            throw new Error(`Environment '${environmentName}' not found`);
        }

        switch (format) {
            case 'json':
                return JSON.stringify(environment, null, 2);

            case 'env':
                return this.toEnvFormat(environment);

            case 'yaml':
                return this.toYAMLFormat(environment);

            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    private toEnvFormat(environment: EnvironmentConfig): string {
        let envContent = `# Environment: ${environment.name}\n`;
        envContent += `# Type: ${environment.type}\n\n`;

        for (const [key, configValue] of Object.entries(environment.variables)) {
            if (configValue.description) {
                envContent += `# ${configValue.description}\n`;
            }
            envContent += `${key}=${configValue.value}\n`;
        }

        return envContent;
    }

    private toYAMLFormat(environment: EnvironmentConfig): string {
        // Simplified YAML conversion
        let yaml = `name: ${environment.name}\n`;
        yaml += `type: ${environment.type}\n\n`;
        yaml += 'variables:\n';

        for (const [key, configValue] of Object.entries(environment.variables)) {
            yaml += `  ${key}: ${JSON.stringify(configValue.value)}\n`;
        }

        return yaml;
    }

    private logConfigChange(environment: string, action: string, details: any): void {
        this.configHistory.push({
            timestamp: new Date(),
            environment,
            changes: [{ action, details }]
        });

        // Keep only last 100 changes
        if (this.configHistory.length > 100) {
            this.configHistory = this.configHistory.slice(-100);
        }
    }

    getConfigurationHistory(environmentName?: string, limit = 50): any[] {
        let history = this.configHistory;

        if (environmentName) {
            history = history.filter(entry => entry.environment === environmentName);
        }

        return history
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    validateDeployment(environmentName: string): { valid: boolean; errors: string[]; warnings: string[] } {
        const environment = this.environments.get(environmentName);
        if (!environment) {
            return { valid: false, errors: [`Environment '${environmentName}' not found`], warnings: [] };
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required variables
        for (const [key, configValue] of Object.entries(environment.variables)) {
            if (configValue.required && !configValue.value) {
                errors.push(`Required variable '${key}' is missing`);
            }
        }

        // Validate resource limits for production
        if (environment.type === 'production') {
            const cpuLimit = parseInt(environment.resources.cpu.limit);
            const memoryLimit = parseInt(environment.resources.memory.limit);

            if (cpuLimit < 500) {
                warnings.push('CPU limit may be too low for production workload');
            }

            if (memoryLimit < 1024) {
                warnings.push('Memory limit may be too low for production workload');
            }

            if (!environment.networking.ingress.tls) {
                errors.push('TLS must be enabled for production environment');
            }

            if (!environment.monitoring.enabled) {
                errors.push('Monitoring must be enabled for production environment');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    getEnvironments(): string[] {
        return Array.from(this.environments.keys());
    }

    getEnvironmentConfig(name: string): EnvironmentConfig | undefined {
        return this.environments.get(name);
    }

    deleteEnvironment(name: string): boolean {
        if (this.environments.delete(name)) {
            this.logConfigChange(name, 'environment_deleted', { environment: name });
            return true;
        }
        return false;
    }

    cloneEnvironment(sourceName: string, targetName: string, modifications?: Partial<EnvironmentConfig>): void {
        const source = this.environments.get(sourceName);
        if (!source) {
            throw new Error(`Source environment '${sourceName}' not found`);
        }

        const cloned: EnvironmentConfig = {
            ...JSON.parse(JSON.stringify(source)),
            name: targetName,
            ...modifications
        };

        this.addEnvironment(cloned);
        this.logConfigChange(targetName, 'environment_cloned', { source: sourceName, target: targetName });
    }
}