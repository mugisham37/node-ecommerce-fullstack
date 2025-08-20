package com.ecommerce.inventory.entity;

import com.ecommerce.inventory.exception.InvalidOrderStatusTransitionException;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Order entity representing customer orders with complex business logic
 */
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_orders_order_number", columnList = "order_number"),
    @Index(name = "idx_orders_status", columnList = "status"),
    @Index(name = "idx_orders_customer_email", columnList = "customer_email"),
    @Index(name = "idx_orders_created_by", columnList = "created_by"),
    @Index(name = "idx_orders_created_at", columnList = "created_at"),
    @Index(name = "idx_orders_status_created", columnList = "status, created_at"),
    @Index(name = "idx_orders_customer_status", columnList = "customer_email, status")
})
public class Order extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Order number is required")
    @Size(max = 50, message = "Order number must not exceed 50 characters")
    @Column(name = "order_number", unique = true, nullable = false)
    private String orderNumber;

    @NotBlank(message = "Customer name is required")
    @Size(max = 200, message = "Customer name must not exceed 200 characters")
    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Email(message = "Customer email should be valid")
    @Size(max = 255, message = "Customer email must not exceed 255 characters")
    @Column(name = "customer_email")
    private String customerEmail;

    @Size(max = 20, message = "Customer phone must not exceed 20 characters")
    @Column(name = "customer_phone")
    private String customerPhone;

    @NotBlank(message = "Shipping address is required")
    @Column(name = "shipping_address", nullable = false, columnDefinition = "TEXT")
    private String shippingAddress;

    @Column(name = "billing_address", columnDefinition = "TEXT")
    private String billingAddress;

    @NotNull(message = "Order status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    @NotNull(message = "Subtotal is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Subtotal must be non-negative")
    @Digits(integer = 10, fraction = 2, message = "Subtotal must have at most 10 integer digits and 2 decimal places")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", inclusive = true, message = "Tax amount must be non-negative")
    @Digits(integer = 8, fraction = 2, message = "Tax amount must have at most 8 integer digits and 2 decimal places")
    @Column(name = "tax_amount", precision = 10, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", inclusive = true, message = "Shipping cost must be non-negative")
    @Digits(integer = 8, fraction = 2, message = "Shipping cost must have at most 8 integer digits and 2 decimal places")
    @Column(name = "shipping_cost", precision = 10, scale = 2)
    private BigDecimal shippingCost = BigDecimal.ZERO;

    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Total amount must be non-negative")
    @Digits(integer = 10, fraction = 2, message = "Total amount must have at most 10 integer digits and 2 decimal places")
    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Size(max = 100, message = "Tracking number must not exceed 100 characters")
    @Column(name = "tracking_number")
    private String trackingNumber;

    @Size(max = 50, message = "Shipping carrier must not exceed 50 characters")
    @Column(name = "shipping_carrier")
    private String shippingCarrier;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<OrderItem> orderItems = new ArrayList<>();

    // Constructors
    public Order() {
        this.orderNumber = generateOrderNumber();
        this.status = OrderStatus.PENDING;
    }

    public Order(String customerName, String customerEmail, String shippingAddress, User createdBy) {
        this();
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.shippingAddress = shippingAddress;
        this.createdBy = createdBy;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getShippingAddress() {
        return shippingAddress;
    }

    public void setShippingAddress(String shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public String getBillingAddress() {
        return billingAddress;
    }

    public void setBillingAddress(String billingAddress) {
        this.billingAddress = billingAddress;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }

    public BigDecimal getShippingCost() {
        return shippingCost;
    }

    public void setShippingCost(BigDecimal shippingCost) {
        this.shippingCost = shippingCost;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public String getShippingCarrier() {
        return shippingCarrier;
    }

    public void setShippingCarrier(String shippingCarrier) {
        this.shippingCarrier = shippingCarrier;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public List<OrderItem> getOrderItems() {
        return orderItems;
    }

    public void setOrderItems(List<OrderItem> orderItems) {
        this.orderItems = orderItems;
        if (orderItems != null) {
            orderItems.forEach(item -> item.setOrder(this));
        }
    }

    // Business methods

    /**
     * Generate unique order number
     */
    public static String generateOrderNumber() {
        String timestamp = String.valueOf(System.currentTimeMillis());
        String uuid = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return "ORD-" + timestamp.substring(timestamp.length() - 8) + "-" + uuid;
    }

    /**
     * Add order item to the order
     */
    public void addOrderItem(OrderItem orderItem) {
        if (orderItem == null) {
            throw new IllegalArgumentException("Order item cannot be null");
        }
        
        if (!canBeModified()) {
            throw new IllegalStateException("Order cannot be modified in current status: " + status);
        }
        
        orderItem.setOrder(this);
        this.orderItems.add(orderItem);
        recalculateTotals();
    }

    /**
     * Remove order item from the order
     */
    public void removeOrderItem(OrderItem orderItem) {
        if (orderItem == null) {
            return;
        }
        
        if (!canBeModified()) {
            throw new IllegalStateException("Order cannot be modified in current status: " + status);
        }
        
        this.orderItems.remove(orderItem);
        orderItem.setOrder(null);
        recalculateTotals();
    }

    /**
     * Calculate and update order totals
     */
    public void recalculateTotals() {
        this.subtotal = orderItems.stream()
            .map(OrderItem::getTotalPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        this.totalAmount = subtotal.add(taxAmount).add(shippingCost);
    }

    /**
     * Update order status with validation
     */
    public void updateStatus(OrderStatus newStatus) {
        if (newStatus == null) {
            throw new IllegalArgumentException("New status cannot be null");
        }
        
        if (!isValidStatusTransition(this.status, newStatus)) {
            throw new InvalidOrderStatusTransitionException(this.status, newStatus);
        }
        
        this.status = newStatus;
    }

    /**
     * Check if status transition is valid
     */
    public static boolean isValidStatusTransition(OrderStatus currentStatus, OrderStatus newStatus) {
        if (currentStatus == null || newStatus == null) {
            return false;
        }
        return currentStatus.canTransitionTo(newStatus);
    }

    /**
     * Check if order can be cancelled
     */
    public boolean canBeCancelled() {
        return status != null && status.canBeCancelled();
    }

    /**
     * Check if order can be modified
     */
    public boolean canBeModified() {
        return status != null && status.canBeModified();
    }

    /**
     * Check if order is in final state
     */
    public boolean isFinalState() {
        return status != null && status.isFinalState();
    }

    /**
     * Check if order is active
     */
    public boolean isActive() {
        return status != null && status.isActive();
    }

    /**
     * Cancel the order
     */
    public void cancel() {
        if (!canBeCancelled()) {
            throw new IllegalStateException("Order cannot be cancelled in current status: " + status);
        }
        this.status = OrderStatus.CANCELLED;
    }

    /**
     * Confirm the order
     */
    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new IllegalStateException("Only pending orders can be confirmed");
        }
        this.status = OrderStatus.CONFIRMED;
    }

    /**
     * Mark order as processing
     */
    public void startProcessing() {
        if (this.status != OrderStatus.CONFIRMED) {
            throw new IllegalStateException("Only confirmed orders can be processed");
        }
        this.status = OrderStatus.PROCESSING;
    }

    /**
     * Mark order as shipped
     */
    public void ship() {
        if (this.status != OrderStatus.PROCESSING) {
            throw new IllegalStateException("Only processing orders can be shipped");
        }
        this.status = OrderStatus.SHIPPED;
    }

    /**
     * Mark order as delivered
     */
    public void deliver() {
        if (this.status != OrderStatus.SHIPPED) {
            throw new IllegalStateException("Only shipped orders can be delivered");
        }
        this.status = OrderStatus.DELIVERED;
    }

    /**
     * Get total quantity of items in order
     */
    public Integer getTotalQuantity() {
        return orderItems.stream()
            .mapToInt(OrderItem::getQuantity)
            .sum();
    }

    /**
     * Get number of unique items in order
     */
    public Integer getItemCount() {
        return orderItems.size();
    }

    /**
     * Calculate tax amount based on subtotal and tax rate
     */
    public void calculateTax(BigDecimal taxRate) {
        if (taxRate == null || taxRate.compareTo(BigDecimal.ZERO) < 0) {
            this.taxAmount = BigDecimal.ZERO;
        } else {
            this.taxAmount = subtotal.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        }
        recalculateTotals();
    }

    /**
     * Set shipping cost and recalculate totals
     */
    public void setShippingCostAndRecalculate(BigDecimal shippingCost) {
        this.shippingCost = shippingCost != null ? shippingCost : BigDecimal.ZERO;
        recalculateTotals();
    }

    /**
     * Check if order has items
     */
    public boolean hasItems() {
        return orderItems != null && !orderItems.isEmpty();
    }

    /**
     * Get order item by product
     */
    public OrderItem getOrderItemByProduct(Product product) {
        if (product == null) {
            return null;
        }
        return orderItems.stream()
            .filter(item -> Objects.equals(item.getProduct(), product))
            .findFirst()
            .orElse(null);
    }

    /**
     * Check if order contains product
     */
    public boolean containsProduct(Product product) {
        return getOrderItemByProduct(product) != null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Order order = (Order) o;
        return Objects.equals(id, order.id) && Objects.equals(orderNumber, order.orderNumber);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, orderNumber);
    }

    @Override
    public String toString() {
        return "Order{" +
                "id=" + id +
                ", orderNumber='" + orderNumber + '\'' +
                ", customerName='" + customerName + '\'' +
                ", customerEmail='" + customerEmail + '\'' +
                ", status=" + status +
                ", subtotal=" + subtotal +
                ", taxAmount=" + taxAmount +
                ", shippingCost=" + shippingCost +
                ", totalAmount=" + totalAmount +
                ", itemCount=" + getItemCount() +
                ", totalQuantity=" + getTotalQuantity() +
                '}';
    }
}