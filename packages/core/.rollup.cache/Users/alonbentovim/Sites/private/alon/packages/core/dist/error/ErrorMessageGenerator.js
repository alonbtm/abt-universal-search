export class ErrorMessageGenerator {
    constructor(config, events = {}) {
        this.templates = new Map();
        this.locale = 'en';
        this.fallbackMessages = new Map();
        this.config = {
            defaultLocale: 'en',
            enableProgressive: true,
            maxMessageLength: 200,
            enableActions: true,
            sanitizeHtml: true,
            customTemplates: true,
            ...config
        };
        this.events = events;
        this.locale = this.config.defaultLocale;
        this.initializeDefaultTemplates();
        this.initializeFallbackMessages();
    }
    initializeDefaultTemplates() {
        const templates = [
            // Network errors
            {
                id: 'network-timeout-en',
                errorType: 'timeout',
                severity: 'medium',
                template: 'Request timed out. The service is taking longer than expected to respond.',
                placeholders: [],
                localization: {
                    en: 'Request timed out. The service is taking longer than expected to respond.',
                    es: 'La solicitud ha caducado. El servicio está tardando más de lo esperado en responder.',
                    fr: 'La demande a expiré. Le service met plus de temps que prévu à répondre.'
                }
            },
            {
                id: 'network-connection-en',
                errorType: 'network',
                severity: 'high',
                template: 'Unable to connect to the service. Please check your internet connection.',
                placeholders: [],
                localization: {
                    en: 'Unable to connect to the service. Please check your internet connection.',
                    es: 'No se puede conectar al servicio. Verifique su conexión a internet.',
                    fr: 'Impossible de se connecter au service. Vérifiez votre connexion internet.'
                }
            },
            // Authentication errors
            {
                id: 'auth-unauthorized-en',
                errorType: 'authentication',
                severity: 'high',
                template: 'Authentication failed. Please verify your credentials and try again.',
                placeholders: [],
                localization: {
                    en: 'Authentication failed. Please verify your credentials and try again.',
                    es: 'La autenticación falló. Verifique sus credenciales e intente nuevamente.',
                    fr: 'L\'authentification a échoué. Vérifiez vos identifiants et réessayez.'
                }
            },
            {
                id: 'auth-token-expired-en',
                errorType: 'authentication',
                severity: 'medium',
                template: 'Your session has expired. Please sign in again to continue.',
                placeholders: [],
                localization: {
                    en: 'Your session has expired. Please sign in again to continue.',
                    es: 'Su sesión ha caducado. Inicie sesión nuevamente para continuar.',
                    fr: 'Votre session a expiré. Veuillez vous reconnecter pour continuer.'
                },
                conditions: [
                    {
                        field: 'message',
                        operator: 'contains',
                        value: 'expired'
                    }
                ]
            },
            // Validation errors
            {
                id: 'validation-input-en',
                errorType: 'validation',
                severity: 'medium',
                template: 'The information provided is invalid. Please check your input and try again.',
                placeholders: [],
                localization: {
                    en: 'The information provided is invalid. Please check your input and try again.',
                    es: 'La información proporcionada no es válida. Verifique su entrada e intente nuevamente.',
                    fr: 'Les informations fournies ne sont pas valides. Vérifiez votre saisie et réessayez.'
                }
            },
            // Rate limiting
            {
                id: 'rate-limit-en',
                errorType: 'rate_limit',
                severity: 'medium',
                template: 'Too many requests. Please wait a moment before trying again.',
                placeholders: [],
                localization: {
                    en: 'Too many requests. Please wait a moment before trying again.',
                    es: 'Demasiadas solicitudes. Espere un momento antes de intentar nuevamente.',
                    fr: 'Trop de requêtes. Veuillez attendre un moment avant de réessayer.'
                }
            },
            // System errors
            {
                id: 'system-error-en',
                errorType: 'system',
                severity: 'high',
                template: 'A system error occurred. Our team has been notified and is working on a fix.',
                placeholders: [],
                localization: {
                    en: 'A system error occurred. Our team has been notified and is working on a fix.',
                    es: 'Ocurrió un error del sistema. Nuestro equipo ha sido notificado y está trabajando en una solución.',
                    fr: 'Une erreur système s\'est produite. Notre équipe a été notifiée et travaille sur une solution.'
                }
            },
            // Configuration errors
            {
                id: 'config-error-en',
                errorType: 'configuration',
                severity: 'high',
                template: 'Configuration error detected. Please contact your administrator for assistance.',
                placeholders: [],
                localization: {
                    en: 'Configuration error detected. Please contact your administrator for assistance.',
                    es: 'Error de configuración detectado. Contacte a su administrador para obtener ayuda.',
                    fr: 'Erreur de configuration détectée. Veuillez contacter votre administrateur pour obtenir de l\'aide.'
                }
            },
            // Data errors
            {
                id: 'data-error-en',
                errorType: 'data',
                severity: 'medium',
                template: 'Data format error. The response from the service could not be processed.',
                placeholders: [],
                localization: {
                    en: 'Data format error. The response from the service could not be processed.',
                    es: 'Error de formato de datos. No se pudo procesar la respuesta del servicio.',
                    fr: 'Erreur de format de données. La réponse du service n\'a pas pu être traitée.'
                }
            },
            // Security errors
            {
                id: 'security-error-en',
                errorType: 'security',
                severity: 'critical',
                template: 'Security policy violation detected. Access has been restricted for your protection.',
                placeholders: [],
                localization: {
                    en: 'Security policy violation detected. Access has been restricted for your protection.',
                    es: 'Violación de política de seguridad detectada. El acceso ha sido restringido para su protección.',
                    fr: 'Violation de politique de sécurité détectée. L\'accès a été restreint pour votre protection.'
                }
            }
        ];
        templates.forEach(template => this.registerTemplate(template));
    }
    initializeFallbackMessages() {
        this.fallbackMessages.set('network', {
            title: 'Connection Problem',
            message: 'Unable to connect to the service. Please check your connection and try again.',
            severity: 'high',
            dismissible: true,
            category: 'error',
            actions: [
                {
                    label: 'Retry',
                    action: 'retry',
                    type: 'primary'
                },
                {
                    label: 'Use Offline Mode',
                    action: 'offline',
                    type: 'secondary'
                }
            ]
        });
        this.fallbackMessages.set('authentication', {
            title: 'Authentication Required',
            message: 'Please sign in to access this service.',
            severity: 'high',
            dismissible: false,
            category: 'error',
            actions: [
                {
                    label: 'Sign In',
                    action: 'signin',
                    type: 'primary'
                }
            ]
        });
        this.fallbackMessages.set('validation', {
            title: 'Invalid Input',
            message: 'Please check your input and try again.',
            severity: 'medium',
            dismissible: true,
            category: 'warning'
        });
        this.fallbackMessages.set('system', {
            title: 'Service Unavailable',
            message: 'The service is temporarily unavailable. Please try again later.',
            severity: 'high',
            dismissible: true,
            category: 'error',
            actions: [
                {
                    label: 'Try Again',
                    action: 'retry',
                    type: 'primary'
                }
            ]
        });
        this.fallbackMessages.set('unknown', {
            title: 'Unexpected Error',
            message: 'An unexpected error occurred. Please try again.',
            severity: 'medium',
            dismissible: true,
            category: 'error'
        });
    }
    generateMessage(error, context) {
        const template = this.findMatchingTemplate(error, context);
        if (template) {
            const message = this.buildMessageFromTemplate(template, error, context);
            this.events.onMessageGenerated?.(message, error);
            return message;
        }
        // Use fallback message
        const fallbackMessage = this.getFallbackMessage(error);
        this.events.onMessageGenerated?.(fallbackMessage, error);
        this.events.onTemplateNotFound?.(error.type, this.locale);
        return fallbackMessage;
    }
    findMatchingTemplate(error, context) {
        // Try exact match first
        const exactTemplate = this.templates.get(`${error.type}_${error.severity}`);
        if (exactTemplate) {
            return exactTemplate;
        }
        // Try fallback template
        const fallbackTemplate = this.templates.get(`${error.type}_fallback`);
        if (fallbackTemplate) {
            return fallbackTemplate;
        }
        // Find any template matching the error type
        const candidates = Array.from(this.templates.values())
            .filter(template => template.errorType === error.type);
        if (candidates.length === 0) {
            return null;
        }
        // Find template with matching conditions
        for (const template of candidates) {
            if (!template.conditions || this.evaluateConditions(template.conditions, error, context)) {
                return template;
            }
        }
        // Return first candidate if no conditions match
        return candidates[0] || null;
    }
    evaluateConditions(conditions, error, context) {
        return conditions.every(condition => {
            const value = this.getConditionValue(condition.field, error, context);
            return this.evaluateCondition(condition, value);
        });
    }
    getConditionValue(field, error, context) {
        switch (field) {
            case 'message':
                return error.message;
            case 'code':
                return error.code;
            case 'type':
                return error.type;
            case 'severity':
                return error.severity;
            default:
                if (field.startsWith('context.')) {
                    return this.getNestedValue(context, field.substring(8));
                }
                return undefined;
        }
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    evaluateCondition(condition, value) {
        switch (condition.operator) {
            case 'equals':
                return value === condition.value;
            case 'contains':
                return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
            case 'exists':
                return value !== undefined && value !== null;
            case 'gt':
                return Number(value) > Number(condition.value);
            case 'lt':
                return Number(value) < Number(condition.value);
            default:
                return false;
        }
    }
    buildMessageFromTemplate(template, error, context) {
        let messageText = this.getLocalizedText(template);
        // Replace placeholders
        template.placeholders.forEach(placeholder => {
            const value = this.getPlaceholderValue(placeholder, error, context);
            messageText = messageText.replace(new RegExp(`{${placeholder}}`, 'g'), String(value || ''));
        });
        // Sanitize if enabled
        if (this.config.sanitizeHtml) {
            messageText = this.sanitizeHtml(messageText);
        }
        // Truncate if too long
        if (messageText.length > this.config.maxMessageLength) {
            messageText = messageText.substring(0, this.config.maxMessageLength - 3) + '...';
        }
        const message = {
            title: this.getErrorTitle(error),
            message: messageText,
            severity: error.severity,
            dismissible: this.isDismissible(error),
            category: this.getMessageCategory(error),
            autoHide: this.shouldAutoHide(error),
            autoHideDelay: this.getAutoHideDelay(error)
        };
        // Add progressive details if enabled
        if (this.config.enableProgressive) {
            message.details = this.generateProgressiveDetails(error, context);
        }
        // Add actions if enabled
        if (this.config.enableActions) {
            message.actions = this.generateActions(error, context);
        }
        return message;
    }
    getLocalizedText(template) {
        return template.localization[this.locale] ||
            template.localization[this.config.defaultLocale] ||
            template.template;
    }
    getPlaceholderValue(placeholder, error, context) {
        switch (placeholder) {
            case 'errorCode':
                return error.code;
            case 'adapter':
                return context?.adapter || 'unknown';
            case 'query':
                return context?.metadata?.query || '';
            case 'timestamp':
                return new Date(error.timestamp).toLocaleString();
            default:
                return '';
        }
    }
    sanitizeHtml(text) {
        // Basic HTML sanitization - remove script tags and dangerous attributes
        return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/javascript:/gi, '');
    }
    getErrorTitle(error) {
        switch (error.type) {
            case 'network':
                return 'Connection Problem';
            case 'authentication':
                return 'Authentication Required';
            case 'authorization':
                return 'Access Denied';
            case 'validation':
                return 'Invalid Input';
            case 'timeout':
                return 'Request Timeout';
            case 'rate_limit':
                return 'Rate Limit Exceeded';
            case 'system':
                return 'Service Error';
            case 'configuration':
                return 'Configuration Error';
            case 'data':
                return 'Data Error';
            case 'security':
                return 'Security Alert';
            default:
                return 'Error';
        }
    }
    isDismissible(error) {
        // Critical security errors should not be dismissible
        if (error.type === 'security' && error.severity === 'critical') {
            return false;
        }
        // Authentication errors that block functionality should not be dismissible
        if (error.type === 'authentication' && error.recoverability === 'permanent') {
            return false;
        }
        return true;
    }
    getMessageCategory(error) {
        switch (error.severity) {
            case 'critical':
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
            case 'info':
                return 'info';
            default:
                return 'error';
        }
    }
    shouldAutoHide(error) {
        // Don't auto-hide critical or authentication errors
        return error.severity !== 'critical' && error.type !== 'authentication';
    }
    getAutoHideDelay(error) {
        switch (error.severity) {
            case 'info':
                return 3000;
            case 'low':
                return 5000;
            case 'medium':
                return 8000;
            default:
                return 0; // Don't auto-hide
        }
    }
    generateProgressiveDetails(error, context) {
        const details = [];
        if (error.correlationId) {
            details.push(`Reference: ${error.correlationId}`);
        }
        if (context?.operation?.duration) {
            details.push(`Duration: ${context.operation.duration}ms`);
        }
        if (context?.adapter) {
            details.push(`Source: ${context.adapter}`);
        }
        if (error.timestamp) {
            details.push(`Time: ${new Date(error.timestamp).toLocaleString()}`);
        }
        return details.join(' • ');
    }
    generateActions(error, context) {
        const actions = [];
        // Add retry action for transient errors
        if (error.recoverability === 'transient' || error.recoverability === 'recoverable') {
            actions.push({
                label: 'Try Again',
                action: 'retry',
                type: 'primary'
            });
        }
        // Add specific actions based on error type
        switch (error.type) {
            case 'authentication':
                actions.push({
                    label: 'Sign In',
                    action: 'signin',
                    type: 'primary'
                });
                break;
            case 'network':
                actions.push({
                    label: 'Use Offline Mode',
                    action: 'offline',
                    type: 'secondary'
                });
                break;
            case 'configuration':
                actions.push({
                    label: 'Contact Support',
                    action: 'support',
                    type: 'secondary'
                });
                break;
            case 'validation':
                actions.push({
                    label: 'Clear Form',
                    action: 'reset',
                    type: 'secondary'
                });
                break;
        }
        // Add help action for complex errors
        if (error.severity === 'high' || error.severity === 'critical') {
            actions.push({
                label: 'Get Help',
                action: 'help',
                type: 'link'
            });
        }
        return actions;
    }
    getFallbackMessage(error) {
        const fallback = this.fallbackMessages.get(error.type) || this.fallbackMessages.get('unknown');
        return {
            ...fallback,
            title: this.getErrorTitle(error),
            severity: error.severity
        };
    }
    registerTemplate(template) {
        this.templates.set(template.id, template);
    }
    removeTemplate(templateId) {
        this.templates.delete(templateId);
    }
    setLocale(locale) {
        const oldLocale = this.locale;
        this.locale = locale;
        this.events.onLocaleChanged?.(oldLocale, locale);
    }
    getLocale() {
        return this.locale;
    }
    getAvailableLocales() {
        const locales = new Set();
        for (const template of Array.from(this.templates.values())) {
            Object.keys(template.localization).forEach(locale => locales.add(locale));
        }
        return Array.from(locales);
    }
    getTemplates() {
        return Array.from(this.templates.values());
    }
    previewMessage(templateId, error, context) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template '${templateId}' not found`);
        }
        return this.buildMessageFromTemplate(template, error, context);
    }
    validateTemplate(template) {
        const errors = [];
        if (!template.id)
            errors.push('Template ID is required');
        if (!template.template)
            errors.push('Template text is required');
        if (!template.errorType)
            errors.push('Error type is required');
        if (!template.severity)
            errors.push('Severity is required');
        // Validate placeholders
        const placeholderPattern = /{(\w+)}/g;
        const templatePlaceholders = Array.from(template.template.matchAll(placeholderPattern)).map(m => m[1] || '');
        const undeclaredPlaceholders = templatePlaceholders.filter(p => !template.placeholders.includes(p));
        if (undeclaredPlaceholders.length > 0) {
            errors.push(`Undeclared placeholders: ${undeclaredPlaceholders.join(', ')}`);
        }
        return errors;
    }
    exportTemplates() {
        const templates = Array.from(this.templates.values());
        return JSON.stringify(templates, null, 2);
    }
    importTemplates(templatesJson) {
        let importCount = 0;
        try {
            const templates = JSON.parse(templatesJson);
            for (const template of templates) {
                const validationErrors = this.validateTemplate(template);
                if (validationErrors.length === 0) {
                    this.registerTemplate(template);
                    importCount++;
                }
            }
        }
        catch (error) {
            throw new Error(`Failed to import templates: ${error}`);
        }
        return importCount;
    }
}
//# sourceMappingURL=ErrorMessageGenerator.js.map