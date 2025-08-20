package com.ecommerce.inventory.service.report;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Report Parameter Validator for validating report parameters
 * Ensures data integrity and proper parameter validation
 */
@Service
public class ReportParameterValidator {
    
    private static final Logger logger = LoggerFactory.getLogger(ReportParameterValidator.class);
    
    /**
     * Validate parameters for a report template
     */
    public void validateParameters(ReportTemplate template, Map<String, Object> parameters) {
        logger.debug("Validating parameters for template: {}", template.getTemplateId());
        
        List<String> errors = new ArrayList<>();
        
        // Validate required parameters
        for (ReportParameter param : template.getRequiredParameters()) {
            validateParameter(param, parameters, errors, true);
        }
        
        // Validate optional parameters (only if provided)
        for (ReportParameter param : template.getOptionalParameters()) {
            if (parameters.containsKey(param.getName())) {
                validateParameter(param, parameters, errors, false);
            }
        }
        
        if (!errors.isEmpty()) {
            String errorMessage = "Parameter validation failed: " + String.join(", ", errors);
            logger.error("Validation errors for template {}: {}", template.getTemplateId(), errorMessage);
            throw new ReportParameterValidationException(errorMessage, errors);
        }
        
        logger.debug("Parameter validation successful for template: {}", template.getTemplateId());
    }
    
    /**
     * Validate a single parameter
     */
    private void validateParameter(ReportParameter param, Map<String, Object> parameters, 
                                 List<String> errors, boolean isRequired) {
        
        String paramName = param.getName();
        Object value = parameters.get(paramName);
        
        // Check if required parameter is missing
        if (isRequired && (value == null || (value instanceof String && ((String) value).trim().isEmpty()))) {
            errors.add("Required parameter '" + paramName + "' is missing or empty");
            return;
        }
        
        // Skip validation if optional parameter is not provided
        if (!isRequired && value == null) {
            return;
        }
        
        // Validate parameter type and constraints
        try {
            switch (param.getType()) {
                case STRING:
                    validateStringParameter(param, value, errors);
                    break;
                case INTEGER:
                    validateIntegerParameter(param, value, errors);
                    break;
                case LONG:
                    validateLongParameter(param, value, errors);
                    break;
                case DECIMAL:
                    validateDecimalParameter(param, value, errors);
                    break;
                case BOOLEAN:
                    validateBooleanParameter(param, value, errors);
                    break;
                case DATE:
                    validateDateParameter(param, value, errors);
                    break;
                case DATETIME:
                    validateDateTimeParameter(param, value, errors);
                    break;
                case ENUM:
                    validateEnumParameter(param, value, errors);
                    break;
                case LIST:
                    validateListParameter(param, value, errors);
                    break;
                case OBJECT:
                    validateObjectParameter(param, value, errors);
                    break;
                default:
                    errors.add("Unknown parameter type for '" + paramName + "': " + param.getType());
            }
        } catch (Exception e) {
            errors.add("Validation error for parameter '" + paramName + "': " + e.getMessage());
        }
    }
    
    private void validateStringParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        
        if (!(value instanceof String)) {
            errors.add("Parameter '" + paramName + "' must be a string");
            return;
        }
        
        String stringValue = (String) value;
        
        // Check validation pattern
        if (param.getValidationPattern() != null) {
            Pattern pattern = Pattern.compile(param.getValidationPattern());
            if (!pattern.matcher(stringValue).matches()) {
                errors.add("Parameter '" + paramName + "' does not match required pattern: " + param.getValidationPattern());
            }
        }
        
        // Check allowed values
        if (param.getAllowedValues() != null && !param.getAllowedValues().isEmpty()) {
            if (!param.getAllowedValues().contains(stringValue)) {
                errors.add("Parameter '" + paramName + "' must be one of: " + param.getAllowedValues());
            }
        }
        
        // Check length constraints (using minValue/maxValue as length constraints)
        if (param.getMinValue() != null) {
            int minLength = ((Number) param.getMinValue()).intValue();
            if (stringValue.length() < minLength) {
                errors.add("Parameter '" + paramName + "' must be at least " + minLength + " characters long");
            }
        }
        
        if (param.getMaxValue() != null) {
            int maxLength = ((Number) param.getMaxValue()).intValue();
            if (stringValue.length() > maxLength) {
                errors.add("Parameter '" + paramName + "' must be at most " + maxLength + " characters long");
            }
        }
    }
    
    private void validateIntegerParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        Integer intValue;
        
        try {
            if (value instanceof Integer) {
                intValue = (Integer) value;
            } else if (value instanceof String) {
                intValue = Integer.parseInt((String) value);
            } else if (value instanceof Number) {
                intValue = ((Number) value).intValue();
            } else {
                errors.add("Parameter '" + paramName + "' must be an integer");
                return;
            }
        } catch (NumberFormatException e) {
            errors.add("Parameter '" + paramName + "' must be a valid integer");
            return;
        }
        
        // Check range constraints
        if (param.getMinValue() != null) {
            int minValue = ((Number) param.getMinValue()).intValue();
            if (intValue < minValue) {
                errors.add("Parameter '" + paramName + "' must be at least " + minValue);
            }
        }
        
        if (param.getMaxValue() != null) {
            int maxValue = ((Number) param.getMaxValue()).intValue();
            if (intValue > maxValue) {
                errors.add("Parameter '" + paramName + "' must be at most " + maxValue);
            }
        }
    }
    
    private void validateLongParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        Long longValue;
        
        try {
            if (value instanceof Long) {
                longValue = (Long) value;
            } else if (value instanceof String) {
                longValue = Long.parseLong((String) value);
            } else if (value instanceof Number) {
                longValue = ((Number) value).longValue();
            } else {
                errors.add("Parameter '" + paramName + "' must be a long integer");
                return;
            }
        } catch (NumberFormatException e) {
            errors.add("Parameter '" + paramName + "' must be a valid long integer");
            return;
        }
        
        // Check range constraints
        if (param.getMinValue() != null) {
            long minValue = ((Number) param.getMinValue()).longValue();
            if (longValue < minValue) {
                errors.add("Parameter '" + paramName + "' must be at least " + minValue);
            }
        }
        
        if (param.getMaxValue() != null) {
            long maxValue = ((Number) param.getMaxValue()).longValue();
            if (longValue > maxValue) {
                errors.add("Parameter '" + paramName + "' must be at most " + maxValue);
            }
        }
    }
    
    private void validateDecimalParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        BigDecimal decimalValue;
        
        try {
            if (value instanceof BigDecimal) {
                decimalValue = (BigDecimal) value;
            } else if (value instanceof String) {
                decimalValue = new BigDecimal((String) value);
            } else if (value instanceof Number) {
                decimalValue = BigDecimal.valueOf(((Number) value).doubleValue());
            } else {
                errors.add("Parameter '" + paramName + "' must be a decimal number");
                return;
            }
        } catch (NumberFormatException e) {
            errors.add("Parameter '" + paramName + "' must be a valid decimal number");
            return;
        }
        
        // Check range constraints
        if (param.getMinValue() != null) {
            BigDecimal minValue = new BigDecimal(param.getMinValue().toString());
            if (decimalValue.compareTo(minValue) < 0) {
                errors.add("Parameter '" + paramName + "' must be at least " + minValue);
            }
        }
        
        if (param.getMaxValue() != null) {
            BigDecimal maxValue = new BigDecimal(param.getMaxValue().toString());
            if (decimalValue.compareTo(maxValue) > 0) {
                errors.add("Parameter '" + paramName + "' must be at most " + maxValue);
            }
        }
    }
    
    private void validateBooleanParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        
        if (value instanceof Boolean) {
            return; // Valid boolean
        }
        
        if (value instanceof String) {
            String stringValue = ((String) value).toLowerCase();
            if ("true".equals(stringValue) || "false".equals(stringValue)) {
                return; // Valid boolean string
            }
        }
        
        errors.add("Parameter '" + paramName + "' must be a boolean (true/false)");
    }
    
    private void validateDateParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        
        if (value instanceof LocalDate) {
            return; // Valid date
        }
        
        if (value instanceof String) {
            try {
                LocalDate.parse((String) value);
                return; // Valid date string
            } catch (DateTimeParseException e) {
                errors.add("Parameter '" + paramName + "' must be a valid date (YYYY-MM-DD format)");
            }
        } else {
            errors.add("Parameter '" + paramName + "' must be a date");
        }
    }
    
    private void validateDateTimeParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        
        if (value instanceof LocalDateTime) {
            return; // Valid datetime
        }
        
        if (value instanceof String) {
            try {
                LocalDateTime.parse((String) value);
                return; // Valid datetime string
            } catch (DateTimeParseException e) {
                errors.add("Parameter '" + paramName + "' must be a valid datetime (ISO format)");
            }
        } else {
            errors.add("Parameter '" + paramName + "' must be a datetime");
        }
    }
    
    private void validateEnumParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        
        if (!(value instanceof String)) {
            errors.add("Parameter '" + paramName + "' must be a string");
            return;
        }
        
        String stringValue = (String) value;
        
        if (param.getAllowedValues() == null || param.getAllowedValues().isEmpty()) {
            errors.add("No allowed values defined for enum parameter '" + paramName + "'");
            return;
        }
        
        if (!param.getAllowedValues().contains(stringValue)) {
            errors.add("Parameter '" + paramName + "' must be one of: " + param.getAllowedValues());
        }
    }
    
    private void validateListParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        
        if (!(value instanceof List)) {
            errors.add("Parameter '" + paramName + "' must be a list");
            return;
        }
        
        List<?> listValue = (List<?>) value;
        
        // Check size constraints
        if (param.getMinValue() != null) {
            int minSize = ((Number) param.getMinValue()).intValue();
            if (listValue.size() < minSize) {
                errors.add("Parameter '" + paramName + "' must contain at least " + minSize + " items");
            }
        }
        
        if (param.getMaxValue() != null) {
            int maxSize = ((Number) param.getMaxValue()).intValue();
            if (listValue.size() > maxSize) {
                errors.add("Parameter '" + paramName + "' must contain at most " + maxSize + " items");
            }
        }
        
        // Validate allowed values for list items
        if (param.getAllowedValues() != null && !param.getAllowedValues().isEmpty()) {
            for (Object item : listValue) {
                if (item instanceof String) {
                    if (!param.getAllowedValues().contains((String) item)) {
                        errors.add("List item '" + item + "' in parameter '" + paramName + 
                                 "' must be one of: " + param.getAllowedValues());
                    }
                }
            }
        }
    }
    
    private void validateObjectParameter(ReportParameter param, Object value, List<String> errors) {
        String paramName = param.getName();
        
        if (value == null) {
            errors.add("Parameter '" + paramName + "' cannot be null");
            return;
        }
        
        // For object parameters, we mainly check that it's not null
        // More specific validation would depend on the object structure
        if (!(value instanceof Map) && !(value instanceof Object)) {
            errors.add("Parameter '" + paramName + "' must be a valid object");
        }
    }
}