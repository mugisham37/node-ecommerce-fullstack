package com.ecommerce.inventory.dto.response;

import com.ecommerce.inventory.entity.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for order information
 */
@Data
@Builder
public class OrderResponse {

    private Long id;
    private String orderNumber;
    
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    
    private String shippingAddress;
    private String billingAddress;
    
    private OrderStatus status;
    private String statusDescription;
    
    private String trackingNumber;
    private String shippingCarrier;
    private String notes;
    
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal shippingCost;
    private BigDecimal totalAmount;
    
    private Integer totalQuantity;
    private Integer itemCount;
    
    private List<OrderItemResponse> orderItems;
    
    private Long createdById;
    private String createdByName;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private Boolean canBeCancelled;
    private Boolean canBeModified;
    private Boolean isFinalState;
    private Boolean isActive;
}