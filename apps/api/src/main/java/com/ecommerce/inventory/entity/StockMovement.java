package com.ecommerce.inventory.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Stock Movement entity for comprehensive audit trail tracking of inventory changes
 */
@Entity
@Table(name = "stock_movements", indexes = {
    @Index(name = "idx_stock_movements_product_id", columnList = "product_id"),
    @Index(name = "idx_stock_movements_type", columnList = "movement_type"),
    @Index(name = "idx_stock_movements_reference", columnList = "reference_id, reference_type"),
    @Index(name = "idx_stock_movements_user_id", columnList = "user_id"),
    @Index(name = "idx_stock_movements_warehouse", columnList = "warehouse_location"),
    @Index(name = "idx_stock_movements_created_at", columnList = "created_at"),
    @Index(name = "idx_stock_movements_product_type", columnList = "product_id, movement_type"),
    @Index(name = "idx_stock_movements_product_date", columnList = "product_id, created_at")
})
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Product is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @NotNull(message = "Movement type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false)
    private StockMovementType movementType;

    @NotNull(message = "Quantity is required")
    @Column(nullable = false)
    private Integer quantity;

    @Size(max = 100, message = "Reference ID must not exceed 100 characters")
    @Column(name = "reference_id")
    private String referenceId;

    @Size(max = 50, message = "Reference type must not exceed 50 characters")
    @Column(name = "reference_type")
    private String referenceType;

    @Size(max = 255, message = "Reason must not exceed 255 characters")
    @Column(name = "reason")
    private String reason;

    @NotNull(message = "Warehouse location is required")
    @Size(max = 50, message = "Warehouse location must not exceed 50 characters")
    @Column(name = "warehouse_location", nullable = false)
    private String warehouseLocation = "MAIN";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Constructors
    public StockMovement() {
        this.createdAt = LocalDateTime.now();
    }

    public StockMovement(Product product, StockMovementType movementType, Integer quantity, 
                        String reason, User user) {
        this();
        this.product = product;
        this.movementType = movementType;
        this.quantity = quantity;
        this.reason = reason;
        this.user = user;
        this.warehouseLocation = "MAIN";
    }

    public StockMovement(Product product, StockMovementType movementType, Integer quantity, 
                        String referenceId, String referenceType, String reason, 
                        String warehouseLocation, User user) {
        this();
        this.product = product;
        this.movementType = movementType;
        this.quantity = quantity;
        this.referenceId = referenceId;
        this.referenceType = referenceType;
        this.reason = reason;
        this.warehouseLocation = warehouseLocation != null ? warehouseLocation : "MAIN";
        this.user = user;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
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

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getWarehouseLocation() {
        return warehouseLocation;
    }

    public void setWarehouseLocation(String warehouseLocation) {
        this.warehouseLocation = warehouseLocation;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    // Business methods

    /**
     * Set reference information for the stock movement
     */
    public void setReference(String referenceId, String referenceType) {
        this.referenceId = referenceId;
        this.referenceType = referenceType;
    }

    /**
     * Check if this movement increases inventory
     */
    public boolean increasesInventory() {
        return movementType != null && movementType.increasesInventory();
    }

    /**
     * Check if this movement decreases inventory
     */
    public boolean decreasesInventory() {
        return movementType != null && movementType.decreasesInventory();
    }

    /**
     * Get the effective quantity change (positive for increases, negative for decreases)
     */
    public Integer getEffectiveQuantityChange() {
        if (quantity == null) {
            return 0;
        }
        return increasesInventory() ? quantity : -quantity;
    }

    /**
     * Check if this movement is related to an order
     */
    public boolean isOrderRelated() {
        return "ORDER".equals(referenceType) || 
               movementType == StockMovementType.ALLOCATION || 
               movementType == StockMovementType.RELEASE;
    }

    /**
     * Check if this movement is an adjustment
     */
    public boolean isAdjustment() {
        return movementType != null && movementType.isAdjustment();
    }

    /**
     * Check if this movement affects allocated quantity
     */
    public boolean affectsAllocatedQuantity() {
        return movementType != null && movementType.affectsAllocatedQuantity();
    }

    /**
     * Create a stock movement for inventory allocation
     */
    public static StockMovement createAllocation(Product product, Integer quantity, 
                                               String orderId, User user) {
        StockMovement movement = new StockMovement(
            product, 
            StockMovementType.ALLOCATION, 
            quantity,
            orderId,
            "ORDER",
            "Stock allocated for order " + orderId,
            "MAIN",
            user
        );
        return movement;
    }

    /**
     * Create a stock movement for inventory release
     */
    public static StockMovement createRelease(Product product, Integer quantity, 
                                            String orderId, User user) {
        StockMovement movement = new StockMovement(
            product, 
            StockMovementType.RELEASE, 
            quantity,
            orderId,
            "ORDER",
            "Stock released from order " + orderId,
            "MAIN",
            user
        );
        return movement;
    }

    /**
     * Create a stock movement for inventory adjustment
     */
    public static StockMovement createAdjustment(Product product, Integer quantity, 
                                               String reason, User user) {
        StockMovement movement = new StockMovement(
            product, 
            StockMovementType.ADJUSTMENT, 
            quantity,
            reason,
            user
        );
        return movement;
    }

    /**
     * Create a stock movement for inbound stock
     */
    public static StockMovement createInbound(Product product, Integer quantity, 
                                            String reason, User user) {
        StockMovement movement = new StockMovement(
            product, 
            StockMovementType.INBOUND, 
            quantity,
            reason,
            user
        );
        return movement;
    }

    /**
     * Create a stock movement for outbound stock
     */
    public static StockMovement createOutbound(Product product, Integer quantity, 
                                             String reason, User user) {
        StockMovement movement = new StockMovement(
            product, 
            StockMovementType.OUTBOUND, 
            quantity,
            reason,
            user
        );
        return movement;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StockMovement that = (StockMovement) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "StockMovement{" +
                "id=" + id +
                ", productId=" + (product != null ? product.getId() : null) +
                ", movementType=" + movementType +
                ", quantity=" + quantity +
                ", referenceId='" + referenceId + '\'' +
                ", referenceType='" + referenceType + '\'' +
                ", reason='" + reason + '\'' +
                ", warehouseLocation='" + warehouseLocation + '\'' +
                ", userId=" + (user != null ? user.getId() : null) +
                ", createdAt=" + createdAt +
                '}';
    }
}