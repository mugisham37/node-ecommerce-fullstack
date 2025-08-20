package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * Request DTO for searching orders with filters
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class OrderSearchRequest extends PaginationRequest {

    @Size(max = 50, message = "Order number must not exceed 50 characters")
    private String orderNumber;

    @Size(max = 255, message = "Customer email must not exceed 255 characters")
    private String customerEmail;

    @Size(max = 200, message = "Customer name must not exceed 200 characters")
    private String customerName;

    private String status;

    private LocalDateTime createdAfter;

    private LocalDateTime createdBefore;

    private Long createdBy;

    public OrderSearchRequest() {
        super();
        setSortBy("createdAt");
        setSortDirection("DESC");
    }
}