package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for order item information
 */
@Data
@Builder
public class OrderItemResponse {

    private Long id;
    private Long orderId;
    
    private Long productId;
    private String productName;
    private String productSku;
    
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    
    private BigDecimal discountAmount;
    private BigDecimal discountPercentage;
    private Boolean hasDiscount;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}