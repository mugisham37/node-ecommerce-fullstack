package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Request DTO for updating an existing supplier
 */
@Data
public class SupplierUpdateRequest {

    @Size(max = 200, message = "Supplier name must not exceed 200 characters")
    private String name;

    @Size(max = 100, message = "Contact person name must not exceed 100 characters")
    private String contactPerson;

    @Email(message = "Email should be valid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phone;

    @Size(max = 1000, message = "Address must not exceed 1000 characters")
    private String address;

    @Size(max = 100, message = "Payment terms must not exceed 100 characters")
    private String paymentTerms;
}