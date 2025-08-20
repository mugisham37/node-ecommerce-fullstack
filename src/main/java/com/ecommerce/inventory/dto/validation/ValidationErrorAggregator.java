package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Utility for aggregating validation errors and providing user-friendly error messages
 */
@Component
public class ValidationErrorAggregator {

    @Autowired
    private Validator validator;

    /**
     * Validates an object and returns aggregated validation errors
     */
    public <T> ValidationResult validate(T object, Class<?>... groups) {
        Set<ConstraintViolation<T>> violations = validator.validate(object, groups);
        return processViolations(violations);
    }

    /**
     * Validates a property of an object and returns aggregated validation errors
     */
    public <T> ValidationResult validateProperty(T object, String propertyName, Class<?>... groups) {
        Set<ConstraintViolation<T>> violations = validator.validateProperty(object, propertyName, groups);
        return processViolations(violations);
    }

    /**
     * Validates a value against property constraints and returns aggregated validation errors
     */
    public <T> ValidationResult validateValue(Class<T> beanType, String propertyName, Object value, Class<?>... groups) {
        Set<ConstraintViolation<T>> violations = validator.validateValue(beanType, propertyName, value, groups);
        return processViolations(violations);
    }

    private <T> ValidationResult processViolations(Set<ConstraintViolation<T>> violations) {
        if (violations.isEmpty()) {
            return ValidationResult.valid();
        }

        Map<String, List<String>> fieldErrors = new HashMap<>();
        List<String> globalErrors = new ArrayList<>();

        for (ConstraintViolation<T> violation : violations) {
            String propertyPath = violation.getPropertyPath().toString();
            String message = violation.getMessage();

            if (propertyPath.isEmpty()) {
                globalErrors.add(message);
            } else {
                fieldErrors.computeIfAbsent(propertyPath, k -> new ArrayList<>()).add(message);
            }
        }

        return ValidationResult.invalid(fieldErrors, globalErrors);
    }

    /**
     * Creates user-friendly error messages from validation violations
     */
    public Map<String, String> createUserFriendlyMessages(ValidationResult result) {
        Map<String, String> friendlyMessages = new HashMap<>();

        // Process field errors
        result.getFieldErrors().forEach((field, errors) -> {
            String friendlyMessage = createFriendlyFieldMessage(field, errors);
            friendlyMessages.put(field, friendlyMessage);
        });

        // Process global errors
        if (!result.getGlobalErrors().isEmpty()) {
            String friendlyMessage = String.join(". ", result.getGlobalErrors());
            friendlyMessages.put("_global", friendlyMessage);
        }

        return friendlyMessages;
    }

    private String createFriendlyFieldMessage(String field, List<String> errors) {
        if (errors.size() == 1) {
            return errors.get(0);
        }

        // Multiple errors for the same field
        return errors.stream()
                .collect(Collectors.joining("; "));
    }

    /**
     * Result of validation containing errors and status
     */
    public static class ValidationResult {
        private final boolean valid;
        private final Map<String, List<String>> fieldErrors;
        private final List<String> globalErrors;

        private ValidationResult(boolean valid, Map<String, List<String>> fieldErrors, List<String> globalErrors) {
            this.valid = valid;
            this.fieldErrors = fieldErrors != null ? new HashMap<>(fieldErrors) : new HashMap<>();
            this.globalErrors = globalErrors != null ? new ArrayList<>(globalErrors) : new ArrayList<>();
        }

        public static ValidationResult valid() {
            return new ValidationResult(true, null, null);
        }

        public static ValidationResult invalid(Map<String, List<String>> fieldErrors, List<String> globalErrors) {
            return new ValidationResult(false, fieldErrors, globalErrors);
        }

        public boolean isValid() {
            return valid;
        }

        public Map<String, List<String>> getFieldErrors() {
            return new HashMap<>(fieldErrors);
        }

        public List<String> getGlobalErrors() {
            return new ArrayList<>(globalErrors);
        }

        public boolean hasFieldErrors() {
            return !fieldErrors.isEmpty();
        }

        public boolean hasGlobalErrors() {
            return !globalErrors.isEmpty();
        }

        public int getTotalErrorCount() {
            int fieldErrorCount = fieldErrors.values().stream()
                    .mapToInt(List::size)
                    .sum();
            return fieldErrorCount + globalErrors.size();
        }

        public List<String> getErrorsForField(String field) {
            return new ArrayList<>(fieldErrors.getOrDefault(field, Collections.emptyList()));
        }
    }
}