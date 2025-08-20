package com.ecommerce.inventory.entity;

import com.ecommerce.inventory.exception.InsufficientStockException;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Inventory entity representing stock levels and allocation for products
 */
@Entity
@Table(name = "inventory", indexes = {
    @Index(name = "idx_inventory_product_id", columnList = "product_id"),
    @Index(name = "idx_inventory_warehouse_location", columnList = "warehouse_location"),
    @Index(name = "idx_inventory_product_warehouse", columnList = "product_id, warehouse_location")
})
public class Inventory extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Product is required")
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false, unique = true)
    private Product product;

    @NotNull(message = "Warehouse location is required")
    @Size(max = 50, message = "Warehouse location must not exceed 50 characters")
    @Column(name = "warehouse_location", nullable = false)
    private String warehouseLocation = "MAIN";

    @Min(value = 0, message = "Quantity on hand must be non-negative")
    @Column(name = "quantity_on_hand", nullable = false)
    private Integer quantityOnHand = 0;

    @Min(value = 0, message = "Quantity allocated must be non-negative")
    @Column(name = "quantity_allocated", nullable = false)
    private Integer quantityAllocated = 0;

    @Column(name = "last_counted_at")
    private LocalDateTime lastCountedAt;

    @Version
    @Column(name = "version")
    private Long version = 0L;

    // Constructors
    public Inventory() {}

    public Inventory(Product product, String warehouseLocation, Integer initialQuantity) {
        this.product = product;
        this.warehouseLocation = warehouseLocation != null ? warehouseLocation : "MAIN";
        this.quantityOnHand = initialQuantity != null ? initialQuantity : 0;
        this.quantityAllocated = 0;
        this.lastCountedAt = LocalDateTime.now();
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

    public String getWarehouseLocation() {
        return warehouseLocation;
    }

    public void setWarehouseLocation(String warehouseLocation) {
        this.warehouseLocation = warehouseLocation;
    }

    public Integer getQuantityOnHand() {
        return quantityOnHand;
    }

    public void setQuantityOnHand(Integer quantityOnHand) {
        this.quantityOnHand = quantityOnHand;
    }

    public Integer getQuantityAllocated() {
        return quantityAllocated;
    }

    public void setQuantityAllocated(Integer quantityAllocated) {
        this.quantityAllocated = quantityAllocated;
    }

    public LocalDateTime getLastCountedAt() {
        return lastCountedAt;
    }

    public void setLastCountedAt(LocalDateTime lastCountedAt) {
        this.lastCountedAt = lastCountedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    // Business methods

    /**
     * Calculate available quantity (on hand minus allocated)
     */
    public Integer getQuantityAvailable() {
        return quantityOnHand - quantityAllocated;
    }

    /**
     * Check if sufficient stock is available for allocation
     */
    public boolean canAllocate(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            return false;
        }
        return getQuantityAvailable() >= quantity;
    }

    /**
     * Allocate stock for an order or reservation
     * @param quantity Amount to allocate
     * @throws InsufficientStockException if insufficient stock available
     */
    public void allocateStock(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Allocation quantity must be positive");
        }
        
        if (!canAllocate(quantity)) {
            throw new InsufficientStockException(
                product != null ? product.getId() : null, 
                quantity, 
                getQuantityAvailable()
            );
        }
        
        this.quantityAllocated += quantity;
    }

    /**
     * Release allocated stock back to available inventory
     * @param quantity Amount to release
     */
    public void releaseStock(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Release quantity must be positive");
        }
        
        this.quantityAllocated = Math.max(0, this.quantityAllocated - quantity);
    }

    /**
     * Adjust stock quantity (for receiving, damage, etc.)
     * @param newQuantity New total quantity on hand
     * @param reason Reason for adjustment
     */
    public void adjustStock(Integer newQuantity, String reason) {
        if (newQuantity == null || newQuantity < 0) {
            throw new IllegalArgumentException("New quantity must be non-negative");
        }
        
        // Ensure allocated quantity doesn't exceed new on-hand quantity
        if (newQuantity < this.quantityAllocated) {
            throw new IllegalArgumentException(
                String.format("New quantity (%d) cannot be less than allocated quantity (%d)", 
                             newQuantity, this.quantityAllocated)
            );
        }
        
        this.quantityOnHand = newQuantity;
        this.lastCountedAt = LocalDateTime.now();
    }

    /**
     * Receive stock into inventory
     * @param quantity Amount received
     */
    public void receiveStock(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Receive quantity must be positive");
        }
        
        this.quantityOnHand += quantity;
        this.lastCountedAt = LocalDateTime.now();
    }

    /**
     * Remove stock from inventory (for sales, damage, etc.)
     * @param quantity Amount to remove
     */
    public void removeStock(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Remove quantity must be positive");
        }
        
        if (quantity > this.quantityOnHand) {
            throw new InsufficientStockException(
                product != null ? product.getId() : null,
                quantity,
                this.quantityOnHand
            );
        }
        
        // Ensure we don't remove more than available (considering allocations)
        if (quantity > getQuantityAvailable()) {
            throw new InsufficientStockException(
                product != null ? product.getId() : null,
                quantity,
                getQuantityAvailable()
            );
        }
        
        this.quantityOnHand -= quantity;
        this.lastCountedAt = LocalDateTime.now();
    }

    /**
     * Check if inventory is low stock based on product reorder level
     */
    public boolean isLowStock() {
        if (product == null || product.getReorderLevel() == null) {
            return false;
        }
        return getQuantityAvailable() <= product.getReorderLevel();
    }

    /**
     * Check if inventory needs reordering
     */
    public boolean needsReordering() {
        return isLowStock() && product != null && product.getActive();
    }

    /**
     * Get stock utilization percentage (allocated / on hand)
     */
    public double getStockUtilization() {
        if (quantityOnHand == 0) {
            return 0.0;
        }
        return (double) quantityAllocated / quantityOnHand * 100.0;
    }

    /**
     * Check if inventory has been counted recently (within days)
     */
    public boolean isRecentlyCounted(int days) {
        if (lastCountedAt == null) {
            return false;
        }
        return lastCountedAt.isAfter(LocalDateTime.now().minusDays(days));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Inventory inventory = (Inventory) o;
        return Objects.equals(id, inventory.id) && 
               Objects.equals(product, inventory.product) && 
               Objects.equals(warehouseLocation, inventory.warehouseLocation);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, product, warehouseLocation);
    }

    @Override
    public String toString() {
        return "Inventory{" +
                "id=" + id +
                ", productId=" + (product != null ? product.getId() : null) +
                ", warehouseLocation='" + warehouseLocation + '\'' +
                ", quantityOnHand=" + quantityOnHand +
                ", quantityAllocated=" + quantityAllocated +
                ", quantityAvailable=" + getQuantityAvailable() +
                ", lastCountedAt=" + lastCountedAt +
                ", version=" + version +
                '}';
    }
}