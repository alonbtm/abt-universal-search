/**
 * Request Transformer - Handles API request transformation and parameter mapping
 * @description Transforms search queries and parameters for different API formats
 */
import { ValidationError } from './validation';
/**
 * Request transformation utilities
 */
export class RequestTransformer {
    /**
     * Transform a processed query into an API request configuration
     */
    transformRequest(query, config, baseHeaders = {}) {
        const url = new URL(config.url);
        const method = config.method || 'GET';
        const headers = { ...baseHeaders, ...config.headers };
        // Apply dynamic headers if configured
        if (config.requestTransform?.dynamicHeaders) {
            Object.assign(headers, this.generateDynamicHeaders(config.requestTransform.dynamicHeaders, query));
        }
        if (method === 'GET') {
            return this.transformGetRequest(query, config, url, headers);
        }
        else {
            return this.transformPostRequest(query, config, url, headers);
        }
    }
    /**
     * Transform request for GET method
     */
    transformGetRequest(query, config, url, headers) {
        const queryParam = config.queryParam || 'q';
        const transformedQuery = this.transformQueryValue(query.normalized, config.requestTransform);
        // Set the main search parameter
        url.searchParams.set(queryParam, transformedQuery);
        // Add additional parameters if configured
        if (config.requestTransform?.additionalParams) {
            for (const [key, value] of Object.entries(config.requestTransform.additionalParams)) {
                url.searchParams.set(key, String(value));
            }
        }
        return {
            url: url.toString(),
            method: 'GET',
            headers,
            timeout: config.timeout
        };
    }
    /**
     * Transform request for POST method
     */
    transformPostRequest(query, config, url, headers) {
        const transformedQuery = this.transformQueryValue(query.normalized, config.requestTransform);
        let body;
        if (config.requestTransform?.graphql) {
            // GraphQL request
            body = this.buildGraphQLRequest(transformedQuery, config.requestTransform.graphql, query);
            headers['Content-Type'] = 'application/json';
        }
        else {
            // Regular JSON request
            const queryField = config.requestTransform?.queryMapping?.field || 'query';
            body = { [queryField]: transformedQuery };
            // Add additional parameters to body
            if (config.requestTransform?.additionalParams) {
                Object.assign(body, config.requestTransform.additionalParams);
            }
            headers['Content-Type'] = 'application/json';
        }
        return {
            url: url.toString(),
            method: config.method || 'POST',
            headers,
            body: JSON.stringify(body),
            timeout: config.timeout
        };
    }
    /**
     * Transform the query value based on configuration
     */
    transformQueryValue(query, transformConfig) {
        if (!transformConfig?.queryMapping?.transform) {
            return query;
        }
        switch (transformConfig.queryMapping.transform) {
            case 'lowercase':
                return query.toLowerCase();
            case 'uppercase':
                return query.toUpperCase();
            case 'trim':
                return query.trim();
            case 'encode':
                return encodeURIComponent(query);
            default:
                return query;
        }
    }
    /**
     * Generate dynamic headers based on configuration
     */
    generateDynamicHeaders(dynamicHeadersConfig, query) {
        const headers = {};
        for (const [headerName, template] of Object.entries(dynamicHeadersConfig)) {
            headers[headerName] = this.interpolateTemplate(template, {
                query: query.normalized,
                originalQuery: query.original,
                timestamp: Date.now().toString(),
                uuid: this.generateUUID()
            });
        }
        return headers;
    }
    /**
     * Build GraphQL request body
     */
    buildGraphQLRequest(query, graphqlConfig, processedQuery) {
        const variables = {
            ...graphqlConfig.variables,
            query: query,
            originalQuery: processedQuery.original
        };
        return {
            query: graphqlConfig.query,
            variables,
            operationName: graphqlConfig.operationName
        };
    }
    /**
     * Interpolate template strings with variables
     */
    interpolateTemplate(template, variables) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] || match;
        });
    }
    /**
     * Generate a simple UUID for request tracking
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    /**
     * Validate request transformation configuration
     */
    validateTransformConfig(config) {
        if (config.queryMapping?.field && typeof config.queryMapping.field !== 'string') {
            throw new ValidationError('Query mapping field must be a string');
        }
        if (config.queryMapping?.transform &&
            !['lowercase', 'uppercase', 'trim', 'encode'].includes(config.queryMapping.transform)) {
            throw new ValidationError('Invalid query transform type');
        }
        if (config.additionalParams && typeof config.additionalParams !== 'object') {
            throw new ValidationError('Additional params must be an object');
        }
        if (config.dynamicHeaders && typeof config.dynamicHeaders !== 'object') {
            throw new ValidationError('Dynamic headers must be an object');
        }
        if (config.graphql) {
            if (!config.graphql.query || typeof config.graphql.query !== 'string') {
                throw new ValidationError('GraphQL query is required and must be a string');
            }
        }
    }
    /**
     * Extract search parameters from URL for GET requests
     */
    extractSearchParams(url) {
        try {
            const urlObj = new URL(url);
            const params = {};
            for (const [key, value] of urlObj.searchParams.entries()) {
                params[key] = value;
            }
            return params;
        }
        catch (error) {
            throw new ValidationError(`Invalid URL: ${url}`);
        }
    }
    /**
     * Parse request body for POST requests
     */
    parseRequestBody(body) {
        if (typeof body === 'string') {
            try {
                return JSON.parse(body);
            }
            catch (error) {
                throw new ValidationError('Invalid JSON in request body');
            }
        }
        if (typeof body === 'object' && body !== null) {
            return body;
        }
        return {};
    }
    /**
     * Build URL with search parameters
     */
    buildUrlWithParams(baseUrl, params) {
        const url = new URL(baseUrl);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, String(value));
        }
        return url.toString();
    }
}
/**
 * Global request transformer instance
 */
export const requestTransformer = new RequestTransformer();
//# sourceMappingURL=RequestTransformer.js.map