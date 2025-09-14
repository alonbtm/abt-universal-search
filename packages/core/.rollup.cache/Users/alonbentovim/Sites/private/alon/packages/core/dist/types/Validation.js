/**
 * Validation Types - Type definitions for input validation and rules
 * @description TypeScript interfaces for validation rules, results, and configuration
 */
/**
 * Predefined validation types
 */
export var ValidationType;
(function (ValidationType) {
    ValidationType["EMAIL"] = "email";
    ValidationType["URL"] = "url";
    ValidationType["SEARCH_QUERY"] = "search_query";
    ValidationType["SQL_SAFE"] = "sql_safe";
    ValidationType["XSS_SAFE"] = "xss_safe";
    ValidationType["ALPHANUMERIC"] = "alphanumeric";
    ValidationType["NUMERIC"] = "numeric";
    ValidationType["CUSTOM"] = "custom";
})(ValidationType || (ValidationType = {}));
//# sourceMappingURL=Validation.js.map