package com.ecommerce.inventory.dto.response;

import com.ecommerce.inventory.entity.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for order summary information (used in lists)
 */
@Data
@Builder
public class OrderSummaryResponse {

    private Long id;
    private String orderNumber;
    
    private String customerName;
    private String customerEmail;
    
    private OrderStatus status;
    private String statusDescription;
    
    private BigDecimal totalAmount;
    private Integer totalQuantity;
    private Integer itemCount;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private Boolean canBeCancelled;
    private Boolean isFinalState;
}