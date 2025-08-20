package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * Base pagination request DTO
 */
@Data
public class PaginationRequest {

    @Min(value = 0, message = "Page number must be non-negative")
    private int page = 0;

    @Min(value = 1, message = "Page size must be at least 1")
    @Max(value = 100, message = "Page size must not exceed 100")
    private int size = 20;

    private String sortBy = "id";
    private String sortDirection = "ASC";

    public PaginationRequest() {}

    public PaginationRequest(int page, int size) {
        this.page = page;
        this.size = size;
    }

    public PaginationRequest(int page, int size, String sortBy, String sortDirection) {
        this.page = page;
        this.size = size;
        this.sortBy = sortBy;
        this.sortDirection = sortDirection;
    }
}