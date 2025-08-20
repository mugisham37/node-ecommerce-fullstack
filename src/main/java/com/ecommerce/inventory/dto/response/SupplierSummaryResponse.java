package com.ecommerce.inventory.dto.response;

import com.ecommerce.inventory.entity.SupplierStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response DTO for supplier summary information (used in lists)
 */
@Data
@Builder
public class SupplierSummaryResponse {

    private Long id;
    private String name;
    private String contactPerson;
    private String email;
    private String phone;
    
    private SupplierStatus status;
    private String statusDescription;
    
    private Long totalProductCount;
    private Long activeProductCount;
    
    private Boolean isActive;
    private String primaryContact;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}