package com.ecommerce.inventory.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

/**
 * Validator for ValidPassword annotation with configurable password strength requirements
 */
public class ValidPasswordValidator implements ConstraintValidator<ValidPassword, String> {

    private int minLength;
    private boolean requireUppercase;
    private boolean requireLowercase;
    private boolean requireDigit;
    private boolean requireSpecialChar;

    private static final Pattern UPPERCASE_PATTERN = Pattern.compile(".*[A-Z].*");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile(".*[a-z].*");
    private static final Pattern DIGIT_PATTERN = Pattern.compile(".*\\d.*");
    private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*");

    @Override
    public void initialize(ValidPassword constraintAnnotation) {
        this.minLength = constraintAnnotation.minLength();
        this.requireUppercase = constraintAnnotation.requireUppercase();
        this.requireLowercase = constraintAnnotation.requireLowercase();
        this.requireDigit = constraintAnnotation.requireDigit();
        this.requireSpecialChar = constraintAnnotation.requireSpecialChar();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null validation
        }

        // Check minimum length
        if (value.length() < minLength) {
            return false;
        }

        // Check uppercase requirement
        if (requireUppercase && !UPPERCASE_PATTERN.matcher(value).matches()) {
            return false;
        }

        // Check lowercase requirement
        if (requireLowercase && !LOWERCASE_PATTERN.matcher(value).matches()) {
            return false;
        }

        // Check digit requirement
        if (requireDigit && !DIGIT_PATTERN.matcher(value).matches()) {
            return false;
        }

        // Check special character requirement
        if (requireSpecialChar && !SPECIAL_CHAR_PATTERN.matcher(value).matches()) {
            return false;
        }

        return true;
    }
}