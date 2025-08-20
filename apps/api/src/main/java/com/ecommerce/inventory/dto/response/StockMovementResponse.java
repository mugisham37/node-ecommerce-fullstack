package com.ecommerce.inventory.dto.response;

import com.ecommerce.inventory.entity.StockMovementType;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

/**
 * Response DTO for StockMovement
 */
public class StockMovementResponse {

    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private StockMovementType movementType;
    private Integer quantity;
    private Integer previousQuantity;
    private Integer newQuantity;
    private String reason;
    private String referenceId;
    private String referenceType;
    private Long userId;
    private String userName;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    // Constructors
    public StockMovementResponse() {}

    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private StockMovementResponse response = new StockMovementResponse();

        public Builder id(Long id) {
            response.id = id;
            return this;
        }

        public Builder productId(Long productId) {
            response.productId = productId;
            return this;
        }

        public Builder productName(String productName) {
            response.productName = productName;
            return this;
        }

        public Builder productSku(String productSku) {
            response.productSku = productSku;
            return this;
        }

        public Builder movementType(StockMovementType movementType) {
            response.movementType = movementType;
            return this;
        }

        public Builder quantity(Integer quantity) {
            response.quantity = quantity;
            return this;
        }

        public Builder previousQuantity(Integer previousQuantity) {
            response.previousQuantity = previousQuantity;
            return this;
        }

        public Builder newQuantity(Integer newQuantity) {
            response.newQuantity = newQuantity;
            return this;
        }

        public Builder reason(String reason) {
            response.reason = reason;
            return this;
        }

        public Builder referenceId(String referenceId) {
            response.referenceId = referenceId;
            return this;
        }

        public Builder referenceType(String referenceType) {
            response.referenceType = referenceType;
            return this;
        }

        public Builder userId(Long userId) {
            response.userId = userId;
            return this;
        }

        public Builder userName(String userName) {
            response.userName = userName;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            response.createdAt = createdAt;
            return this;
        }

        public StockMovementResponse build() {
            return response;
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductSku() {
        return productSku;
    }

    public void setProductSku(String productSku) {
        this.productSku = productSku;
    }

    public StockMovementType getMovementType() {
        return movementType;
    }

    public void setMovementType(StockMovementType movementType) {
        this.movementType = movementType;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getPreviousQuantity() {
        return previousQuantity;
    }

    public void setPreviousQuantity(Integer previousQuantity) {
        this.previousQuantity = previousQuantity;
    }

    public Integer getNewQuantity() {
        return newQuantity;
    }

    public void setNewQuantity(Integer newQuantity) {
        this.newQuantity = newQuantity;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}