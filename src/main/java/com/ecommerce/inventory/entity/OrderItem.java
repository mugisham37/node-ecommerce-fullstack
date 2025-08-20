package com.ecommerce.inventory.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Order Item entity representing individual products within an order
 */
@Entity
@Table(name = "order_items", indexes = {
    @Index(name = "idx_order_items_order_id", columnList = "order_id"),
    @Index(name = "idx_order_items_product_id", columnList = "product_id"),
    @Index(name = "idx_order_items_order_product", columnList = "order_id, product_id")
})
public class OrderItem extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Order is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @NotNull(message = "Product is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Column(nullable = false)
    private Integer quantity;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Unit price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Unit price must have at most 8 integer digits and 2 decimal places")
    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @NotNull(message = "Total price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Total price must be greater than 0")
    @Digits(integer = 10, fraction = 2, message = "Total price must have at most 10 integer digits and 2 decimal places")
    @Column(name = "total_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice;

    // Constructors
    public OrderItem() {}

    public OrderItem(Order order, Product product, Integer quantity, BigDecimal unitPrice) {
        this.order = order;
        this.product = product;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        calculateTotalPrice();
    }

    public OrderItem(Product product, Integer quantity, BigDecimal unitPrice) {
        this.product = product;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        calculateTotalPrice();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
        calculateTotalPrice();
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
        calculateTotalPrice();
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }

    // Business methods

    /**
     * Calculate total price based on quantity and unit price
     */
    public void calculateTotalPrice() {
        if (quantity != null && unitPrice != null) {
            this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity))
                                      .setScale(2, RoundingMode.HALF_UP);
        } else {
            this.totalPrice = BigDecimal.ZERO;
        }
    }

    /**
     * Update quantity and recalculate total
     */
    public void updateQuantity(Integer newQuantity) {
        if (newQuantity == null || newQuantity < 1) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }
        
        if (order != null && !order.canBeModified()) {
            throw new IllegalStateException("Cannot modify order item when order is in status: " + order.getStatus());
        }
        
        this.quantity = newQuantity;
        calculateTotalPrice();
        
        // Update order totals if part of an order
        if (order != null) {
            order.recalculateTotals();
        }
    }

    /**
     * Update unit price and recalculate total
     */
    public void updateUnitPrice(BigDecimal newUnitPrice) {
        if (newUnitPrice == null || newUnitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Unit price must be greater than 0");
        }
        
        if (order != null && !order.canBeModified()) {
            throw new IllegalStateException("Cannot modify order item when order is in status: " + order.getStatus());
        }
        
        this.unitPrice = newUnitPrice;
        calculateTotalPrice();
        
        // Update order totals if part of an order
        if (order != null) {
            order.recalculateTotals();
        }
    }

    /**
     * Get product name for display purposes
     */
    public String getProductName() {
        return product != null ? product.getName() : null;
    }

    /**
     * Get product SKU for display purposes
     */
    public String getProductSku() {
        return product != null ? product.getSku() : null;
    }

    /**
     * Calculate discount amount if unit price is different from product selling price
     */
    public BigDecimal getDiscountAmount() {
        if (product == null || product.getSellingPrice() == null || unitPrice == null) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal originalPrice = product.getSellingPrice();
        if (unitPrice.compareTo(originalPrice) < 0) {
            return originalPrice.subtract(unitPrice).multiply(BigDecimal.valueOf(quantity));
        }
        
        return BigDecimal.ZERO;
    }

    /**
     * Calculate discount percentage
     */
    public BigDecimal getDiscountPercentage() {
        if (product == null || product.getSellingPrice() == null || unitPrice == null) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal originalPrice = product.getSellingPrice();
        if (unitPrice.compareTo(originalPrice) < 0 && originalPrice.compareTo(BigDecimal.ZERO) > 0) {
            return originalPrice.subtract(unitPrice)
                               .divide(originalPrice, 4, RoundingMode.HALF_UP)
                               .multiply(BigDecimal.valueOf(100));
        }
        
        return BigDecimal.ZERO;
    }

    /**
     * Check if item has discount
     */
    public boolean hasDiscount() {
        return getDiscountAmount().compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Create order item from product with current selling price
     */
    public static OrderItem fromProduct(Product product, Integer quantity) {
        if (product == null) {
            throw new IllegalArgumentException("Product cannot be null");
        }
        if (quantity == null || quantity < 1) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }
        
        return new OrderItem(product, quantity, product.getSellingPrice());
    }

    /**
     * Create order item with custom price
     */
    public static OrderItem withCustomPrice(Product product, Integer quantity, BigDecimal customPrice) {
        if (product == null) {
            throw new IllegalArgumentException("Product cannot be null");
        }
        if (quantity == null || quantity < 1) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }
        if (customPrice == null || customPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Custom price must be greater than 0");
        }
        
        return new OrderItem(product, quantity, customPrice);
    }

    /**
     * Validate order item data
     */
    public boolean isValid() {
        return product != null && 
               quantity != null && quantity > 0 &&
               unitPrice != null && unitPrice.compareTo(BigDecimal.ZERO) > 0 &&
               totalPrice != null && totalPrice.compareTo(BigDecimal.ZERO) > 0;
    }

    @PrePersist
    @PreUpdate
    protected void validateAndCalculate() {
        calculateTotalPrice();
        
        if (!isValid()) {
            throw new IllegalStateException("Order item is not in a valid state");
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OrderItem orderItem = (OrderItem) o;
        return Objects.equals(id, orderItem.id) && 
               Objects.equals(order, orderItem.order) && 
               Objects.equals(product, orderItem.product);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, order, product);
    }

    @Override
    public String toString() {
        return "OrderItem{" +
                "id=" + id +
                ", orderId=" + (order != null ? order.getId() : null) +
                ", productId=" + (product != null ? product.getId() : null) +
                ", productName='" + getProductName() + '\'' +
                ", productSku='" + getProductSku() + '\'' +
                ", quantity=" + quantity +
                ", unitPrice=" + unitPrice +
                ", totalPrice=" + totalPrice +
                ", hasDiscount=" + hasDiscount() +
                '}';
    }
}