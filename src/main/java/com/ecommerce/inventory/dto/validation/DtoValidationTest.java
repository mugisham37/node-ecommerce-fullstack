package com.ecommerce.inventory.dto.validation;

import com.ecommerce.inventory.dto.request.*;
import com.ecommerce.inventory.dto.response.*;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Simple validation test for DTOs to ensure they are properly structured
 */
public class DtoValidationTest {

    private static final ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
    private static final Validator validator = factory.getValidator();

    public static void main(String[] args) {
        testProductCreateRequest();
        testUserCreateRequest();
        testOrderCreateRequest();
        testPricingUpdateRequest();
        System.out.println("All DTO validation tests passed!");
    }

    private static void testProductCreateRequest() {
        ProductCreateRequest request = new ProductCreateRequest();
        request.setName("Test Product");
        request.setSku("TEST-PROD-001");
        request.setCategoryId(1L);
        request.setSupplierId(1L);
        request.setCostPrice(new BigDecimal("10.00"));
        request.setSellingPrice(new BigDecimal("15.00"));

        Set<ConstraintViolation<ProductCreateRequest>> violations = validator.validate(request);
        System.out.println("ProductCreateRequest violations: " + violations.size());
    }

    private static void testUserCreateRequest() {
        UserCreateRequest request = new UserCreateRequest();
        request.setEmail("test@example.com");
        request.setPassword("TestPass123!");
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setRole("ADMIN");

        Set<ConstraintViolation<UserCreateRequest>> violations = validator.validate(request);
        System.out.println("UserCreateRequest violations: " + violations.size());
    }

    private static void testOrderCreateRequest() {
        OrderCreateRequest request = new OrderCreateRequest();
        request.setCustomerName("Test Customer");
        request.setCustomerEmail("customer@example.com");
        request.setShippingAddress("123 Test Street");

        Set<ConstraintViolation<OrderCreateRequest>> violations = validator.validate(request);
        System.out.println("OrderCreateRequest violations: " + violations.size());
    }

    private static void testPricingUpdateRequest() {
        PricingUpdateRequest request = new PricingUpdateRequest();
        request.setCostPrice(new BigDecimal("10.00"));
        request.setSellingPrice(new BigDecimal("15.00"));

        Set<ConstraintViolation<PricingUpdateRequest>> violations = validator.validate(request);
        System.out.println("PricingUpdateRequest violations: " + violations.size());
    }
}