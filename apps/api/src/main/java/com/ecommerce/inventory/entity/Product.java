package com.ecommerce.inventory.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Product entity representing items in the inventory system
 */
@Entity
@Table(name = "products", indexes = {
    @Index(name = "idx_products_name", columnList = "name"),
    @Index(name = "idx_products_sku", columnList = "sku"),
    @Index(name = "idx_products_slug", columnList = "slug"),
    @Index(name = "idx_products_category_id", columnList = "category_id"),
    @Index(name = "idx_products_supplier_id", columnList = "supplier_id"),
    @Index(name = "idx_products_active", columnList = "active"),
    @Index(name = "idx_products_reorder_level", columnList = "reorder_level"),
    @Index(name = "idx_products_category_active", columnList = "category_id, active"),
    @Index(name = "idx_products_supplier_active", columnList = "supplier_id, active")
})
public class Product extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Product name is required")
    @Size(max = 200, message = "Product name must not exceed 200 characters")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Product slug is required")
    @Size(max = 200, message = "Product slug must not exceed 200 characters")
    @Column(unique = true, nullable = false)
    private String slug;

    @NotBlank(message = "SKU is required")
    @Size(max = 100, message = "SKU must not exceed 100 characters")
    @Column(unique = true, nullable = false)
    private String sku;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Category is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @NotNull(message = "Supplier is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @NotNull(message = "Cost price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Cost price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Cost price must have at most 8 integer digits and 2 decimal places")
    @Column(name = "cost_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal costPrice;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Selling price must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Selling price must have at most 8 integer digits and 2 decimal places")
    @Column(name = "selling_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal sellingPrice;

    @Min(value = 0, message = "Reorder level must be non-negative")
    @Column(name = "reorder_level")
    private Integer reorderLevel = 10;

    @Min(value = 1, message = "Reorder quantity must be at least 1")
    @Column(name = "reorder_quantity")
    private Integer reorderQuantity = 50;

    @Column(nullable = false)
    private Boolean active = true;

    // Relationships
    @OneToOne(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Inventory inventory;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<StockMovement> stockMovements = new ArrayList<>();

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private List<OrderItem> orderItems = new ArrayList<>();

    // Constructors
    public Product() {}

    public Product(String name, String sku, Category category, Supplier supplier, 
                   BigDecimal costPrice, BigDecimal sellingPrice) {
        this.name = name;
        this.sku = sku;
        this.slug = generateSlugFromName(name);
        this.category = category;
        this.supplier = supplier;
        this.costPrice = costPrice;
        this.sellingPrice = sellingPrice;
        this.active = true;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
        if (name != null && (slug == null || slug.isEmpty())) {
            this.slug = generateSlugFromName(name);
        }
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public Supplier getSupplier() {
        return supplier;
    }

    public void setSupplier(Supplier supplier) {
        this.supplier = supplier;
    }

    public BigDecimal getCostPrice() {
        return costPrice;
    }

    public void setCostPrice(BigDecimal costPrice) {
        this.costPrice = costPrice;
    }

    public BigDecimal getSellingPrice() {
        return sellingPrice;
    }

    public void setSellingPrice(BigDecimal sellingPrice) {
        this.sellingPrice = sellingPrice;
    }

    public Integer getReorderLevel() {
        return reorderLevel;
    }

    public void setReorderLevel(Integer reorderLevel) {
        this.reorderLevel = reorderLevel;
    }

    public Integer getReorderQuantity() {
        return reorderQuantity;
    }

    public void setReorderQuantity(Integer reorderQuantity) {
        this.reorderQuantity = reorderQuantity;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Inventory getInventory() {
        return inventory;
    }

    public void setInventory(Inventory inventory) {
        this.inventory = inventory;
    }

    public List<StockMovement> getStockMovements() {
        return stockMovements;
    }

    public void setStockMovements(List<StockMovement> stockMovements) {
        this.stockMovements = stockMovements;
    }

    public List<OrderItem> getOrderItems() {
        return orderItems;
    }

    public void setOrderItems(List<OrderItem> orderItems) {
        this.orderItems = orderItems;
    }

    // Business methods
    
    /**
     * Generate SKU automatically if not provided
     */
    public static String generateSku(Category category, String productName) {
        String categoryPrefix = category.getName().substring(0, Math.min(3, category.getName().length())).toUpperCase();
        String productPrefix = productName.replaceAll("[^A-Za-z0-9]", "").substring(0, Math.min(4, productName.length())).toUpperCase();
        String uniqueId = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return categoryPrefix + "-" + productPrefix + "-" + uniqueId;
    }

    /**
     * Generate URL-friendly slug from product name
     */
    private String generateSlugFromName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return null;
        }
        return name.toLowerCase()
                   .replaceAll("[^a-z0-9\\s-]", "")
                   .replaceAll("\\s+", "-")
                   .replaceAll("-+", "-")
                   .replaceAll("^-|-$", "");
    }

    /**
     * Check if product is low stock based on current inventory
     */
    public boolean isLowStock() {
        return inventory != null && inventory.getQuantityAvailable() <= reorderLevel;
    }

    /**
     * Calculate profit margin as percentage
     */
    public BigDecimal calculateProfitMargin() {
        if (sellingPrice == null || costPrice == null || sellingPrice.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return sellingPrice.subtract(costPrice)
                          .divide(sellingPrice, 4, RoundingMode.HALF_UP)
                          .multiply(BigDecimal.valueOf(100));
    }

    /**
     * Calculate profit amount per unit
     */
    public BigDecimal calculateProfitAmount() {
        if (sellingPrice == null || costPrice == null) {
            return BigDecimal.ZERO;
        }
        return sellingPrice.subtract(costPrice);
    }

    /**
     * Update pricing with validation
     */
    public void updatePricing(BigDecimal newCostPrice, BigDecimal newSellingPrice) {
        if (newCostPrice != null && newCostPrice.compareTo(BigDecimal.ZERO) > 0) {
            this.costPrice = newCostPrice;
        }
        if (newSellingPrice != null && newSellingPrice.compareTo(BigDecimal.ZERO) > 0) {
            this.sellingPrice = newSellingPrice;
        }
        if (this.sellingPrice.compareTo(this.costPrice) < 0) {
            throw new IllegalArgumentException("Selling price cannot be less than cost price");
        }
    }

    /**
     * Activate the product
     */
    public void activate() {
        this.active = true;
    }

    /**
     * Deactivate the product (soft delete)
     */
    public void deactivate() {
        this.active = false;
    }

    /**
     * Get current available quantity from inventory
     */
    public Integer getCurrentStock() {
        return inventory != null ? inventory.getQuantityAvailable() : 0;
    }

    /**
     * Check if product needs reordering
     */
    public boolean needsReordering() {
        return isLowStock() && active;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Product product = (Product) o;
        return Objects.equals(id, product.id) && Objects.equals(sku, product.sku);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, sku);
    }

    @Override
    public String toString() {
        return "Product{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", sku='" + sku + '\'' +
                ", slug='" + slug + '\'' +
                ", costPrice=" + costPrice +
                ", sellingPrice=" + sellingPrice +
                ", active=" + active +
                '}';
    }
}