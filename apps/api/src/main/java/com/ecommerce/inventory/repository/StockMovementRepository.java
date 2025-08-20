package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.StockMovement;
import com.ecommerce.inventory.entity.StockMovementType;
import com.ecommerce.inventory.schema.StockMovementSchema;
import com.ecommerce.inventory.schema.ProductSchema;
import com.ecommerce.inventory.schema.UserSchema;
import com.ecommerce.inventory.schema.InventorySchema;
import org.jooq.*;
import org.jooq.impl.DSL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Repository for StockMovement entity with audit trail and reporting queries
 * Implements comprehensive stock movement tracking using JOOQ
 */
@Repository
@Transactional
public class StockMovementRepository extends AbstractBaseRepository<StockMovement, Long> {
    
    private static final Logger logger = LoggerFactory.getLogger(StockMovementRepository.class);
    
    @Override
    protected StockMovement recordToEntity(Record record) {
        if (record == null) return null;
        
        StockMovement stockMovement = new StockMovement();
        stockMovement.setId(record.get(StockMovementSchema.ID));
        
        String movementTypeStr = record.get(StockMovementSchema.MOVEMENT_TYPE);
        if (movementTypeStr != null) {
            stockMovement.setMovementType(StockMovementType.valueOf(movementTypeStr));
        }
        
        stockMovement.setQuantity(record.get(StockMovementSchema.QUANTITY));
        stockMovement.setReferenceId(record.get(StockMovementSchema.REFERENCE_ID));
        stockMovement.setReferenceType(record.get(StockMovementSchema.REFERENCE_TYPE));
        stockMovement.setReason(record.get(StockMovementSchema.REASON));
        stockMovement.setWarehouseLocation(record.get(StockMovementSchema.WAREHOUSE_LOCATION));
        stockMovement.setCreatedAt(record.get(StockMovementSchema.CREATED_AT));
        
        return stockMovement;
    }
    
    @Override
    protected Record entityToRecord(StockMovement entity) {
        return dsl.newRecord(StockMovementSchema.STOCK_MOVEMENTS)
            .set(StockMovementSchema.ID, entity.getId())
            .set(StockMovementSchema.PRODUCT_ID, entity.getProduct() != null ? entity.getProduct().getId() : null)
            .set(StockMovementSchema.MOVEMENT_TYPE, entity.getMovementType() != null ? entity.getMovementType().name() : null)
            .set(StockMovementSchema.QUANTITY, entity.getQuantity())
            .set(StockMovementSchema.REFERENCE_ID, entity.getReferenceId())
            .set(StockMovementSchema.REFERENCE_TYPE, entity.getReferenceType())
            .set(StockMovementSchema.REASON, entity.getReason())
            .set(StockMovementSchema.WAREHOUSE_LOCATION, entity.getWarehouseLocation())
            .set(StockMovementSchema.USER_ID, entity.getUser() != null ? entity.getUser().getId() : null)
            .set(StockMovementSchema.CREATED_AT, entity.getCreatedAt() != null ? entity.getCreatedAt() : LocalDateTime.now());
    }
    
    @Override
    protected Class<StockMovement> getEntityClass() {
        return StockMovement.class;
    }
    
    @Override
    public Table<Record> getTable() {
        return StockMovementSchema.STOCK_MOVEMENTS;
    }
    
    @Override
    public TableField<Record, Long> getIdField() {
        return StockMovementSchema.ID;
    }
    
    @Override
    protected Long getEntityId(StockMovement entity) {
        return entity.getId();
    }
    
    // ========== AUDIT TRAIL QUERIES ==========
    
    /**
     * Find stock movements by product ID
     */
    @Transactional(readOnly = true)
    public List<StockMovement> findByProductId(Long productId) {
        logger.debug("Finding stock movements by product ID: {}", productId);
        
        try {
            Result<Record> records = dsl.select()
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(StockMovementSchema.PRODUCT_ID.eq(productId))
                .orderBy(StockMovementSchema.CREATED_AT.desc())
                .fetch();
            
            List<StockMovement> movements = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} stock movements for product ID: {}", movements.size(), productId);
            return movements;
        } catch (Exception e) {
            logger.error("Error finding stock movements by product ID: {}", productId, e);
            throw new RuntimeException("Failed to find stock movements by product ID", e);
        }
    }
    
    /**
     * Find stock movements by product ID with pagination
     */
    @Transactional(readOnly = true)
    public Page<StockMovement> findByProductId(Long productId, Pageable pageable) {
        logger.debug("Finding stock movements by product ID with pagination: {}", productId);
        
        try {
            Condition condition = StockMovementSchema.PRODUCT_ID.eq(productId);
            
            Integer totalCount = dsl.selectCount()
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(condition)
                .orderBy(StockMovementSchema.CREATED_AT.desc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<StockMovement> movements = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(movements, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding stock movements by product ID with pagination", e);
            throw new RuntimeException("Failed to find stock movements by product ID with pagination", e);
        }
    }
    
    /**
     * Find stock movements by movement type
     */
    @Transactional(readOnly = true)
    public List<StockMovement> findByMovementType(StockMovementType movementType) {
        logger.debug("Finding stock movements by movement type: {}", movementType);
        
        try {
            Result<Record> records = dsl.select()
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(StockMovementSchema.MOVEMENT_TYPE.eq(movementType.name()))
                .orderBy(StockMovementSchema.CREATED_AT.desc())
                .fetch();
            
            List<StockMovement> movements = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} stock movements with type: {}", movements.size(), movementType);
            return movements;
        } catch (Exception e) {
            logger.error("Error finding stock movements by movement type", e);
            throw new RuntimeException("Failed to find stock movements by movement type", e);
        }
    }
    
    /**
     * Find stock movements by reference ID and type
     */
    @Transactional(readOnly = true)
    public List<StockMovement> findByReference(String referenceId, String referenceType) {
        logger.debug("Finding stock movements by reference: {} - {}", referenceId, referenceType);
        
        try {
            Condition condition = DSL.trueCondition();
            
            if (referenceId != null) {
                condition = condition.and(StockMovementSchema.REFERENCE_ID.eq(referenceId));
            }
            if (referenceType != null) {
                condition = condition.and(StockMovementSchema.REFERENCE_TYPE.eq(referenceType));
            }
            
            Result<Record> records = dsl.select()
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(condition)
                .orderBy(StockMovementSchema.CREATED_AT.desc())
                .fetch();
            
            List<StockMovement> movements = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} stock movements for reference: {} - {}", movements.size(), referenceId, referenceType);
            return movements;
        } catch (Exception e) {
            logger.error("Error finding stock movements by reference", e);
            throw new RuntimeException("Failed to find stock movements by reference", e);
        }
    }
    
    /**
     * Find stock movements by date range
     */
    @Transactional(readOnly = true)
    public List<StockMovement> findByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Finding stock movements by date range: {} to {}", startDate, endDate);
        
        try {
            Condition condition = DSL.trueCondition();
            
            if (startDate != null) {
                condition = condition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                condition = condition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select()
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(condition)
                .orderBy(StockMovementSchema.CREATED_AT.desc())
                .fetch();
            
            List<StockMovement> movements = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} stock movements in date range", movements.size());
            return movements;
        } catch (Exception e) {
            logger.error("Error finding stock movements by date range", e);
            throw new RuntimeException("Failed to find stock movements by date range", e);
        }
    }
    
    /**
     * Find stock movements by warehouse location
     */
    @Transactional(readOnly = true)
    public List<StockMovement> findByWarehouseLocation(String warehouseLocation) {
        logger.debug("Finding stock movements by warehouse location: {}", warehouseLocation);
        
        try {
            Result<Record> records = dsl.select()
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(StockMovementSchema.WAREHOUSE_LOCATION.eq(warehouseLocation))
                .orderBy(StockMovementSchema.CREATED_AT.desc())
                .fetch();
            
            List<StockMovement> movements = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} stock movements in warehouse: {}", movements.size(), warehouseLocation);
            return movements;
        } catch (Exception e) {
            logger.error("Error finding stock movements by warehouse location", e);
            throw new RuntimeException("Failed to find stock movements by warehouse location", e);
        }
    }
    
    /**
     * Find stock movements by user ID
     */
    @Transactional(readOnly = true)
    public List<StockMovement> findByUserId(Long userId) {
        logger.debug("Finding stock movements by user ID: {}", userId);
        
        try {
            Result<Record> records = dsl.select()
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(StockMovementSchema.USER_ID.eq(userId))
                .orderBy(StockMovementSchema.CREATED_AT.desc())
                .fetch();
            
            List<StockMovement> movements = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} stock movements by user ID: {}", movements.size(), userId);
            return movements;
        } catch (Exception e) {
            logger.error("Error finding stock movements by user ID", e);
            throw new RuntimeException("Failed to find stock movements by user ID", e);
        }
    }
    
    // ========== REPORTING QUERIES ==========
    
    /**
     * Get stock movement summary by product for a date range
     */
    @Transactional(readOnly = true)
    public List<ProductMovementSummary> getProductMovementSummary(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting product movement summary for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    StockMovementSchema.PRODUCT_ID,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    DSL.count().as("total_movements"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("INBOUND", "ADJUSTMENT", "RETURN"), 
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_inbound"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "ALLOCATION", "SALE"), 
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_outbound"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.eq("ADJUSTMENT"), 
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_adjustments")
                )
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .join(ProductSchema.PRODUCTS).on(StockMovementSchema.PRODUCT_ID.eq(ProductSchema.ID))
                .where(dateCondition)
                .groupBy(StockMovementSchema.PRODUCT_ID, ProductSchema.NAME, ProductSchema.SKU)
                .orderBy(DSL.count().desc())
                .fetch();
            
            List<ProductMovementSummary> summaries = records.stream()
                .map(record -> {
                    ProductMovementSummary summary = new ProductMovementSummary();
                    summary.setProductId(record.get(StockMovementSchema.PRODUCT_ID));
                    summary.setProductName(record.get("product_name", String.class));
                    summary.setProductSku(record.get("product_sku", String.class));
                    summary.setTotalMovements(record.get("total_movements", Integer.class));
                    summary.setTotalInbound(record.get("total_inbound", Integer.class));
                    summary.setTotalOutbound(record.get("total_outbound", Integer.class));
                    summary.setTotalAdjustments(record.get("total_adjustments", Integer.class));
                    return summary;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated movement summary for {} products", summaries.size());
            return summaries;
        } catch (Exception e) {
            logger.error("Error getting product movement summary", e);
            throw new RuntimeException("Failed to get product movement summary", e);
        }
    }
    
    /**
     * Get movement type breakdown for a date range
     */
    @Transactional(readOnly = true)
    public List<MovementTypeBreakdown> getMovementTypeBreakdown(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting movement type breakdown for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    StockMovementSchema.MOVEMENT_TYPE,
                    DSL.count().as("movement_count"),
                    DSL.sum(StockMovementSchema.QUANTITY).as("total_quantity"),
                    DSL.countDistinct(StockMovementSchema.PRODUCT_ID).as("unique_products")
                )
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(dateCondition)
                .groupBy(StockMovementSchema.MOVEMENT_TYPE)
                .orderBy(DSL.count().desc())
                .fetch();
            
            List<MovementTypeBreakdown> breakdowns = records.stream()
                .map(record -> {
                    MovementTypeBreakdown breakdown = new MovementTypeBreakdown();
                    breakdown.setMovementType(record.get(StockMovementSchema.MOVEMENT_TYPE));
                    breakdown.setMovementCount(record.get("movement_count", Integer.class));
                    breakdown.setTotalQuantity(record.get("total_quantity", Integer.class));
                    breakdown.setUniqueProducts(record.get("unique_products", Integer.class));
                    return breakdown;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated movement type breakdown for {} types", breakdowns.size());
            return breakdowns;
        } catch (Exception e) {
            logger.error("Error getting movement type breakdown", e);
            throw new RuntimeException("Failed to get movement type breakdown", e);
        }
    }
    
    /**
     * Get daily movement summary for a date range
     */
    @Transactional(readOnly = true)
    public List<DailyMovementSummary> getDailyMovementSummary(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting daily movement summary for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    DSL.date(StockMovementSchema.CREATED_AT).as("movement_date"),
                    DSL.count().as("total_movements"),
                    DSL.sum(StockMovementSchema.QUANTITY).as("total_quantity"),
                    DSL.countDistinct(StockMovementSchema.PRODUCT_ID).as("unique_products"),
                    DSL.countDistinct(StockMovementSchema.USER_ID).as("unique_users")
                )
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(dateCondition)
                .groupBy(DSL.date(StockMovementSchema.CREATED_AT))
                .orderBy(DSL.date(StockMovementSchema.CREATED_AT).desc())
                .fetch();
            
            List<DailyMovementSummary> summaries = records.stream()
                .map(record -> {
                    DailyMovementSummary summary = new DailyMovementSummary();
                    summary.setDate(record.get("movement_date", java.sql.Date.class).toLocalDate());
                    summary.setTotalMovements(record.get("total_movements", Integer.class));
                    summary.setTotalQuantity(record.get("total_quantity", Integer.class));
                    summary.setUniqueProducts(record.get("unique_products", Integer.class));
                    summary.setUniqueUsers(record.get("unique_users", Integer.class));
                    return summary;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated {} daily movement summaries", summaries.size());
            return summaries;
        } catch (Exception e) {
            logger.error("Error getting daily movement summary", e);
            throw new RuntimeException("Failed to get daily movement summary", e);
        }
    }
    
    /**
     * Get warehouse movement activity
     */
    @Transactional(readOnly = true)
    public List<WarehouseMovementSummary> getWarehouseMovementSummary(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting warehouse movement summary for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    StockMovementSchema.WAREHOUSE_LOCATION,
                    DSL.count().as("total_movements"),
                    DSL.sum(StockMovementSchema.QUANTITY).as("total_quantity"),
                    DSL.countDistinct(StockMovementSchema.PRODUCT_ID).as("unique_products"),
                    DSL.countDistinct(StockMovementSchema.USER_ID).as("unique_users")
                )
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(dateCondition)
                .groupBy(StockMovementSchema.WAREHOUSE_LOCATION)
                .orderBy(DSL.count().desc())
                .fetch();
            
            List<WarehouseMovementSummary> summaries = records.stream()
                .map(record -> {
                    WarehouseMovementSummary summary = new WarehouseMovementSummary();
                    summary.setWarehouseLocation(record.get(StockMovementSchema.WAREHOUSE_LOCATION));
                    summary.setTotalMovements(record.get("total_movements", Integer.class));
                    summary.setTotalQuantity(record.get("total_quantity", Integer.class));
                    summary.setUniqueProducts(record.get("unique_products", Integer.class));
                    summary.setUniqueUsers(record.get("unique_users", Integer.class));
                    return summary;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated warehouse movement summary for {} warehouses", summaries.size());
            return summaries;
        } catch (Exception e) {
            logger.error("Error getting warehouse movement summary", e);
            throw new RuntimeException("Failed to get warehouse movement summary", e);
        }
    }
    
    // ========== COMPLEX JOINS FOR ORDER FULFILLMENT AND INVENTORY ANALYSIS ==========
    
    /**
     * Get order fulfillment analysis with stock movements
     */
    @Transactional(readOnly = true)
    public List<OrderFulfillmentAnalysis> getOrderFulfillmentAnalysis(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting order fulfillment analysis for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    StockMovementSchema.REFERENCE_ID.as("order_id"),
                    DSL.count().as("movement_count"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.eq("ALLOCATION"), 
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("allocated_quantity"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.eq("RELEASE"), 
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("released_quantity"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.eq("OUTBOUND"), 
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("shipped_quantity"),
                    DSL.countDistinct(StockMovementSchema.PRODUCT_ID).as("unique_products"),
                    DSL.min(StockMovementSchema.CREATED_AT).as("first_movement"),
                    DSL.max(StockMovementSchema.CREATED_AT).as("last_movement")
                )
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .where(StockMovementSchema.REFERENCE_TYPE.eq("ORDER")
                    .and(StockMovementSchema.REFERENCE_ID.isNotNull())
                    .and(dateCondition))
                .groupBy(StockMovementSchema.REFERENCE_ID)
                .orderBy(DSL.max(StockMovementSchema.CREATED_AT).desc())
                .fetch();
            
            List<OrderFulfillmentAnalysis> analyses = records.stream()
                .map(record -> {
                    OrderFulfillmentAnalysis analysis = new OrderFulfillmentAnalysis();
                    analysis.setOrderId(record.get("order_id", String.class));
                    analysis.setMovementCount(record.get("movement_count", Integer.class));
                    analysis.setAllocatedQuantity(record.get("allocated_quantity", Integer.class));
                    analysis.setReleasedQuantity(record.get("released_quantity", Integer.class));
                    analysis.setShippedQuantity(record.get("shipped_quantity", Integer.class));
                    analysis.setUniqueProducts(record.get("unique_products", Integer.class));
                    analysis.setFirstMovement(record.get("first_movement", LocalDateTime.class));
                    analysis.setLastMovement(record.get("last_movement", LocalDateTime.class));
                    return analysis;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated order fulfillment analysis for {} orders", analyses.size());
            return analyses;
        } catch (Exception e) {
            logger.error("Error getting order fulfillment analysis", e);
            throw new RuntimeException("Failed to get order fulfillment analysis", e);
        }
    }
    
    /**
     * Get inventory turnover analysis
     */
    @Transactional(readOnly = true)
    public List<InventoryTurnoverAnalysis> getInventoryTurnoverAnalysis(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting inventory turnover analysis for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    StockMovementSchema.PRODUCT_ID,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    ProductSchema.COST_PRICE.as("cost_price"),
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
                    DSL.min(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"), 
                              StockMovementSchema.CREATED_AT)
                        .else_(DSL.inline((LocalDateTime) null))).as("first_sale"),
                    DSL.max(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"), 
                              StockMovementSchema.CREATED_AT)
                        .else_(DSL.inline((LocalDateTime) null))).as("last_sale")
                )
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .join(ProductSchema.PRODUCTS).on(StockMovementSchema.PRODUCT_ID.eq(ProductSchema.ID))
                .where(dateCondition)
                .groupBy(StockMovementSchema.PRODUCT_ID, ProductSchema.NAME, ProductSchema.SKU, ProductSchema.COST_PRICE)
                .having(DSL.sum(DSL.case_()
                    .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"), 
                          StockMovementSchema.QUANTITY)
                    .else_(0)).gt(0))
                .orderBy(DSL.sum(DSL.case_()
                    .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE"), 
                          StockMovementSchema.QUANTITY)
                    .else_(0)).desc())
                .fetch();
            
            List<InventoryTurnoverAnalysis> analyses = records.stream()
                .map(record -> {
                    InventoryTurnoverAnalysis analysis = new InventoryTurnoverAnalysis();
                    analysis.setProductId(record.get(StockMovementSchema.PRODUCT_ID));
                    analysis.setProductName(record.get("product_name", String.class));
                    analysis.setProductSku(record.get("product_sku", String.class));
                    analysis.setCostPrice(record.get("cost_price", BigDecimal.class));
                    analysis.setTotalReceived(record.get("total_received", Integer.class));
                    analysis.setTotalSold(record.get("total_sold", Integer.class));
                    analysis.setSaleTransactions(record.get("sale_transactions", Integer.class));
                    analysis.setFirstSale(record.get("first_sale", LocalDateTime.class));
                    analysis.setLastSale(record.get("last_sale", LocalDateTime.class));
                    return analysis;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated inventory turnover analysis for {} products", analyses.size());
            return analyses;
        } catch (Exception e) {
            logger.error("Error getting inventory turnover analysis", e);
            throw new RuntimeException("Failed to get inventory turnover analysis", e);
        }
    }
    
    // ========== HELPER CLASSES ==========
    
    /**
     * Product movement summary
     */
    public static class ProductMovementSummary {
        private Long productId;
        private String productName;
        private String productSku;
        private Integer totalMovements;
        private Integer totalInbound;
        private Integer totalOutbound;
        private Integer totalAdjustments;
        
        // Getters and setters
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        
        public String getProductSku() { return productSku; }
        public void setProductSku(String productSku) { this.productSku = productSku; }
        
        public Integer getTotalMovements() { return totalMovements; }
        public void setTotalMovements(Integer totalMovements) { this.totalMovements = totalMovements; }
        
        public Integer getTotalInbound() { return totalInbound; }
        public void setTotalInbound(Integer totalInbound) { this.totalInbound = totalInbound; }
        
        public Integer getTotalOutbound() { return totalOutbound; }
        public void setTotalOutbound(Integer totalOutbound) { this.totalOutbound = totalOutbound; }
        
        public Integer getTotalAdjustments() { return totalAdjustments; }
        public void setTotalAdjustments(Integer totalAdjustments) { this.totalAdjustments = totalAdjustments; }
        
        public Integer getNetMovement() {
            return (totalInbound != null ? totalInbound : 0) - (totalOutbound != null ? totalOutbound : 0);
        }
    }
    
    /**
     * Movement type breakdown
     */
    public static class MovementTypeBreakdown {
        private String movementType;
        private Integer movementCount;
        private Integer totalQuantity;
        private Integer uniqueProducts;
        
        // Getters and setters
        public String getMovementType() { return movementType; }
        public void setMovementType(String movementType) { this.movementType = movementType; }
        
        public Integer getMovementCount() { return movementCount; }
        public void setMovementCount(Integer movementCount) { this.movementCount = movementCount; }
        
        public Integer getTotalQuantity() { return totalQuantity; }
        public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }
        
        public Integer getUniqueProducts() { return uniqueProducts; }
        public void setUniqueProducts(Integer uniqueProducts) { this.uniqueProducts = uniqueProducts; }
        
        public double getAverageQuantityPerMovement() {
            if (movementCount == null || movementCount == 0) return 0.0;
            return (double) (totalQuantity != null ? totalQuantity : 0) / movementCount;
        }
    }
    
    /**
     * Daily movement summary
     */
    public static class DailyMovementSummary {
        private java.time.LocalDate date;
        private Integer totalMovements;
        private Integer totalQuantity;
        private Integer uniqueProducts;
        private Integer uniqueUsers;
        
        // Getters and setters
        public java.time.LocalDate getDate() { return date; }
        public void setDate(java.time.LocalDate date) { this.date = date; }
        
        public Integer getTotalMovements() { return totalMovements; }
        public void setTotalMovements(Integer totalMovements) { this.totalMovements = totalMovements; }
        
        public Integer getTotalQuantity() { return totalQuantity; }
        public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }
        
        public Integer getUniqueProducts() { return uniqueProducts; }
        public void setUniqueProducts(Integer uniqueProducts) { this.uniqueProducts = uniqueProducts; }
        
        public Integer getUniqueUsers() { return uniqueUsers; }
        public void setUniqueUsers(Integer uniqueUsers) { this.uniqueUsers = uniqueUsers; }
    }
    
    /**
     * Warehouse movement summary
     */
    public static class WarehouseMovementSummary {
        private String warehouseLocation;
        private Integer totalMovements;
        private Integer totalQuantity;
        private Integer uniqueProducts;
        private Integer uniqueUsers;
        
        // Getters and setters
        public String getWarehouseLocation() { return warehouseLocation; }
        public void setWarehouseLocation(String warehouseLocation) { this.warehouseLocation = warehouseLocation; }
        
        public Integer getTotalMovements() { return totalMovements; }
        public void setTotalMovements(Integer totalMovements) { this.totalMovements = totalMovements; }
        
        public Integer getTotalQuantity() { return totalQuantity; }
        public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }
        
        public Integer getUniqueProducts() { return uniqueProducts; }
        public void setUniqueProducts(Integer uniqueProducts) { this.uniqueProducts = uniqueProducts; }
        
        public Integer getUniqueUsers() { return uniqueUsers; }
        public void setUniqueUsers(Integer uniqueUsers) { this.uniqueUsers = uniqueUsers; }
    }
    
    /**
     * Order fulfillment analysis
     */
    public static class OrderFulfillmentAnalysis {
        private String orderId;
        private Integer movementCount;
        private Integer allocatedQuantity;
        private Integer releasedQuantity;
        private Integer shippedQuantity;
        private Integer uniqueProducts;
        private LocalDateTime firstMovement;
        private LocalDateTime lastMovement;
        
        // Getters and setters
        public String getOrderId() { return orderId; }
        public void setOrderId(String orderId) { this.orderId = orderId; }
        
        public Integer getMovementCount() { return movementCount; }
        public void setMovementCount(Integer movementCount) { this.movementCount = movementCount; }
        
        public Integer getAllocatedQuantity() { return allocatedQuantity; }
        public void setAllocatedQuantity(Integer allocatedQuantity) { this.allocatedQuantity = allocatedQuantity; }
        
        public Integer getReleasedQuantity() { return releasedQuantity; }
        public void setReleasedQuantity(Integer releasedQuantity) { this.releasedQuantity = releasedQuantity; }
        
        public Integer getShippedQuantity() { return shippedQuantity; }
        public void setShippedQuantity(Integer shippedQuantity) { this.shippedQuantity = shippedQuantity; }
        
        public Integer getUniqueProducts() { return uniqueProducts; }
        public void setUniqueProducts(Integer uniqueProducts) { this.uniqueProducts = uniqueProducts; }
        
        public LocalDateTime getFirstMovement() { return firstMovement; }
        public void setFirstMovement(LocalDateTime firstMovement) { this.firstMovement = firstMovement; }
        
        public LocalDateTime getLastMovement() { return lastMovement; }
        public void setLastMovement(LocalDateTime lastMovement) { this.lastMovement = lastMovement; }
        
        public Integer getNetAllocated() {
            return (allocatedQuantity != null ? allocatedQuantity : 0) - (releasedQuantity != null ? releasedQuantity : 0);
        }
        
        public boolean isFullyShipped() {
            return shippedQuantity != null && allocatedQuantity != null && 
                   shippedQuantity.equals(allocatedQuantity - (releasedQuantity != null ? releasedQuantity : 0));
        }
    }
    
    /**
     * Inventory turnover analysis
     */
    public static class InventoryTurnoverAnalysis {
        private Long productId;
        private String productName;
        private String productSku;
        private BigDecimal costPrice;
        private Integer totalReceived;
        private Integer totalSold;
        private Integer saleTransactions;
        private LocalDateTime firstSale;
        private LocalDateTime lastSale;
        
        // Getters and setters
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        
        public String getProductSku() { return productSku; }
        public void setProductSku(String productSku) { this.productSku = productSku; }
        
        public BigDecimal getCostPrice() { return costPrice; }
        public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }
        
        public Integer getTotalReceived() { return totalReceived; }
        public void setTotalReceived(Integer totalReceived) { this.totalReceived = totalReceived; }
        
        public Integer getTotalSold() { return totalSold; }
        public void setTotalSold(Integer totalSold) { this.totalSold = totalSold; }
        
        public Integer getSaleTransactions() { return saleTransactions; }
        public void setSaleTransactions(Integer saleTransactions) { this.saleTransactions = saleTransactions; }
        
        public LocalDateTime getFirstSale() { return firstSale; }
        public void setFirstSale(LocalDateTime firstSale) { this.firstSale = firstSale; }
        
        public LocalDateTime getLastSale() { return lastSale; }
        public void setLastSale(LocalDateTime lastSale) { this.lastSale = lastSale; }
        
        public double getTurnoverRate() {
            if (totalReceived == null || totalReceived == 0) return 0.0;
            return (double) (totalSold != null ? totalSold : 0) / totalReceived;
        }
        
        public double getAverageQuantityPerSale() {
            if (saleTransactions == null || saleTransactions == 0) return 0.0;
            return (double) (totalSold != null ? totalSold : 0) / saleTransactions;
        }
        
        public BigDecimal getTotalCostOfGoodsSold() {
            if (costPrice == null || totalSold == null) return BigDecimal.ZERO;
            return costPrice.multiply(BigDecimal.valueOf(totalSold));
        }
    }
    
    // ========== ADDITIONAL COMPLEX JOINS FOR ENHANCED ANALYSIS ==========
    
    /**
     * Get comprehensive stock movement analysis with order and inventory correlation
     */
    @Transactional(readOnly = true)
    public List<ComprehensiveMovementAnalysis> getComprehensiveMovementAnalysis(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting comprehensive movement analysis for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(StockMovementSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    StockMovementSchema.PRODUCT_ID,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    ProductSchema.COST_PRICE,
                    ProductSchema.SELLING_PRICE,
                    StockMovementSchema.WAREHOUSE_LOCATION,
                    DSL.count().as("total_movements"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("INBOUND", "RETURN", "ADJUSTMENT"), 
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_inbound"),
                    DSL.sum(DSL.case_()
                        .when(StockMovementSchema.MOVEMENT_TYPE.in("OUTBOUND", "SALE", "ALLOCATION"), 
                              StockMovementSchema.QUANTITY)
                        .else_(0)).as("total_outbound"),
                    DSL.countDistinct(StockMovementSchema.REFERENCE_ID).as("unique_references"),
                    DSL.countDistinct(StockMovementSchema.USER_ID).as("unique_users"),
                    InventorySchema.QUANTITY_ON_HAND.as("current_on_hand"),
                    InventorySchema.QUANTITY_ALLOCATED.as("current_allocated"),
                    DSL.min(StockMovementSchema.CREATED_AT).as("first_movement"),
                    DSL.max(StockMovementSchema.CREATED_AT).as("last_movement")
                )
                .from(StockMovementSchema.STOCK_MOVEMENTS)
                .join(ProductSchema.PRODUCTS).on(StockMovementSchema.PRODUCT_ID.eq(ProductSchema.ID))
                .leftJoin(InventorySchema.INVENTORY)
                    .on(StockMovementSchema.PRODUCT_ID.eq(InventorySchema.PRODUCT_ID)
                        .and(StockMovementSchema.WAREHOUSE_LOCATION.eq(InventorySchema.WAREHOUSE_LOCATION)))
                .where(dateCondition.and(ProductSchema.ACTIVE.eq(true)))
                .groupBy(StockMovementSchema.PRODUCT_ID, ProductSchema.NAME, ProductSchema.SKU,
                        ProductSchema.COST_PRICE, ProductSchema.SELLING_PRICE, StockMovementSchema.WAREHOUSE_LOCATION,
                        InventorySchema.QUANTITY_ON_HAND, InventorySchema.QUANTITY_ALLOCATED)
                .orderBy(DSL.count().desc(), ProductSchema.NAME.asc())
                .fetch();
            
            List<ComprehensiveMovementAnalysis> analyses = records.stream()
                .map(record -> {
                    ComprehensiveMovementAnalysis analysis = new ComprehensiveMovementAnalysis();
                    analysis.setProductId(record.get(StockMovementSchema.PRODUCT_ID));
                    analysis.setProductName(record.get("product_name", String.class));
                    analysis.setProductSku(record.get("product_sku", String.class));
                    analysis.setCostPrice(record.get(ProductSchema.COST_PRICE));
                    analysis.setSellingPrice(record.get(ProductSchema.SELLING_PRICE));
                    analysis.setWarehouseLocation(record.get(StockMovementSchema.WAREHOUSE_LOCATION));
                    analysis.setTotalMovements(record.get("total_movements", Integer.class));
                    analysis.setTotalInbound(record.get("total_inbound", Integer.class));
                    analysis.setTotalOutbound(record.get("total_outbound", Integer.class));
                    analysis.setUniqueReferences(record.get("unique_references", Integer.class));
                    analysis.setUniqueUsers(record.get("unique_users", Integer.class));
                    analysis.setCurrentOnHand(record.get("current_on_hand", Integer.class));
                    analysis.setCurrentAllocated(record.get("current_allocated", Integer.class));
                    analysis.setFirstMovement(record.get("first_movement", LocalDateTime.class));
                    analysis.setLastMovement(record.get("last_movement", LocalDateTime.class));
                    return analysis;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated comprehensive movement analysis for {} products", analyses.size());
            return analyses;
        } catch (Exception e) {
            logger.error("Error getting comprehensive movement analysis", e);
            throw new RuntimeException("Failed to get comprehensive movement analysis", e);
        }
    }
    
    /**
     * Comprehensive movement analysis with inventory correlation
     */
    public static class ComprehensiveMovementAnalysis {
        private Long productId;
        private String productName;
        private String productSku;
        private BigDecimal costPrice;
        private BigDecimal sellingPrice;
        private String warehouseLocation;
        private Integer totalMovements;
        private Integer totalInbound;
        private Integer totalOutbound;
        private Integer uniqueReferences;
        private Integer uniqueUsers;
        private Integer currentOnHand;
        private Integer currentAllocated;
        private LocalDateTime firstMovement;
        private LocalDateTime lastMovement;
        
        // Getters and setters
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        
        public String getProductSku() { return productSku; }
        public void setProductSku(String productSku) { this.productSku = productSku; }
        
        public BigDecimal getCostPrice() { return costPrice; }
        public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }
        
        public BigDecimal getSellingPrice() { return sellingPrice; }
        public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }
        
        public String getWarehouseLocation() { return warehouseLocation; }
        public void setWarehouseLocation(String warehouseLocation) { this.warehouseLocation = warehouseLocation; }
        
        public Integer getTotalMovements() { return totalMovements; }
        public void setTotalMovements(Integer totalMovements) { this.totalMovements = totalMovements; }
        
        public Integer getTotalInbound() { return totalInbound; }
        public void setTotalInbound(Integer totalInbound) { this.totalInbound = totalInbound; }
        
        public Integer getTotalOutbound() { return totalOutbound; }
        public void setTotalOutbound(Integer totalOutbound) { this.totalOutbound = totalOutbound; }
        
        public Integer getUniqueReferences() { return uniqueReferences; }
        public void setUniqueReferences(Integer uniqueReferences) { this.uniqueReferences = uniqueReferences; }
        
        public Integer getUniqueUsers() { return uniqueUsers; }
        public void setUniqueUsers(Integer uniqueUsers) { this.uniqueUsers = uniqueUsers; }
        
        public Integer getCurrentOnHand() { return currentOnHand; }
        public void setCurrentOnHand(Integer currentOnHand) { this.currentOnHand = currentOnHand; }
        
        public Integer getCurrentAllocated() { return currentAllocated; }
        public void setCurrentAllocated(Integer currentAllocated) { this.currentAllocated = currentAllocated; }
        
        public LocalDateTime getFirstMovement() { return firstMovement; }
        public void setFirstMovement(LocalDateTime firstMovement) { this.firstMovement = firstMovement; }
        
        public LocalDateTime getLastMovement() { return lastMovement; }
        public void setLastMovement(LocalDateTime lastMovement) { this.lastMovement = lastMovement; }
        
        public Integer getNetMovement() {
            return (totalInbound != null ? totalInbound : 0) - (totalOutbound != null ? totalOutbound : 0);
        }
        
        public Integer getCurrentAvailable() {
            return (currentOnHand != null ? currentOnHand : 0) - (currentAllocated != null ? currentAllocated : 0);
        }
        
        public double getMovementVelocity() {
            if (firstMovement == null || lastMovement == null || totalMovements == null || totalMovements == 0) {
                return 0.0;
            }
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(firstMovement.toLocalDate(), lastMovement.toLocalDate());
            if (daysBetween == 0) return totalMovements.doubleValue();
            return totalMovements.doubleValue() / daysBetween;
        }
        
        public BigDecimal getEstimatedValue() {
            if (costPrice == null || currentOnHand == null) return BigDecimal.ZERO;
            return costPrice.multiply(BigDecimal.valueOf(currentOnHand));
        }
    }
}