import { IErrorMessageGenerator, UserMessage, MessageTemplate, SearchError, ErrorContext, ErrorType } from '../types/ErrorHandling';
export interface MessageGeneratorConfig {
    defaultLocale: string;
    enableProgressive: boolean;
    maxMessageLength: number;
    enableActions: boolean;
    sanitizeHtml: boolean;
    customTemplates: boolean;
}
export interface MessageGeneratorEvents {
    onMessageGenerated?: (message: UserMessage, error: SearchError) => void;
    onTemplateNotFound?: (errorType: ErrorType, locale: string) => void;
    onLocaleChanged?: (oldLocale: string, newLocale: string) => void;
}
export declare class ErrorMessageGenerator implements IErrorMessageGenerator {
    private config;
    private events;
    private templates;
    private locale;
    private fallbackMessages;
    constructor(config?: Partial<MessageGeneratorConfig>, events?: MessageGeneratorEvents);
    private initializeDefaultTemplates;
    private initializeFallbackMessages;
    generateMessage(error: SearchError, context?: ErrorContext): UserMessage;
    private findMatchingTemplate;
    private evaluateConditions;
    private getConditionValue;
    private getNestedValue;
    private evaluateCondition;
    private buildMessageFromTemplate;
    private getLocalizedText;
    private getPlaceholderValue;
    private sanitizeHtml;
    private getErrorTitle;
    private isDismissible;
    private getMessageCategory;
    private shouldAutoHide;
    private getAutoHideDelay;
    private generateProgressiveDetails;
    private generateActions;
    private getFallbackMessage;
    registerTemplate(template: MessageTemplate): void;
    removeTemplate(templateId: string): void;
    setLocale(locale: string): void;
    getLocale(): string;
    getAvailableLocales(): string[];
    getTemplates(): MessageTemplate[];
    previewMessage(templateId: string, error: SearchError, context?: ErrorContext): UserMessage;
    validateTemplate(template: MessageTemplate): string[];
    exportTemplates(): string;
    importTemplates(templatesJson: string): number;
}
//# sourceMappingURL=ErrorMessageGenerator.d.ts.map