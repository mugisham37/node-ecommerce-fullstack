package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.Supplier;
import com.ecommerce.inventory.entity.SupplierStatus;
import com.ecommerce.inventory.schema.ProductSchema;
import com.ecommerce.inventory.schema.SupplierSchema;
import com.ecommerce.inventory.schema.OrderSchema;
import com.ecommerce.inventory.schema.OrderItemSchema;
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
 * Repository for Supplier entity with performance tracking queries
 * Implements advanced supplier management operations using JOOQ
 */
@Repository
@Transactional
public class SupplierRepository extends AbstractBaseRepository<Supplier, Long> {
    
    private static final Logger logger = LoggerFactory.getLogger(SupplierRepository.class);
    
    @Override
    protected Supplier recordToEntity(Record record) {
        if (record == null) return null;
        
        Supplier supplier = new Supplier();
        supplier.setId(record.get(SupplierSchema.ID));
        supplier.setName(record.get(SupplierSchema.NAME));
        supplier.setContactPerson(record.get(SupplierSchema.CONTACT_PERSON));
        supplier.setEmail(record.get(SupplierSchema.EMAIL));
        supplier.setPhone(record.get(SupplierSchema.PHONE));
        supplier.setAddress(record.get(SupplierSchema.ADDRESS));
        supplier.setPaymentTerms(record.get(SupplierSchema.PAYMENT_TERMS));
        
        String statusStr = record.get(SupplierSchema.STATUS);
        if (statusStr != null) {
            supplier.setStatus(SupplierStatus.valueOf(statusStr));
        }
        
        // Set audit fields
        supplier.setCreatedAt(record.get(SupplierSchema.CREATED_AT));
        supplier.setUpdatedAt(record.get(SupplierSchema.UPDATED_AT));
        
        return supplier;
    }
    
    @Override
    protected Record entityToRecord(Supplier entity) {
        return dsl.newRecord(SupplierSchema.SUPPLIERS)
            .set(SupplierSchema.ID, entity.getId())
            .set(SupplierSchema.NAME, entity.getName())
            .set(SupplierSchema.CONTACT_PERSON, entity.getContactPerson())
            .set(SupplierSchema.EMAIL, entity.getEmail())
            .set(SupplierSchema.PHONE, entity.getPhone())
            .set(SupplierSchema.ADDRESS, entity.getAddress())
            .set(SupplierSchema.PAYMENT_TERMS, entity.getPaymentTerms())
            .set(SupplierSchema.STATUS, entity.getStatus() != null ? entity.getStatus().name() : SupplierStatus.ACTIVE.name())
            .set(SupplierSchema.UPDATED_AT, LocalDateTime.now());
    }
    
    @Override
    protected Class<Supplier> getEntityClass() {
        return Supplier.class;
    }
    
    @Override
    public Table<Record> getTable() {
        return SupplierSchema.SUPPLIERS;
    }
    
    @Override
    public TableField<Record, Long> getIdField() {
        return SupplierSchema.ID;
    }
    
    @Override
    protected Long getEntityId(Supplier entity) {
        return entity.getId();
    }
    
    @Override
    protected Condition getActiveCondition() {
        return SupplierSchema.STATUS.eq(SupplierStatus.ACTIVE.name());
    }
    
    // ========== SUPPLIER MANAGEMENT QUERIES ==========
    
    /**
     * Check if supplier exists by name
     */
    @Transactional(readOnly = true)
    public boolean existsByName(String name) {
        logger.debug("Checking if supplier exists by name: {}", name);
        
        try {
            Integer count = dsl.selectCount()
                .from(SupplierSchema.SUPPLIERS)
                .where(SupplierSchema.NAME.eq(name))
                .fetchOne(0, Integer.class);
            
            boolean exists = count != null && count > 0;
            logger.debug("Supplier exists by name {}: {}", name, exists);
            return exists;
        } catch (Exception e) {
            logger.error("Error checking if supplier exists by name: {}", name, e);
            throw new RuntimeException("Failed to check if supplier exists by name", e);
        }
    }
    
    /**
     * Find suppliers by status
     */
    @Transactional(readOnly = true)
    public List<Supplier> findByStatus(SupplierStatus status) {
        logger.debug("Finding suppliers by status: {}", status);
        
        try {
            Result<Record> records = dsl.select()
                .from(SupplierSchema.SUPPLIERS)
                .where(SupplierSchema.STATUS.eq(status.name()))
                .orderBy(SupplierSchema.NAME.asc())
                .fetch();
            
            List<Supplier> suppliers = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} suppliers with status {}", suppliers.size(), status);
            return suppliers;
        } catch (Exception e) {
            logger.error("Error finding suppliers by status: {}", status, e);
            throw new RuntimeException("Failed to find suppliers by status", e);
        }
    }
    
    /**
     * Find suppliers by status with pagination
     */
    @Transactional(readOnly = true)
    public Page<Supplier> findByStatus(SupplierStatus status, Pageable pageable) {
        logger.debug("Finding suppliers by status with pagination: {}", status);
        
        try {
            Condition condition = SupplierSchema.STATUS.eq(status.name());
            
            Integer totalCount = dsl.selectCount()
                .from(SupplierSchema.SUPPLIERS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(SupplierSchema.SUPPLIERS)
                .where(condition)
                .orderBy(SupplierSchema.NAME.asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Supplier> suppliers = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(suppliers, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding suppliers by status with pagination", e);
            throw new RuntimeException("Failed to find suppliers by status with pagination", e);
        }
    }
    
    /**
     * Search suppliers by name, contact person, or email
     */
    @Transactional(readOnly = true)
    public Page<Supplier> searchSuppliers(String searchTerm, Pageable pageable) {
        logger.debug("Searching suppliers with term: {}", searchTerm);
        
        try {
            String searchPattern = "%" + searchTerm.toLowerCase() + "%";
            
            Condition condition = SupplierSchema.NAME.likeIgnoreCase(searchPattern)
                .or(SupplierSchema.CONTACT_PERSON.likeIgnoreCase(searchPattern))
                .or(SupplierSchema.EMAIL.likeIgnoreCase(searchPattern));
            
            Integer totalCount = dsl.selectCount()
                .from(SupplierSchema.SUPPLIERS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(SupplierSchema.SUPPLIERS)
                .where(condition)
                .orderBy(SupplierSchema.NAME.asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Supplier> suppliers = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(suppliers, pageable, total);
        } catch (Exception e) {
            logger.error("Error searching suppliers", e);
            throw new RuntimeException("Failed to search suppliers", e);
        }
    }
    
    /**
     * Find suppliers by status
     */
    @Transactional(readOnly = true)
    public List<Supplier> findByStatus(SupplierStatus status) {
        logger.debug("Finding suppliers by status: {}", status);
        
        try {
            Result<Record> records = dsl.select()
                .from(SupplierSchema.SUPPLIERS)
                .where(SupplierSchema.STATUS.eq(status.name()))
                .orderBy(SupplierSchema.NAME.asc())
                .fetch();
            
            List<Supplier> suppliers = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} suppliers with status {}", suppliers.size(), status);
            return suppliers;
        } catch (Exception e) {
            logger.error("Error finding suppliers by status: {}", status, e);
            throw new RuntimeException("Failed to find suppliers by status", e);
        }
    }
    
    /**
     * Find active suppliers with pagination
     */
    @Transactional(readOnly = true)
    public Page<Supplier> findActiveSuppliers(Pageable pageable) {
        logger.debug("Finding active suppliers with pagination");
        
        try {
            Condition condition = SupplierSchema.STATUS.eq(SupplierStatus.ACTIVE.name());
            
            Integer totalCount = dsl.selectCount()
                .from(SupplierSchema.SUPPLIERS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(SupplierSchema.SUPPLIERS)
                .where(condition)
                .orderBy(SupplierSchema.NAME.asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Supplier> suppliers = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(suppliers, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding active suppliers", e);
            throw new RuntimeException("Failed to find active suppliers", e);
        }
    }
    
    /**
     * Search suppliers by name, contact person, or email
     */
    @Transactional(readOnly = true)
    public List<Supplier> searchSuppliers(String searchTerm) {
        logger.debug("Searching suppliers with term: {}", searchTerm);
        
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return findByStatus(SupplierStatus.ACTIVE);
        }
        
        try {
            String searchPattern = "%" + searchTerm.toLowerCase() + "%";
            
            Result<Record> records = dsl.select()
                .from(SupplierSchema.SUPPLIERS)
                .where(SupplierSchema.STATUS.eq(SupplierStatus.ACTIVE.name())
                    .and(DSL.lower(SupplierSchema.NAME).like(searchPattern)
                        .or(DSL.lower(SupplierSchema.CONTACT_PERSON).like(searchPattern))
                        .or(DSL.lower(SupplierSchema.EMAIL).like(searchPattern))))
                .orderBy(
                    // Prioritize exact matches in name
                    DSL.case_()
                        .when(DSL.lower(SupplierSchema.NAME).eq(searchTerm.toLowerCase()), 1)
                        .when(DSL.lower(SupplierSchema.NAME).like(searchTerm.toLowerCase() + "%"), 2)
                        .else_(3),
                    SupplierSchema.NAME.asc()
                )
                .fetch();
            
            List<Supplier> suppliers = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} suppliers matching search term", suppliers.size());
            return suppliers;
        } catch (Exception e) {
            logger.error("Error searching suppliers", e);
            throw new RuntimeException("Failed to search suppliers", e);
        }
    }
    
    /**
     * Find supplier by email
     */
    @Transactional(readOnly = true)
    public Optional<Supplier> findByEmail(String email) {
        logger.debug("Finding supplier by email: {}", email);
        
        try {
            Record record = dsl.select()
                .from(SupplierSchema.SUPPLIERS)
                .where(SupplierSchema.EMAIL.eq(email))
                .fetchOne();
            
            if (record != null) {
                Supplier supplier = recordToEntity(record);
                logger.debug("Found supplier by email: {}", email);
                return Optional.of(supplier);
            } else {
                logger.debug("Supplier not found by email: {}", email);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding supplier by email: {}", email, e);
            throw new RuntimeException("Failed to find supplier by email", e);
        }
    }
    
    // ========== SUPPLIER PERFORMANCE TRACKING ==========
    
    /**
     * Find suppliers with product counts
     */
    @Transactional(readOnly = true)
    public List<SupplierWithProductCount> findSuppliersWithProductCounts() {
        logger.debug("Finding suppliers with product counts");
        
        try {
            Result<Record> records = dsl.select(
                    SupplierSchema.ID,
                    SupplierSchema.NAME,
                    SupplierSchema.CONTACT_PERSON,
                    SupplierSchema.EMAIL,
                    SupplierSchema.PHONE,
                    SupplierSchema.ADDRESS,
                    SupplierSchema.PAYMENT_TERMS,
                    SupplierSchema.STATUS,
                    SupplierSchema.CREATED_AT,
                    SupplierSchema.UPDATED_AT,
                    DSL.count(ProductSchema.ID).as("product_count"),
                    DSL.countDistinct(DSL.case_()
                        .when(ProductSchema.ACTIVE.eq(true), ProductSchema.ID)
                        .else_(DSL.inline((Long) null))).as("active_product_count")
                )
                .from(SupplierSchema.SUPPLIERS)
                .leftJoin(ProductSchema.PRODUCTS).on(SupplierSchema.ID.eq(ProductSchema.SUPPLIER_ID))
                .where(SupplierSchema.STATUS.eq(SupplierStatus.ACTIVE.name()))
                .groupBy(SupplierSchema.ID, SupplierSchema.NAME, SupplierSchema.CONTACT_PERSON,
                        SupplierSchema.EMAIL, SupplierSchema.PHONE, SupplierSchema.ADDRESS,
                        SupplierSchema.PAYMENT_TERMS, SupplierSchema.STATUS,
                        SupplierSchema.CREATED_AT, SupplierSchema.UPDATED_AT)
                .orderBy(SupplierSchema.NAME.asc())
                .fetch();
            
            List<SupplierWithProductCount> suppliers = records.stream()
                .map(record -> {
                    Supplier supplier = recordToEntity(record);
                    Integer productCount = record.get("product_count", Integer.class);
                    Integer activeProductCount = record.get("active_product_count", Integer.class);
                    return new SupplierWithProductCount(supplier, 
                        productCount != null ? productCount : 0,
                        activeProductCount != null ? activeProductCount : 0);
                })
                .collect(Collectors.toList());
            
            logger.debug("Found {} suppliers with product counts", suppliers.size());
            return suppliers;
        } catch (Exception e) {
            logger.error("Error finding suppliers with product counts", e);
            throw new RuntimeException("Failed to find suppliers with product counts", e);
        }
    }
    
    /**
     * Find supplier performance metrics
     */
    @Transactional(readOnly = true)
    public List<SupplierPerformanceMetrics> findSupplierPerformanceMetrics() {
        logger.debug("Finding supplier performance metrics");
        
        try {
            Result<Record> records = dsl.select(
                    SupplierSchema.ID,
                    SupplierSchema.NAME,
                    SupplierSchema.STATUS,
                    DSL.count(ProductSchema.ID).as("total_products"),
                    DSL.countDistinct(DSL.case_()
                        .when(ProductSchema.ACTIVE.eq(true), ProductSchema.ID)
                        .else_(DSL.inline((Long) null))).as("active_products"),
                    DSL.count(OrderItemSchema.ID).as("total_orders"),
                    DSL.sum(OrderItemSchema.QUANTITY).as("total_quantity_sold"),
                    DSL.sum(OrderItemSchema.TOTAL_PRICE).as("total_revenue"),
                    DSL.avg(ProductSchema.SELLING_PRICE.minus(ProductSchema.COST_PRICE)).as("avg_profit_margin")
                )
                .from(SupplierSchema.SUPPLIERS)
                .leftJoin(ProductSchema.PRODUCTS).on(SupplierSchema.ID.eq(ProductSchema.SUPPLIER_ID))
                .leftJoin(OrderItemSchema.ORDER_ITEMS).on(ProductSchema.ID.eq(OrderItemSchema.PRODUCT_ID))
                .leftJoin(OrderSchema.ORDERS).on(OrderItemSchema.ORDER_ID.eq(OrderSchema.ID))
                .where(SupplierSchema.STATUS.eq(SupplierStatus.ACTIVE.name()))
                .groupBy(SupplierSchema.ID, SupplierSchema.NAME, SupplierSchema.STATUS)
                .orderBy(DSL.sum(OrderItemSchema.TOTAL_PRICE).desc().nullsLast(), SupplierSchema.NAME.asc())
                .fetch();
            
            List<SupplierPerformanceMetrics> metrics = records.stream()
                .map(record -> {
                    Long supplierId = record.get(SupplierSchema.ID);
                    String supplierName = record.get(SupplierSchema.NAME);
                    String status = record.get(SupplierSchema.STATUS);
                    Integer totalProducts = record.get("total_products", Integer.class);
                    Integer activeProducts = record.get("active_products", Integer.class);
                    Integer totalOrders = record.get("total_orders", Integer.class);
                    Integer totalQuantitySold = record.get("total_quantity_sold", Integer.class);
                    BigDecimal totalRevenue = record.get("total_revenue", BigDecimal.class);
                    BigDecimal avgProfitMargin = record.get("avg_profit_margin", BigDecimal.class);
                    
                    return new SupplierPerformanceMetrics(
                        supplierId, supplierName, status,
                        totalProducts != null ? totalProducts : 0,
                        activeProducts != null ? activeProducts : 0,
                        totalOrders != null ? totalOrders : 0,
                        totalQuantitySold != null ? totalQuantitySold : 0,
                        totalRevenue != null ? totalRevenue : BigDecimal.ZERO,
                        avgProfitMargin != null ? avgProfitMargin : BigDecimal.ZERO
                    );
                })
                .collect(Collectors.toList());
            
            logger.debug("Found performance metrics for {} suppliers", metrics.size());
            return metrics;
        } catch (Exception e) {
            logger.error("Error finding supplier performance metrics", e);
            throw new RuntimeException("Failed to find supplier performance metrics", e);
        }
    }
    
    /**
     * Find top performing suppliers by revenue
     */
    @Transactional(readOnly = true)
    public List<SupplierPerformanceMetrics> findTopPerformingSuppliers(int limit) {
        logger.debug("Finding top {} performing suppliers by revenue", limit);
        
        try {
            List<SupplierPerformanceMetrics> allMetrics = findSupplierPerformanceMetrics();
            
            return allMetrics.stream()
                .filter(metrics -> metrics.getTotalRevenue().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
                .limit(limit)
                .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error finding top performing suppliers", e);
            throw new RuntimeException("Failed to find top performing suppliers", e);
        }
    }
    
    /**
     * Find suppliers with low performance (no recent orders)
     */
    @Transactional(readOnly = true)
    public List<Supplier> findLowPerformanceSuppliers(int daysThreshold) {
        logger.debug("Finding suppliers with no orders in last {} days", daysThreshold);
        
        try {
            LocalDateTime thresholdDate = LocalDateTime.now().minusDays(daysThreshold);
            
            Result<Record> records = dsl.select()
                .from(SupplierSchema.SUPPLIERS)
                .where(SupplierSchema.STATUS.eq(SupplierStatus.ACTIVE.name())
                    .and(SupplierSchema.ID.notIn(
                        dsl.selectDistinct(ProductSchema.SUPPLIER_ID)
                            .from(ProductSchema.PRODUCTS)
                            .join(OrderItemSchema.ORDER_ITEMS).on(ProductSchema.ID.eq(OrderItemSchema.PRODUCT_ID))
                            .join(OrderSchema.ORDERS).on(OrderItemSchema.ORDER_ID.eq(OrderSchema.ID))
                            .where(OrderSchema.CREATED_AT.ge(thresholdDate))
                    )))
                .orderBy(SupplierSchema.NAME.asc())
                .fetch();
            
            List<Supplier> suppliers = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} suppliers with low performance", suppliers.size());
            return suppliers;
        } catch (Exception e) {
            logger.error("Error finding low performance suppliers", e);
            throw new RuntimeException("Failed to find low performance suppliers", e);
        }
    }
    
    /**
     * Update supplier status
     */
    @Transactional
    public void updateSupplierStatus(Long supplierId, SupplierStatus status) {
        logger.debug("Updating supplier status for ID {}: {}", supplierId, status);
        
        try {
            int updatedRows = dsl.update(SupplierSchema.SUPPLIERS)
                .set(SupplierSchema.STATUS, status.name())
                .set(SupplierSchema.UPDATED_AT, LocalDateTime.now())
                .where(SupplierSchema.ID.eq(supplierId))
                .execute();
            
            if (updatedRows == 0) {
                throw new RuntimeException("Supplier not found for status update: " + supplierId);
            }
            
            logger.debug("Successfully updated status for supplier ID: {}", supplierId);
        } catch (Exception e) {
            logger.error("Error updating supplier status", e);
            throw new RuntimeException("Failed to update supplier status", e);
        }
    }
    
    /**
     * Check if email exists
     */
    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        logger.debug("Checking if supplier email exists: {}", email);
        
        try {
            Integer count = dsl.selectCount()
                .from(SupplierSchema.SUPPLIERS)
                .where(SupplierSchema.EMAIL.eq(email))
                .fetchOne(0, Integer.class);
            
            boolean exists = count != null && count > 0;
            logger.debug("Supplier email {} exists: {}", email, exists);
            return exists;
        } catch (Exception e) {
            logger.error("Error checking supplier email existence", e);
            throw new RuntimeException("Failed to check supplier email existence", e);
        }
    }
    
    // ========== HELPER CLASSES ==========
    
    /**
     * Supplier with product count information
     */
    public static class SupplierWithProductCount {
        private Supplier supplier;
        private Integer totalProductCount;
        private Integer activeProductCount;
        
        public SupplierWithProductCount(Supplier supplier, Integer totalProductCount, Integer activeProductCount) {
            this.supplier = supplier;
            this.totalProductCount = totalProductCount;
            this.activeProductCount = activeProductCount;
        }
        
        public Supplier getSupplier() { return supplier; }
        public Integer getTotalProductCount() { return totalProductCount; }
        public Integer getActiveProductCount() { return activeProductCount; }
    }
    
    /**
     * Supplier performance metrics
     */
    public static class SupplierPerformanceMetrics {
        private Long supplierId;
        private String supplierName;
        private String status;
        private Integer totalProducts;
        private Integer activeProducts;
        private Integer totalOrders;
        private Integer totalQuantitySold;
        private BigDecimal totalRevenue;
        private BigDecimal avgProfitMargin;
        
        public SupplierPerformanceMetrics(Long supplierId, String supplierName, String status,
                                        Integer totalProducts, Integer activeProducts, Integer totalOrders,
                                        Integer totalQuantitySold, BigDecimal totalRevenue, BigDecimal avgProfitMargin) {
            this.supplierId = supplierId;
            this.supplierName = supplierName;
            this.status = status;
            this.totalProducts = totalProducts;
            this.activeProducts = activeProducts;
            this.totalOrders = totalOrders;
            this.totalQuantitySold = totalQuantitySold;
            this.totalRevenue = totalRevenue;
            this.avgProfitMargin = avgProfitMargin;
        }
        
        // Getters
        public Long getSupplierId() { return supplierId; }
        public String getSupplierName() { return supplierName; }
        public String getStatus() { return status; }
        public Integer getTotalProducts() { return totalProducts; }
        public Integer getActiveProducts() { return activeProducts; }
        public Integer getTotalOrders() { return totalOrders; }
        public Integer getTotalQuantitySold() { return totalQuantitySold; }
        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public BigDecimal getAvgProfitMargin() { return avgProfitMargin; }
        
        public double getPerformanceScore() {
            // Simple performance score calculation
            double revenueScore = totalRevenue.doubleValue() / 1000.0; // Normalize revenue
            double orderScore = totalOrders * 10.0; // Weight orders
            double productScore = activeProducts * 5.0; // Weight active products
            return revenueScore + orderScore + productScore;
        }
    }
}