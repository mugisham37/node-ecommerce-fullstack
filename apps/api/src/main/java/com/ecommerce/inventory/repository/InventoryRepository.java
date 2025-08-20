package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.Inventory;
import com.ecommerce.inventory.schema.InventorySchema;
import com.ecommerce.inventory.schema.ProductSchema;
import com.ecommerce.inventory.schema.OrderSchema;
import com.ecommerce.inventory.schema.OrderItemSchema;
import com.ecommerce.inventory.schema.StockMovementSchema;
import org.jooq.*;
import org.jooq.impl.DSL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Repository for Inventory entity with stock level tracking and allocation methods
 * Implements advanced inventory management operations using JOOQ
 */
@Repository
@Transactional
public class InventoryRepository extends AbstractBaseRepository<Inventory, Long> {
    
    private static final Logger logger = LoggerFactory.getLogger(InventoryRepository.class);
    
    @Override
    protected Inventory recordToEntity(Record record) {
        if (record == null) return null;
        
        Inventory inventory = new Inventory();
        inventory.setId(record.get(InventorySchema.ID));
        inventory.setWarehouseLocation(record.get(InventorySchema.WAREHOUSE_LOCATION));
        inventory.setQuantityOnHand(record.get(InventorySchema.QUANTITY_ON_HAND));
        inventory.setQuantityAllocated(record.get(InventorySchema.QUANTITY_ALLOCATED));
        inventory.setLastCountedAt(record.get(InventorySchema.LAST_COUNTED_AT));
        inventory.setVersion(record.get(InventorySchema.VERSION));
        
        // Set audit fields
        inventory.setCreatedAt(record.get(InventorySchema.CREATED_AT));
        inventory.setUpdatedAt(record.get(InventorySchema.UPDATED_AT));
        
        return inventory;
    }
    
    @Override
    protected Record entityToRecord(Inventory entity) {
        return dsl.newRecord(InventorySchema.INVENTORY)
            .set(InventorySchema.ID, entity.getId())
            .set(InventorySchema.PRODUCT_ID, entity.getProduct() != null ? entity.getProduct().getId() : null)
            .set(InventorySchema.WAREHOUSE_LOCATION, entity.getWarehouseLocation())
            .set(InventorySchema.QUANTITY_ON_HAND, entity.getQuantityOnHand())
            .set(InventorySchema.QUANTITY_ALLOCATED, entity.getQuantityAllocated())
            .set(InventorySchema.LAST_COUNTED_AT, entity.getLastCountedAt())
            .set(InventorySchema.VERSION, entity.getVersion())
            .set(InventorySchema.UPDATED_AT, LocalDateTime.now());
    }
    
    @Override
    protected Class<Inventory> getEntityClass() {
        return Inventory.class;
    }
    
    @Override
    public Table<Record> getTable() {
        return InventorySchema.INVENTORY;
    }
    
    @Override
    public TableField<Record, Long> getIdField() {
        return InventorySchema.ID;
    }
    
    @Override
    protected Long getEntityId(Inventory entity) {
        return entity.getId();
    }
    
    // ========== STOCK LEVEL TRACKING ==========
    
    /**
     * Find inventory by product ID
     */
    @Transactional(readOnly = true)
    public Optional<Inventory> findByProductId(Long productId) {
        logger.debug("Finding inventory by product ID: {}", productId);
        
        try {
            Record record = dsl.select()
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.PRODUCT_ID.eq(productId))
                .fetchOne();
            
            if (record != null) {
                Inventory inventory = recordToEntity(record);
                logger.debug("Found inventory for product ID: {}", productId);
                return Optional.of(inventory);
            } else {
                logger.debug("Inventory not found for product ID: {}", productId);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding inventory by product ID: {}", productId, e);
            throw new RuntimeException("Failed to find inventory by product ID", e);
        }
    }
    
    /**
     * Find inventory by product ID and warehouse location
     */
    @Transactional(readOnly = true)
    public Optional<Inventory> findByProductIdAndWarehouseLocation(Long productId, String warehouseLocation) {
        logger.debug("Finding inventory by product ID {} and warehouse: {}", productId, warehouseLocation);
        
        try {
            Record record = dsl.select()
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.PRODUCT_ID.eq(productId)
                    .and(InventorySchema.WAREHOUSE_LOCATION.eq(warehouseLocation)))
                .fetchOne();
            
            if (record != null) {
                Inventory inventory = recordToEntity(record);
                logger.debug("Found inventory for product ID {} in warehouse {}", productId, warehouseLocation);
                return Optional.of(inventory);
            } else {
                logger.debug("Inventory not found for product ID {} in warehouse {}", productId, warehouseLocation);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding inventory by product ID and warehouse", e);
            throw new RuntimeException("Failed to find inventory by product ID and warehouse", e);
        }
    }
    
    /**
     * Find all inventory records for a product across all warehouses
     */
    @Transactional(readOnly = true)
    public List<Inventory> findAllByProductId(Long productId) {
        logger.debug("Finding all inventory records for product ID: {}", productId);
        
        try {
            Result<Record> records = dsl.select()
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.PRODUCT_ID.eq(productId))
                .orderBy(InventorySchema.WAREHOUSE_LOCATION.asc())
                .fetch();
            
            List<Inventory> inventories = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} inventory records for product ID: {}", inventories.size(), productId);
            return inventories;
        } catch (Exception e) {
            logger.error("Error finding all inventory for product ID: {}", productId, e);
            throw new RuntimeException("Failed to find all inventory for product ID", e);
        }
    }

    /**
     * Find inventory records for a product ordered by available quantity descending
     */
    @Transactional(readOnly = true)
    public List<Inventory> findByProductIdOrderByQuantityAvailableDesc(Long productId) {
        logger.debug("Finding inventory records for product ID: {} ordered by available quantity", productId);
        
        try {
            Result<Record> records = dsl.select()
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.PRODUCT_ID.eq(productId))
                .orderBy(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED).desc())
                .fetch();
            
            List<Inventory> inventories = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} inventory records for product ID: {} ordered by available quantity", inventories.size(), productId);
            return inventories;
        } catch (Exception e) {
            logger.error("Error finding inventory ordered by available quantity for product ID: {}", productId, e);
            throw new RuntimeException("Failed to find inventory ordered by available quantity", e);
        }
    }
    
    /**
     * Find inventory records with low stock levels
     */
    @Transactional(readOnly = true)
    public List<InventoryWithProduct> findLowStockInventory() {
        logger.debug("Finding inventory records with low stock levels");
        
        try {
            Result<Record> records = dsl.select(
                    InventorySchema.ID,
                    InventorySchema.PRODUCT_ID,
                    InventorySchema.WAREHOUSE_LOCATION,
                    InventorySchema.QUANTITY_ON_HAND,
                    InventorySchema.QUANTITY_ALLOCATED,
                    InventorySchema.LAST_COUNTED_AT,
                    InventorySchema.VERSION,
                    InventorySchema.CREATED_AT,
                    InventorySchema.UPDATED_AT,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    ProductSchema.REORDER_LEVEL.as("reorder_level")
                )
                .from(InventorySchema.INVENTORY)
                .join(ProductSchema.PRODUCTS).on(InventorySchema.PRODUCT_ID.eq(ProductSchema.ID))
                .where(ProductSchema.ACTIVE.eq(true)
                    .and(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED)
                        .le(ProductSchema.REORDER_LEVEL)))
                .orderBy(
                    InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED).asc(),
                    ProductSchema.NAME.asc()
                )
                .fetch();
            
            List<InventoryWithProduct> inventories = records.stream()
                .map(record -> {
                    Inventory inventory = recordToEntity(record);
                    String productName = record.get("product_name", String.class);
                    String productSku = record.get("product_sku", String.class);
                    Integer reorderLevel = record.get("reorder_level", Integer.class);
                    return new InventoryWithProduct(inventory, productName, productSku, reorderLevel);
                })
                .collect(Collectors.toList());
            
            logger.debug("Found {} inventory records with low stock", inventories.size());
            return inventories;
        } catch (Exception e) {
            logger.error("Error finding low stock inventory", e);
            throw new RuntimeException("Failed to find low stock inventory", e);
        }
    }
    
    /**
     * Find inventory records by warehouse location
     */
    @Transactional(readOnly = true)
    public List<Inventory> findByWarehouseLocation(String warehouseLocation) {
        logger.debug("Finding inventory by warehouse location: {}", warehouseLocation);
        
        try {
            Result<Record> records = dsl.select()
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.WAREHOUSE_LOCATION.eq(warehouseLocation))
                .orderBy(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED).asc())
                .fetch();
            
            List<Inventory> inventories = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} inventory records in warehouse: {}", inventories.size(), warehouseLocation);
            return inventories;
        } catch (Exception e) {
            logger.error("Error finding inventory by warehouse location", e);
            throw new RuntimeException("Failed to find inventory by warehouse location", e);
        }
    }
    
    /**
     * Get inventory summary by warehouse
     */
    @Transactional(readOnly = true)
    public List<WarehouseInventorySummary> getWarehouseInventorySummary() {
        logger.debug("Getting inventory summary by warehouse");
        
        try {
            Result<Record> records = dsl.select(
                    InventorySchema.WAREHOUSE_LOCATION,
                    DSL.count().as("total_products"),
                    DSL.sum(InventorySchema.QUANTITY_ON_HAND).as("total_on_hand"),
                    DSL.sum(InventorySchema.QUANTITY_ALLOCATED).as("total_allocated"),
                    DSL.sum(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED)).as("total_available"),
                    DSL.countDistinct(DSL.case_()
                        .when(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED)
                            .le(ProductSchema.REORDER_LEVEL), InventorySchema.PRODUCT_ID)
                        .else_(DSL.inline((Long) null))).as("low_stock_products")
                )
                .from(InventorySchema.INVENTORY)
                .join(ProductSchema.PRODUCTS).on(InventorySchema.PRODUCT_ID.eq(ProductSchema.ID))
                .where(ProductSchema.ACTIVE.eq(true))
                .groupBy(InventorySchema.WAREHOUSE_LOCATION)
                .orderBy(InventorySchema.WAREHOUSE_LOCATION.asc())
                .fetch();
            
            List<WarehouseInventorySummary> summaries = records.stream()
                .map(record -> {
                    WarehouseInventorySummary summary = new WarehouseInventorySummary();
                    summary.setWarehouseLocation(record.get(InventorySchema.WAREHOUSE_LOCATION));
                    summary.setTotalProducts(record.get("total_products", Integer.class));
                    summary.setTotalOnHand(record.get("total_on_hand", Integer.class));
                    summary.setTotalAllocated(record.get("total_allocated", Integer.class));
                    summary.setTotalAvailable(record.get("total_available", Integer.class));
                    summary.setLowStockProducts(record.get("low_stock_products", Integer.class));
                    return summary;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated inventory summary for {} warehouses", summaries.size());
            return summaries;
        } catch (Exception e) {
            logger.error("Error getting warehouse inventory summary", e);
            throw new RuntimeException("Failed to get warehouse inventory summary", e);
        }
    }
    
    // ========== STOCK ALLOCATION METHODS ==========
    
    /**
     * Allocate stock for a product with optimistic locking
     */
    @Transactional
    public boolean allocateStock(Long productId, Integer quantity, String warehouseLocation) {
        logger.debug("Allocating {} units of product {} in warehouse {}", quantity, productId, warehouseLocation);
        
        try {
            // Find current inventory with version for optimistic locking
            Record currentRecord = dsl.select(
                    InventorySchema.ID,
                    InventorySchema.QUANTITY_ON_HAND,
                    InventorySchema.QUANTITY_ALLOCATED,
                    InventorySchema.VERSION
                )
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.PRODUCT_ID.eq(productId)
                    .and(InventorySchema.WAREHOUSE_LOCATION.eq(warehouseLocation)))
                .fetchOne();
            
            if (currentRecord == null) {
                logger.warn("Inventory not found for product {} in warehouse {}", productId, warehouseLocation);
                return false;
            }
            
            Long inventoryId = currentRecord.get(InventorySchema.ID);
            Integer currentOnHand = currentRecord.get(InventorySchema.QUANTITY_ON_HAND);
            Integer currentAllocated = currentRecord.get(InventorySchema.QUANTITY_ALLOCATED);
            Long currentVersion = currentRecord.get(InventorySchema.VERSION);
            
            Integer availableQuantity = currentOnHand - currentAllocated;
            
            if (availableQuantity < quantity) {
                logger.warn("Insufficient stock for allocation. Available: {}, Requested: {}", availableQuantity, quantity);
                return false;
            }
            
            // Update with optimistic locking
            int updatedRows = dsl.update(InventorySchema.INVENTORY)
                .set(InventorySchema.QUANTITY_ALLOCATED, currentAllocated + quantity)
                .set(InventorySchema.VERSION, currentVersion + 1)
                .set(InventorySchema.UPDATED_AT, LocalDateTime.now())
                .where(InventorySchema.ID.eq(inventoryId)
                    .and(InventorySchema.VERSION.eq(currentVersion)))
                .execute();
            
            if (updatedRows == 0) {
                logger.warn("Optimistic locking failed for inventory allocation. Concurrent modification detected.");
                return false;
            }
            
            logger.debug("Successfully allocated {} units for product {} in warehouse {}", quantity, productId, warehouseLocation);
            return true;
        } catch (Exception e) {
            logger.error("Error allocating stock", e);
            throw new RuntimeException("Failed to allocate stock", e);
        }
    }
    
    /**
     * Release allocated stock for a product
     */
    @Transactional
    public boolean releaseStock(Long productId, Integer quantity, String warehouseLocation) {
        logger.debug("Releasing {} units of product {} in warehouse {}", quantity, productId, warehouseLocation);
        
        try {
            // Find current inventory
            Record currentRecord = dsl.select(
                    InventorySchema.ID,
                    InventorySchema.QUANTITY_ALLOCATED,
                    InventorySchema.VERSION
                )
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.PRODUCT_ID.eq(productId)
                    .and(InventorySchema.WAREHOUSE_LOCATION.eq(warehouseLocation)))
                .fetchOne();
            
            if (currentRecord == null) {
                logger.warn("Inventory not found for product {} in warehouse {}", productId, warehouseLocation);
                return false;
            }
            
            Long inventoryId = currentRecord.get(InventorySchema.ID);
            Integer currentAllocated = currentRecord.get(InventorySchema.QUANTITY_ALLOCATED);
            Long currentVersion = currentRecord.get(InventorySchema.VERSION);
            
            Integer newAllocated = Math.max(0, currentAllocated - quantity);
            
            // Update with optimistic locking
            int updatedRows = dsl.update(InventorySchema.INVENTORY)
                .set(InventorySchema.QUANTITY_ALLOCATED, newAllocated)
                .set(InventorySchema.VERSION, currentVersion + 1)
                .set(InventorySchema.UPDATED_AT, LocalDateTime.now())
                .where(InventorySchema.ID.eq(inventoryId)
                    .and(InventorySchema.VERSION.eq(currentVersion)))
                .execute();
            
            if (updatedRows == 0) {
                logger.warn("Optimistic locking failed for inventory release. Concurrent modification detected.");
                return false;
            }
            
            logger.debug("Successfully released {} units for product {} in warehouse {}", quantity, productId, warehouseLocation);
            return true;
        } catch (Exception e) {
            logger.error("Error releasing stock", e);
            throw new RuntimeException("Failed to release stock", e);
        }
    }
    
    /**
     * Adjust stock quantity for a product
     */
    @Transactional
    public boolean adjustStock(Long productId, Integer newQuantity, String warehouseLocation) {
        logger.debug("Adjusting stock for product {} to {} in warehouse {}", productId, newQuantity, warehouseLocation);
        
        try {
            // Find current inventory
            Record currentRecord = dsl.select(
                    InventorySchema.ID,
                    InventorySchema.QUANTITY_ALLOCATED,
                    InventorySchema.VERSION
                )
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.PRODUCT_ID.eq(productId)
                    .and(InventorySchema.WAREHOUSE_LOCATION.eq(warehouseLocation)))
                .fetchOne();
            
            if (currentRecord == null) {
                logger.warn("Inventory not found for product {} in warehouse {}", productId, warehouseLocation);
                return false;
            }
            
            Long inventoryId = currentRecord.get(InventorySchema.ID);
            Integer currentAllocated = currentRecord.get(InventorySchema.QUANTITY_ALLOCATED);
            Long currentVersion = currentRecord.get(InventorySchema.VERSION);
            
            // Ensure new quantity is not less than allocated quantity
            if (newQuantity < currentAllocated) {
                logger.warn("Cannot adjust stock to {} as {} units are already allocated", newQuantity, currentAllocated);
                return false;
            }
            
            // Update with optimistic locking
            int updatedRows = dsl.update(InventorySchema.INVENTORY)
                .set(InventorySchema.QUANTITY_ON_HAND, newQuantity)
                .set(InventorySchema.LAST_COUNTED_AT, LocalDateTime.now())
                .set(InventorySchema.VERSION, currentVersion + 1)
                .set(InventorySchema.UPDATED_AT, LocalDateTime.now())
                .where(InventorySchema.ID.eq(inventoryId)
                    .and(InventorySchema.VERSION.eq(currentVersion)))
                .execute();
            
            if (updatedRows == 0) {
                logger.warn("Optimistic locking failed for stock adjustment. Concurrent modification detected.");
                return false;
            }
            
            logger.debug("Successfully adjusted stock for product {} to {} in warehouse {}", productId, newQuantity, warehouseLocation);
            return true;
        } catch (Exception e) {
            logger.error("Error adjusting stock", e);
            throw new RuntimeException("Failed to adjust stock", e);
        }
    }
    
    /**
     * Get available quantity for a product
     */
    @Transactional(readOnly = true)
    public Integer getAvailableQuantity(Long productId, String warehouseLocation) {
        logger.debug("Getting available quantity for product {} in warehouse {}", productId, warehouseLocation);
        
        try {
            Record record = dsl.select(
                    InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED).as("available_quantity")
                )
                .from(InventorySchema.INVENTORY)
                .where(InventorySchema.PRODUCT_ID.eq(productId)
                    .and(InventorySchema.WAREHOUSE_LOCATION.eq(warehouseLocation)))
                .fetchOne();
            
            if (record != null) {
                Integer availableQuantity = record.get("available_quantity", Integer.class);
                logger.debug("Available quantity for product {} in warehouse {}: {}", productId, warehouseLocation, availableQuantity);
                return availableQuantity != null ? availableQuantity : 0;
            } else {
                logger.debug("Inventory not found for product {} in warehouse {}", productId, warehouseLocation);
                return 0;
            }
        } catch (Exception e) {
            logger.error("Error getting available quantity", e);
            throw new RuntimeException("Failed to get available quantity", e);
        }
    }
    
    /**
     * Check if sufficient stock is available for allocation
     */
    @Transactional(readOnly = true)
    public boolean canAllocateStock(Long productId, Integer quantity, String warehouseLocation) {
        Integer availableQuantity = getAvailableQuantity(productId, warehouseLocation);
        return availableQuantity >= quantity;
    }
    
    // ========== COMPLEX JOINS FOR ORDER FULFILLMENT AND INVENTORY ANALYSIS ==========
    
    /**
     * Get inventory status for order fulfillment analysis
     */
    @Transactional(readOnly = true)
    public List<InventoryFulfillmentStatus> getInventoryFulfillmentStatus(List<Long> productIds) {
        logger.debug("Getting inventory fulfillment status for {} products", productIds != null ? productIds.size() : 0);
        
        try {
            Condition productCondition = productIds != null && !productIds.isEmpty() ?
                InventorySchema.PRODUCT_ID.in(productIds) :
                DSL.trueCondition();
            
            Result<Record> records = dsl.select(
                    InventorySchema.ID,
                    InventorySchema.PRODUCT_ID,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    ProductSchema.REORDER_LEVEL,
                    ProductSchema.REORDER_QUANTITY,
                    ProductSchema.COST_PRICE,
                    ProductSchema.SELLING_PRICE,
                    InventorySchema.WAREHOUSE_LOCATION,
                    InventorySchema.QUANTITY_ON_HAND,
                    InventorySchema.QUANTITY_ALLOCATED,
                    InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED).as("available_quantity"),
                    InventorySchema.LAST_COUNTED_AT,
                    DSL.case_()
                        .when(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED)
                            .le(ProductSchema.REORDER_LEVEL), "LOW_STOCK")
                        .when(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED)
                            .eq(0), "OUT_OF_STOCK")
                        .else_("AVAILABLE").as("stock_status"),
                    DSL.case_()
                        .when(InventorySchema.QUANTITY_ALLOCATED.gt(0), 
                              InventorySchema.QUANTITY_ALLOCATED.cast(Double.class)
                                  .div(InventorySchema.QUANTITY_ON_HAND.cast(Double.class)).mul(100))
                        .else_(0.0).as("allocation_percentage")
                )
                .from(InventorySchema.INVENTORY)
                .join(ProductSchema.PRODUCTS).on(InventorySchema.PRODUCT_ID.eq(ProductSchema.ID))
                .where(productCondition.and(ProductSchema.ACTIVE.eq(true)))
                .orderBy(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED).asc(),
                        ProductSchema.NAME.asc())
                .fetch();
            
            List<InventoryFulfillmentStatus> statuses = records.stream()
                .map(record -> {
                    InventoryFulfillmentStatus status = new InventoryFulfillmentStatus();
                    status.setInventoryId(record.get(InventorySchema.ID));
                    status.setProductId(record.get(InventorySchema.PRODUCT_ID));
                    status.setProductName(record.get("product_name", String.class));
                    status.setProductSku(record.get("product_sku", String.class));
                    status.setReorderLevel(record.get(ProductSchema.REORDER_LEVEL));
                    status.setReorderQuantity(record.get(ProductSchema.REORDER_QUANTITY));
                    status.setCostPrice(record.get(ProductSchema.COST_PRICE));
                    status.setSellingPrice(record.get(ProductSchema.SELLING_PRICE));
                    status.setWarehouseLocation(record.get(InventorySchema.WAREHOUSE_LOCATION));
                    status.setQuantityOnHand(record.get(InventorySchema.QUANTITY_ON_HAND));
                    status.setQuantityAllocated(record.get(InventorySchema.QUANTITY_ALLOCATED));
                    status.setAvailableQuantity(record.get("available_quantity", Integer.class));
                    status.setLastCountedAt(record.get(InventorySchema.LAST_COUNTED_AT));
                    status.setStockStatus(record.get("stock_status", String.class));
                    status.setAllocationPercentage(record.get("allocation_percentage", Double.class));
                    return status;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated inventory fulfillment status for {} products", statuses.size());
            return statuses;
        } catch (Exception e) {
            logger.error("Error getting inventory fulfillment status", e);
            throw new RuntimeException("Failed to get inventory fulfillment status", e);
        }
    }
    
    /**
     * Count low stock items for metrics
     */
    @Transactional(readOnly = true)
    public int countLowStockItems() {
        logger.debug("Counting low stock items");
        
        try {
            Integer count = dsl.selectCount()
                .from(InventorySchema.INVENTORY)
                .join(ProductSchema.PRODUCTS).on(InventorySchema.PRODUCT_ID.eq(ProductSchema.ID))
                .where(ProductSchema.ACTIVE.eq(true)
                    .and(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED)
                        .le(ProductSchema.REORDER_LEVEL)))
                .fetchOne(0, Integer.class);
            
            logger.debug("Found {} low stock items", count);
            return count != null ? count : 0;
        } catch (Exception e) {
            logger.error("Error counting low stock items", e);
            throw new RuntimeException("Failed to count low stock items", e);
        }
    }

    /**
     * Calculate total inventory value for metrics
     */
    @Transactional(readOnly = true)
    public java.math.BigDecimal calculateTotalInventoryValue() {
        logger.debug("Calculating total inventory value");
        
        try {
            java.math.BigDecimal totalValue = dsl.select(
                    DSL.sum(InventorySchema.QUANTITY_ON_HAND.cast(java.math.BigDecimal.class)
                        .mul(ProductSchema.COST_PRICE)).as("total_value")
                )
                .from(InventorySchema.INVENTORY)
                .join(ProductSchema.PRODUCTS).on(InventorySchema.PRODUCT_ID.eq(ProductSchema.ID))
                .where(ProductSchema.ACTIVE.eq(true))
                .fetchOne("total_value", java.math.BigDecimal.class);
            
            logger.debug("Total inventory value: {}", totalValue);
            return totalValue != null ? totalValue : java.math.BigDecimal.ZERO;
        } catch (Exception e) {
            logger.error("Error calculating total inventory value", e);
            throw new RuntimeException("Failed to calculate total inventory value", e);
        }
    }

    /**
     * Get inventory allocation analysis with order details
     */
    @Transactional(readOnly = true)
    public List<InventoryAllocationAnalysis> getInventoryAllocationAnalysis(String warehouseLocation) {
        logger.debug("Getting inventory allocation analysis for warehouse: {}", warehouseLocation);
        
        try {
            Condition warehouseCondition = warehouseLocation != null ?
                InventorySchema.WAREHOUSE_LOCATION.eq(warehouseLocation) :
                DSL.trueCondition();
            
            Result<Record> records = dsl.select(
                    InventorySchema.PRODUCT_ID,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    InventorySchema.WAREHOUSE_LOCATION,
                    InventorySchema.QUANTITY_ON_HAND,
                    InventorySchema.QUANTITY_ALLOCATED,
                    InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED).as("available_quantity"),
                    DSL.count(OrderItemSchema.ID).as("pending_order_items"),
                    DSL.sum(OrderItemSchema.QUANTITY).as("total_pending_quantity"),
                    DSL.countDistinct(OrderSchema.ID).as("pending_orders"),
                    DSL.min(OrderSchema.CREATED_AT).as("oldest_pending_order"),
                    DSL.max(OrderSchema.CREATED_AT).as("newest_pending_order")
                )
                .from(InventorySchema.INVENTORY)
                .join(ProductSchema.PRODUCTS).on(InventorySchema.PRODUCT_ID.eq(ProductSchema.ID))
                .leftJoin(OrderItemSchema.ORDER_ITEMS)
                    .on(ProductSchema.ID.eq(OrderItemSchema.PRODUCT_ID))
                .leftJoin(OrderSchema.ORDERS)
                    .on(OrderItemSchema.ORDER_ID.eq(OrderSchema.ID)
                        .and(OrderSchema.STATUS.in("PENDING", "CONFIRMED", "PROCESSING")))
                .where(warehouseCondition.and(ProductSchema.ACTIVE.eq(true)))
                .groupBy(InventorySchema.PRODUCT_ID, ProductSchema.NAME, ProductSchema.SKU,
                        InventorySchema.WAREHOUSE_LOCATION, InventorySchema.QUANTITY_ON_HAND, InventorySchema.QUANTITY_ALLOCATED)
                .orderBy(InventorySchema.QUANTITY_ALLOCATED.desc(), ProductSchema.NAME.asc())
                .fetch();
            
            List<InventoryAllocationAnalysis> analyses = records.stream()
                .map(record -> {
                    InventoryAllocationAnalysis analysis = new InventoryAllocationAnalysis();
                    analysis.setProductId(record.get(InventorySchema.PRODUCT_ID));
                    analysis.setProductName(record.get("product_name", String.class));
                    analysis.setProductSku(record.get("product_sku", String.class));
                    analysis.setWarehouseLocation(record.get(InventorySchema.WAREHOUSE_LOCATION));
                    analysis.setQuantityOnHand(record.get(InventorySchema.QUANTITY_ON_HAND));
                    analysis.setQuantityAllocated(record.get(InventorySchema.QUANTITY_ALLOCATED));
                    analysis.setAvailableQuantity(record.get("available_quantity", Integer.class));
                    analysis.setPendingOrderItems(record.get("pending_order_items", Integer.class));
                    analysis.setTotalPendingQuantity(record.get("total_pending_quantity", Integer.class));
                    analysis.setPendingOrders(record.get("pending_orders", Integer.class));
                    analysis.setOldestPendingOrder(record.get("oldest_pending_order", LocalDateTime.class));
                    analysis.setNewestPendingOrder(record.get("newest_pending_order", LocalDateTime.class));
                    return analysis;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated inventory allocation analysis for {} products", analyses.size());
            return analyses;
        } catch (Exception e) {
            logger.error("Error getting inventory allocation analysis", e);
            throw new RuntimeException("Failed to get inventory allocation analysis", e);
        }
    }
    
    /**
     * Get inventory turnover metrics with sales data
     */
    @Transactional(readOnly = true)
    public List<InventoryTurnoverMetrics> getInventoryTurnoverMetrics(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting inventory turnover metrics for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    InventorySchema.PRODUCT_ID,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    ProductSchema.COST_PRICE,
                    ProductSchema.SELLING_PRICE,
                    InventorySchema.WAREHOUSE_LOCATION,
                    InventorySchema.QUANTITY_ON_HAND,
                    InventorySchema.QUANTITY_ALLOCATED,
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("INBOUND", "RETURN"),
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_received"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"),
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_sold"),
                    DSL.count(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"), 1)
                        .else_(DSL.inline((Integer) null))).as("sale_transactions"),
                    DSL.avg(InventorySchema.QUANTITY_ON_HAND.cast(Double.class)).as("average_inventory_level")
                )
                .from(InventorySchema.INVENTORY)
                .join(ProductSchema.PRODUCTS).on(InventorySchema.PRODUCT_ID.eq(ProductSchema.ID))
                .leftJoin(StockMovementSchema.STOCK_MOVEMENTS)
                    .on(InventorySchema.PRODUCT_ID.eq(StockMovementSchema.PRODUCT_ID)
                        .and(StockMovementSchema.WAREHOUSE_LOCATION.eq(InventorySchema.WAREHOUSE_LOCATION))
                        .and(dateCondition))
                .where(ProductSchema.ACTIVE.eq(true))
                .groupBy(InventorySchema.PRODUCT_ID, ProductSchema.NAME, ProductSchema.SKU,
                        ProductSchema.COST_PRICE, ProductSchema.SELLING_PRICE,
                        InventorySchema.WAREHOUSE_LOCATION, InventorySchema.QUANTITY_ON_HAND, InventorySchema.QUANTITY_ALLOCATED)
                .having(DSL.sum(DSL.case_()
                    .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"),
                          StockMovementSchema.QUANTITY)
                    .else_(0)).gt(0))
                .orderBy(DSL.sum(DSL.case_()
                    .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"),
                          StockMovementSchema.QUANTITY)
                    .else_(0)).desc())
                .fetch();
            
            List<InventoryTurnoverMetrics> metrics = records.stream()
                .map(record -> {
                    InventoryTurnoverMetrics metric = new InventoryTurnoverMetrics();
                    metric.setProductId(record.get(InventorySchema.PRODUCT_ID));
                    metric.setProductName(record.get("product_name", String.class));
                    metric.setProductSku(record.get("product_sku", String.class));
                    metric.setCostPrice(record.get(ProductSchema.COST_PRICE));
                    metric.setSellingPrice(record.get(ProductSchema.SELLING_PRICE));
                    metric.setWarehouseLocation(record.get(InventorySchema.WAREHOUSE_LOCATION));
                    metric.setCurrentOnHand(record.get(InventorySchema.QUANTITY_ON_HAND));
                    metric.setCurrentAllocated(record.get(InventorySchema.QUANTITY_ALLOCATED));
                    metric.setTotalReceived(record.get("total_received", Integer.class));
                    metric.setTotalSold(record.get("total_sold", Integer.class));
                    metric.setSaleTransactions(record.get("sale_transactions", Integer.class));
                    metric.setAverageInventoryLevel(record.get("average_inventory_level", Double.class));
                    return metric;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated inventory turnover metrics for {} products", metrics.size());
            return metrics;
        } catch (Exception e) {
            logger.error("Error getting inventory turnover metrics", e);
            throw new RuntimeException("Failed to get inventory turnover metrics", e);
        }
    }entory.schema.OrderSchema.ID)
                        .and(com.ecommerce.inventory.schema.OrderSchema.STATUS.in("PENDING", "CONFIRMED", "PROCESSING")))
                .where(warehouseCondition.and(ProductSchema.ACTIVE.eq(true)))
                .groupBy(InventorySchema.PRODUCT_ID, ProductSchema.NAME, ProductSchema.SKU,
                        InventorySchema.WAREHOUSE_LOCATION, InventorySchema.QUANTITY_ON_HAND, InventorySchema.QUANTITY_ALLOCATED)
                .orderBy(InventorySchema.QUANTITY_ALLOCATED.desc(), ProductSchema.NAME.asc())
                .fetch();
            
            List<InventoryAllocationAnalysis> analyses = records.stream()
                .map(record -> {
                    InventoryAllocationAnalysis analysis = new InventoryAllocationAnalysis();
                    analysis.setProductId(record.get(InventorySchema.PRODUCT_ID));
                    analysis.setProductName(record.get("product_name", String.class));
                    analysis.setProductSku(record.get("product_sku", String.class));
                    analysis.setWarehouseLocation(record.get(InventorySchema.WAREHOUSE_LOCATION));
                    analysis.setQuantityOnHand(record.get(InventorySchema.QUANTITY_ON_HAND));
                    analysis.setQuantityAllocated(record.get(InventorySchema.QUANTITY_ALLOCATED));
                    analysis.setAvailableQuantity(record.get("available_quantity", Integer.class));
                    analysis.setPendingOrderItems(record.get("pending_order_items", Integer.class));
                    analysis.setTotalPendingQuantity(record.get("total_pending_quantity", Integer.class));
                    analysis.setPendingOrders(record.get("pending_orders", Integer.class));
                    analysis.setOldestPendingOrder(record.get("oldest_pending_order", LocalDateTime.class));
                    analysis.setNewestPendingOrder(record.get("newest_pending_order", LocalDateTime.class));
                    return analysis;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated inventory allocation analysis for {} products", analyses.size());
            return analyses;
        } catch (Exception e) {
            logger.error("Error getting inventory allocation analysis", e);
            throw new RuntimeException("Failed to get inventory allocation analysis", e);
        }
    }
    
    /**
     * Get inventory turnover metrics with sales data
     */
    @Transactional(readOnly = true)
    public List<InventoryTurnoverMetrics> getInventoryTurnoverMetrics(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting inventory turnover metrics for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(com.ecommerce.inventory.schema.StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(com.ecommerce.inventory.schema.StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    InventorySchema.PRODUCT_ID,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    ProductSchema.COST_PRICE,
                    ProductSchema.SELLING_PRICE,
                    InventorySchema.WAREHOUSE_LOCATION,
                    InventorySchema.QUANTITY_ON_HAND,
                    InventorySchema.QUANTITY_ALLOCATED,
                    DSL.sum(DSL.case_()
                        .when(com.ecommerce.inventory.schema.StockMovementSchema.MOVEMENT_TYPE.in("INBOUND", "RETURN"),
                              com.ecommerce.inventory.schema.StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_received"),
                    DSL.sum(DSL.case_()
                        .when(com.ecommerce.inventory.schema.StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"),
                              com.ecommerce.inventory.schema.StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_sold"),
                    DSL.count(DSL.case_()
                        .when(com.ecommerce.inventory.schema.StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"), 1)
                        .else_(DSL.inline((Integer) null))).as("sale_transactions"),
                    DSL.avg(InventorySchema.QUANTITY_ON_HAND.cast(Double.class)).as("average_inventory_level")
                )
                .from(InventorySchema.INVENTORY)
                .join(ProductSchema.PRODUCTS).on(InventorySchema.PRODUCT_ID.eq(ProductSchema.ID))
                .leftJoin(com.ecommerce.inventory.schema.StockMovementSchema.STOCK_MOVEMENTS)
                    .on(InventorySchema.PRODUCT_ID.eq(com.ecommerce.inventory.schema.StockMovementSchema.PRODUCT_ID)
                        .and(com.ecommerce.inventory.schema.StockMovementSchema.WAREHOUSE_LOCATION.eq(InventorySchema.WAREHOUSE_LOCATION))
                        .and(dateCondition))
                .where(ProductSchema.ACTIVE.eq(true))
                .groupBy(InventorySchema.PRODUCT_ID, ProductSchema.NAME, ProductSchema.SKU,
                        ProductSchema.COST_PRICE, ProductSchema.SELLING_PRICE,
                        InventorySchema.WAREHOUSE_LOCATION, InventorySchema.QUANTITY_ON_HAND, InventorySchema.QUANTITY_ALLOCATED)
                .having(DSL.sum(DSL.case_()
                    .when(com.ecommerce.inventory.schema.StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"),
                          com.ecommerce.inventory.schema.StockMovementSchema.QUANTITY)
                    .else_(0)).gt(0))
                .orderBy(DSL.sum(DSL.case_()
                    .when(com.ecommerce.inventory.schema.StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"),
                          com.ecommerce.inventory.schema.StockMovementSchema.QUANTITY)
                    .else_(0)).desc())
                .fetch();
            
            List<InventoryTurnoverMetrics> metrics = records.stream()
                .map(record -> {
                    InventoryTurnoverMetrics metric = new InventoryTurnoverMetrics();
                    metric.setProductId(record.get(InventorySchema.PRODUCT_ID));
                    metric.setProductName(record.get("product_name", String.class));
                    metric.setProductSku(record.get("product_sku", String.class));
                    metric.setCostPrice(record.get(ProductSchema.COST_PRICE));
                    metric.setSellingPrice(record.get(ProductSchema.SELLING_PRICE));
                    metric.setWarehouseLocation(record.get(InventorySchema.WAREHOUSE_LOCATION));
                    metric.setCurrentOnHand(record.get(InventorySchema.QUANTITY_ON_HAND));
                    metric.setCurrentAllocated(record.get(InventorySchema.QUANTITY_ALLOCATED));
                    metric.setTotalReceived(record.get("total_received", Integer.class));
                    metric.setTotalSold(record.get("total_sold", Integer.class));
                    metric.setSaleTransactions(record.get("sale_transactions", Integer.class));
                    metric.setAverageInventoryLevel(record.get("average_inventory_level", Double.class));
                    return metric;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated inventory turnover metrics for {} products", metrics.size());
            return metrics;
        } catch (Exception e) {
            logger.error("Error getting inventory turnover metrics", e);
            throw new RuntimeException("Failed to get inventory turnover metrics", e);
        }
    }
    
    // ========== HELPER CLASSES ==========
    
    /**
     * Inventory with product information
     */
    public static class InventoryWithProduct {
        private Inventory inventory;
        private String productName;
        private String productSku;
        private Integer reorderLevel;
        
        public InventoryWithProduct(Inventory inventory, String productName, String productSku, Integer reorderLevel) {
            this.inventory = inventory;
            this.productName = productName;
            this.productSku = productSku;
            this.reorderLevel = reorderLevel;
        }
        
        public Inventory getInventory() { return inventory; }
        public String getProductName() { return productName; }
        public String getProductSku() { return productSku; }
        public Integer getReorderLevel() { return reorderLevel; }
        
        public Integer getAvailableQuantity() {
            return inventory.getQuantityAvailable();
        }
        
        public boolean isLowStock() {
            return getAvailableQuantity() <= reorderLevel;
        }
    }
    
    /**
     * Warehouse inventory summary
     */
    public static class WarehouseInventorySummary {
        private String warehouseLocation;
        private Integer totalProducts;
        private Integer totalOnHand;
        private Integer totalAllocated;
        private Integer totalAvailable;
        private Integer lowStockProducts;
        
        // Getters and setters
        public String getWarehouseLocation() { return warehouseLocation; }
        public void setWarehouseLocation(String warehouseLocation) { this.warehouseLocation = warehouseLocation; }
        
        public Integer getTotalProducts() { return totalProducts; }
        public void setTotalProducts(Integer totalProducts) { this.totalProducts = totalProducts; }
        
        public Integer getTotalOnHand() { return totalOnHand; }
        public void setTotalOnHand(Integer totalOnHand) { this.totalOnHand = totalOnHand; }
        
        public Integer getTotalAllocated() { return totalAllocated; }
        public void setTotalAllocated(Integer totalAllocated) { this.totalAllocated = totalAllocated; }
        
        public Integer getTotalAvailable() { return totalAvailable; }
        public void setTotalAvailable(Integer totalAvailable) { this.totalAvailable = totalAvailable; }
        
        public Integer getLowStockProducts() { return lowStockProducts; }
        public void setLowStockProducts(Integer lowStockProducts) { this.lowStockProducts = lowStockProducts; }
        
        public double getUtilizationRate() {
            if (totalOnHand == null || totalOnHand == 0) return 0.0;
            return (double) (totalAllocated != null ? totalAllocated : 0) / totalOnHand * 100.0;
        }
    }
    
    /**
     * Inventory fulfillment status with detailed product information
     */
    public static class InventoryFulfillmentStatus {
        private Long inventoryId;
        private Long productId;
        private String productName;
        private String productSku;
        private Integer reorderLevel;
        private Integer reorderQuantity;
        private java.math.BigDecimal costPrice;
        private java.math.BigDecimal sellingPrice;
        private String warehouseLocation;
        private Integer quantityOnHand;
        private Integer quantityAllocated;
        private Integer availableQuantity;
        private LocalDateTime lastCountedAt;
        private String stockStatus;
        private Double allocationPercentage;
        
        // Getters and setters
        public Long getInventoryId() { return inventoryId; }
        public void setInventoryId(Long inventoryId) { this.inventoryId = inventoryId; }
        
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        
        public String getProductSku() { return productSku; }
        public void setProductSku(String productSku) { this.productSku = productSku; }
        
        public Integer getReorderLevel() { return reorderLevel; }
        public void setReorderLevel(Integer reorderLevel) { this.reorderLevel = reorderLevel; }
        
        public Integer getReorderQuantity() { return reorderQuantity; }
        public void setReorderQuantity(Integer reorderQuantity) { this.reorderQuantity = reorderQuantity; }
        
        public java.math.BigDecimal getCostPrice() { return costPrice; }
        public void setCostPrice(java.math.BigDecimal costPrice) { this.costPrice = costPrice; }
        
        public java.math.BigDecimal getSellingPrice() { return sellingPrice; }
        public void setSellingPrice(java.math.BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }
        
        public String getWarehouseLocation() { return warehouseLocation; }
        public void setWarehouseLocation(String warehouseLocation) { this.warehouseLocation = warehouseLocation; }
        
        public Integer getQuantityOnHand() { return quantityOnHand; }
        public void setQuantityOnHand(Integer quantityOnHand) { this.quantityOnHand = quantityOnHand; }
        
        public Integer getQuantityAllocated() { return quantityAllocated; }
        public void setQuantityAllocated(Integer quantityAllocated) { this.quantityAllocated = quantityAllocated; }
        
        public Integer getAvailableQuantity() { return availableQuantity; }
        public void setAvailableQuantity(Integer availableQuantity) { this.availableQuantity = availableQuantity; }
        
        public LocalDateTime getLastCountedAt() { return lastCountedAt; }
        public void setLastCountedAt(LocalDateTime lastCountedAt) { this.lastCountedAt = lastCountedAt; }
        
        public String getStockStatus() { return stockStatus; }
        public void setStockStatus(String stockStatus) { this.stockStatus = stockStatus; }
        
        public Double getAllocationPercentage() { return allocationPercentage; }
        public void setAllocationPercentage(Double allocationPercentage) { this.allocationPercentage = allocationPercentage; }
        
        public boolean isLowStock() {
            return "LOW_STOCK".equals(stockStatus);
        }
        
        public boolean isOutOfStock() {
            return "OUT_OF_STOCK".equals(stockStatus);
        }
        
        public boolean isAvailable() {
            return "AVAILABLE".equals(stockStatus);
        }
        
        public boolean needsReordering() {
            return isLowStock() && reorderLevel != null && availableQuantity != null && availableQuantity <= reorderLevel;
        }
        
        public Integer getReorderSuggestion() {
            if (!needsReordering()) return 0;
            return reorderQuantity != null ? reorderQuantity : (reorderLevel != null ? reorderLevel * 2 : 50);
        }
    }
    
    /**
     * Inventory allocation analysis with order details
     */
    public static class InventoryAllocationAnalysis {
        private Long productId;
        private String productName;
        private String productSku;
        private String warehouseLocation;
        private Integer quantityOnHand;
        private Integer quantityAllocated;
        private Integer availableQuantity;
        private Integer pendingOrderItems;
        private Integer totalPendingQuantity;
        private Integer pendingOrders;
        private LocalDateTime oldestPendingOrder;
        private LocalDateTime newestPendingOrder;
        
        // Getters and setters
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        
        public String getProductSku() { return productSku; }
        public void setProductSku(String productSku) { this.productSku = productSku; }
        
        public String getWarehouseLocation() { return warehouseLocation; }
        public void setWarehouseLocation(String warehouseLocation) { this.warehouseLocation = warehouseLocation; }
        
        public Integer getQuantityOnHand() { return quantityOnHand; }
        public void setQuantityOnHand(Integer quantityOnHand) { this.quantityOnHand = quantityOnHand; }
        
        public Integer getQuantityAllocated() { return quantityAllocated; }
        public void setQuantityAllocated(Integer quantityAllocated) { this.quantityAllocated = quantityAllocated; }
        
        public Integer getAvailableQuantity() { return availableQuantity; }
        public void setAvailableQuantity(Integer availableQuantity) { this.availableQuantity = availableQuantity; }
        
        public Integer getPendingOrderItems() { return pendingOrderItems; }
        public void setPendingOrderItems(Integer pendingOrderItems) { this.pendingOrderItems = pendingOrderItems; }
        
        public Integer getTotalPendingQuantity() { return totalPendingQuantity; }
        public void setTotalPendingQuantity(Integer totalPendingQuantity) { this.totalPendingQuantity = totalPendingQuantity; }
        
        public Integer getPendingOrders() { return pendingOrders; }
        public void setPendingOrders(Integer pendingOrders) { this.pendingOrders = pendingOrders; }
        
        public LocalDateTime getOldestPendingOrder() { return oldestPendingOrder; }
        public void setOldestPendingOrder(LocalDateTime oldestPendingOrder) { this.oldestPendingOrder = oldestPendingOrder; }
        
        public LocalDateTime getNewestPendingOrder() { return newestPendingOrder; }
        public void setNewestPendingOrder(LocalDateTime newestPendingOrder) { this.newestPendingOrder = newestPendingOrder; }
        
        public double getAllocationRate() {
            if (quantityOnHand == null || quantityOnHand == 0) return 0.0;
            return (double) (quantityAllocated != null ? quantityAllocated : 0) / quantityOnHand * 100.0;
        }
        
        public boolean hasBackorders() {
            return totalPendingQuantity != null && availableQuantity != null && totalPendingQuantity > availableQuantity;
        }
        
        public Integer getBackorderQuantity() {
            if (!hasBackorders()) return 0;
            return totalPendingQuantity - availableQuantity;
        }
        
        public boolean canFulfillAllPendingOrders() {
            return !hasBackorders();
        }
    }
    
    /**
     * Inventory turnover metrics with sales analysis
     */
    public static class InventoryTurnoverMetrics {
        private Long productId;
        private String productName;
        private String productSku;
        private java.math.BigDecimal costPrice;
        private java.math.BigDecimal sellingPrice;
        private String warehouseLocation;
        private Integer currentOnHand;
        private Integer currentAllocated;
        private Integer totalReceived;
        private Integer totalSold;
        private Integer saleTransactions;
        private Double averageInventoryLevel;
        
        // Getters and setters
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        
        public String getProductSku() { return productSku; }
        public void setProductSku(String productSku) { this.productSku = productSku; }
        
        public java.math.BigDecimal getCostPrice() { return costPrice; }
        public void setCostPrice(java.math.BigDecimal costPrice) { this.costPrice = costPrice; }
        
        public java.math.BigDecimal getSellingPrice() { return sellingPrice; }
        public void setSellingPrice(java.math.BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }
        
        public String getWarehouseLocation() { return warehouseLocation; }
        public void setWarehouseLocation(String warehouseLocation) { this.warehouseLocation = warehouseLocation; }
        
        public Integer getCurrentOnHand() { return currentOnHand; }
        public void setCurrentOnHand(Integer currentOnHand) { this.currentOnHand = currentOnHand; }
        
        public Integer getCurrentAllocated() { return currentAllocated; }
        public void setCurrentAllocated(Integer currentAllocated) { this.currentAllocated = currentAllocated; }
        
        public Integer getTotalReceived() { return totalReceived; }
        public void setTotalReceived(Integer totalReceived) { this.totalReceived = totalReceived; }
        
        public Integer getTotalSold() { return totalSold; }
        public void setTotalSold(Integer totalSold) { this.totalSold = totalSold; }
        
        public Integer getSaleTransactions() { return saleTransactions; }
        public void setSaleTransactions(Integer saleTransactions) { this.saleTransactions = saleTransactions; }
        
        public Double getAverageInventoryLevel() { return averageInventoryLevel; }
        public void setAverageInventoryLevel(Double averageInventoryLevel) { this.averageInventoryLevel = averageInventoryLevel; }
        
        public Integer getCurrentAvailable() {
            return (currentOnHand != null ? currentOnHand : 0) - (currentAllocated != null ? currentAllocated : 0);
        }
        
        public double getTurnoverRate() {
            if (averageInventoryLevel == null || averageInventoryLevel == 0) return 0.0;
            return (double) (totalSold != null ? totalSold : 0) / averageInventoryLevel;
        }
        
        public double getAverageQuantityPerSale() {
            if (saleTransactions == null || saleTransactions == 0) return 0.0;
            return (double) (totalSold != null ? totalSold : 0) / saleTransactions;
        }
        
        public java.math.BigDecimal getTotalCostOfGoodsSold() {
            if (costPrice == null || totalSold == null) return java.math.BigDecimal.ZERO;
            return costPrice.multiply(java.math.BigDecimal.valueOf(totalSold));
        }
        
        public java.math.BigDecimal getTotalRevenue() {
            if (sellingPrice == null || totalSold == null) return java.math.BigDecimal.ZERO;
            return sellingPrice.multiply(java.math.BigDecimal.valueOf(totalSold));
        }
        
        public java.math.BigDecimal getGrossProfit() {
            return getTotalRevenue().subtract(getTotalCostOfGoodsSold());
        }
        
        public double getGrossProfitMargin() {
            java.math.BigDecimal revenue = getTotalRevenue();
            if (revenue.compareTo(java.math.BigDecimal.ZERO) == 0) return 0.0;
            return getGrossProfit().divide(revenue, 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100.0;
        }
    }
}