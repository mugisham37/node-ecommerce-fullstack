package com.ecommerce.inventory.dto.response;

import com.ecommerce.inventory.entity.SupplierStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response DTO for supplier information
 */
@Data
@Builder
public class SupplierResponse {
    
    private Long id;
    private String name;
    private String contactEmail;
    private String contactPhone;
    private String address;
    private String contactPerson;
    private SupplierStatus status;
    private String statusDescription;
    private Integer productCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}