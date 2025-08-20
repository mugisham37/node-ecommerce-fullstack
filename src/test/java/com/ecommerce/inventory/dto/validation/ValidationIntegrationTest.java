package com.ecommerce.inventory.dto.validation;

import com.ecommerce.inventory.exception.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ValidationIntegrationTest {

    @Autowired
    private ValidationService validationService;

    @Autowired
    private InputSanitizer inputSanitizer;

    @Test
    void testInputSanitization() {
        // Test HTML sanitization
        String htmlInput = "<script>alert('xss')</script>Hello World";
        String sanitized = inputSanitizer.sanitizeHtml(htmlInput);
        assertFalse(sanitized.contains("<script>"));
        assertTrue(sanitized.contains("Hello World"));

        // Test text sanitization
        String textInput = "Hello\0World\u0001Test";
        String sanitizedText = inputSanitizer.sanitizeText(textInput);
        assertFalse(sanitizedText.contains("\0"));
        assertFalse(sanitizedText.contains("\u0001"));
    }

    @Test
    void testSecurityValidation() {
        // Test SQL injection detection
        assertTrue(inputSanitizer.containsSqlInjection("'; DROP TABLE users; --"));
        assertFalse(inputSanitizer.containsSqlInjection("Normal product name"));

        // Test XSS detection
        assertTrue(inputSanitizer.containsXss("<script>alert('xss')</script>"));
        assertFalse(inputSanitizer.containsXss("Normal product description"));
    }

    @Test
    void testValidationService() {
        TestDto validDto = new TestDto();
        validDto.name = "Valid Name";
        validDto.description = "Valid description";

        // Should not throw exception
        assertDoesNotThrow(() -> validationService.validateAndThrow(validDto));

        // Test invalid DTO
        TestDto invalidDto = new TestDto();
        invalidDto.name = null; // Violates @NotNull
        invalidDto.description = ""; // Violates @Size

        assertThrows(ValidationException.class, () -> validationService.validateAndThrow(invalidDto));
    }

    @Test
    void testSecurityValidationService() {
        // Test security validation
        assertThrows(ValidationException.class, () -> 
            validationService.validateSecurityAndThrow("'; DROP TABLE users; --", "maliciousField"));

        // Should not throw for safe input
        assertDoesNotThrow(() -> 
            validationService.validateSecurityAndThrow("Safe input", "safeField"));
    }

    // Test DTO class
    static class TestDto {
        @NotNull(message = "Name is required")
        @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
        @SafeInput
        String name;

        @Size(min = 1, message = "Description cannot be empty")
        @SafeInput
        String description;
    }
}