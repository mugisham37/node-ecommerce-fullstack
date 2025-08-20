package com.ecommerce.inventory.dto.validation;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Utility class for input sanitization to prevent injection attacks
 */
@Component
public class InputSanitizer {

    // Patterns for detecting potentially malicious input
    private static final Pattern SQL_INJECTION_PATTERN = Pattern.compile(
        "(?i).*(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript|onload|onerror).*"
    );
    
    private static final Pattern XSS_PATTERN = Pattern.compile(
        "(?i).*(<script|</script|javascript:|vbscript:|onload=|onerror=|onclick=|onmouseover=|<iframe|</iframe).*"
    );
    
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]+>");
    
    private static final Pattern LDAP_INJECTION_PATTERN = Pattern.compile(
        ".*[()=*!&|].*"
    );

    /**
     * Sanitizes general text input by removing potentially dangerous characters
     */
    public String sanitizeText(String input) {
        if (input == null) {
            return null;
        }
        
        String sanitized = input.trim();
        
        // Remove HTML tags
        sanitized = HTML_TAG_PATTERN.matcher(sanitized).replaceAll("");
        
        // Remove null bytes
        sanitized = sanitized.replace("\0", "");
        
        // Remove control characters except newline, carriage return, and tab
        sanitized = sanitized.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");
        
        return sanitized;
    }

    /**
     * Sanitizes HTML content by escaping dangerous characters
     */
    public String sanitizeHtml(String input) {
        if (input == null) {
            return null;
        }
        
        return input
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")
            .replace("/", "&#x2F;");
    }

    /**
     * Sanitizes input for SQL queries (though parameterized queries should be used)
     */
    public String sanitizeForSql(String input) {
        if (input == null) {
            return null;
        }
        
        String sanitized = sanitizeText(input);
        
        // Escape single quotes
        sanitized = sanitized.replace("'", "''");
        
        return sanitized;
    }

    /**
     * Validates that input doesn't contain SQL injection patterns
     */
    public boolean containsSqlInjection(String input) {
        if (input == null) {
            return false;
        }
        return SQL_INJECTION_PATTERN.matcher(input).matches();
    }

    /**
     * Validates that input doesn't contain XSS patterns
     */
    public boolean containsXss(String input) {
        if (input == null) {
            return false;
        }
        return XSS_PATTERN.matcher(input).matches();
    }

    /**
     * Validates that input doesn't contain LDAP injection patterns
     */
    public boolean containsLdapInjection(String input) {
        if (input == null) {
            return false;
        }
        return LDAP_INJECTION_PATTERN.matcher(input).matches();
    }

    /**
     * Comprehensive security validation
     */
    public SecurityValidationResult validateSecurity(String input) {
        if (input == null) {
            return new SecurityValidationResult(true, null);
        }
        
        if (containsSqlInjection(input)) {
            return new SecurityValidationResult(false, "Input contains potential SQL injection patterns");
        }
        
        if (containsXss(input)) {
            return new SecurityValidationResult(false, "Input contains potential XSS patterns");
        }
        
        if (containsLdapInjection(input)) {
            return new SecurityValidationResult(false, "Input contains potential LDAP injection patterns");
        }
        
        return new SecurityValidationResult(true, null);
    }

    /**
     * Result of security validation
     */
    public static class SecurityValidationResult {
        private final boolean valid;
        private final String errorMessage;

        public SecurityValidationResult(boolean valid, String errorMessage) {
            this.valid = valid;
            this.errorMessage = errorMessage;
        }

        public boolean isValid() {
            return valid;
        }

        public String getErrorMessage() {
            return errorMessage;
        }
    }
}