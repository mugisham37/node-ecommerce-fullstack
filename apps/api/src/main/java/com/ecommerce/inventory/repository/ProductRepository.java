package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.Product;
import com.ecommerce.inventory.schema.CategorySchema;
import com.ecommerce.inventory.schema.InventorySchema;
import com.ecommerce.inventory.schema.ProductSchema;
import com.ecommerce.inventory.schema.SupplierSchema;
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
 * Repository for Product entity with complex queries and search functionality
 * Implements advanced product management operations using JOOQ
 */
@Repository
@Transactional
public class ProductRepository extends AbstractBaseRepository<Product, Long> {
    
    private static final Logger logger = LoggerFactory.getLogger(ProductRepository.class);
    
    @Override
    protected Product recordToEntity(Record record) {
        if (record == null) return null;
        
        Product product = new Product();
        product.setId(record.get(ProductSchema.ID));
        product.setName(record.get(ProductSchema.NAME));
        product.setSlug(record.get(ProductSchema.SLUG));
        product.setSku(record.get(ProductSchema.SKU));
        product.setDescription(record.get(ProductSchema.DESCRIPTION));
        product.setCostPrice(record.get(ProductSchema.COST_PRICE));
        product.setSellingPrice(record.get(ProductSchema.SELLING_PRICE));
        product.setReorderLevel(record.get(ProductSchema.REORDER_LEVEL));
        product.setReorderQuantity(record.get(ProductSchema.REORDER_QUANTITY));
        product.setActive(record.get(ProductSchema.ACTIVE));
        
        // Set audit fields
        product.setCreatedAt(record.get(ProductSchema.CREATED_AT));
        product.setUpdatedAt(record.get(ProductSchema.UPDATED_AT));
        
        return product;
    }
    
    @Override
    protected Record entityToRecord(Product entity) {
        return dsl.newRecord(ProductSchema.PRODUCTS)
            .set(ProductSchema.ID, entity.getId())
            .set(ProductSchema.NAME, entity.getName())
            .set(ProductSchema.SLUG, entity.getSlug())
            .set(ProductSchema.SKU, entity.getSku())
            .set(ProductSchema.DESCRIPTION, entity.getDescription())
            .set(ProductSchema.CATEGORY_ID, entity.getCategory() != null ? entity.getCategory().getId() : null)
            .set(ProductSchema.SUPPLIER_ID, entity.getSupplier() != null ? entity.getSupplier().getId() : null)
            .set(ProductSchema.COST_PRICE, entity.getCostPrice())
            .set(ProductSchema.SELLING_PRICE, entity.getSellingPrice())
            .set(ProductSchema.REORDER_LEVEL, entity.getReorderLevel())
            .set(ProductSchema.REORDER_QUANTITY, entity.getReorderQuantity())
            .set(ProductSchema.ACTIVE, entity.getActive())
            .set(ProductSchema.UPDATED_AT, LocalDateTime.now());
    }
    
    @Override
    protected Class<Product> getEntityClass() {
        return Product.class;
    }
    
    @Override
    public Table<Record> getTable() {
        return ProductSchema.PRODUCTS;
    }
    
    @Override
    public TableField<Record, Long> getIdField() {
        return ProductSchema.ID;
    }
    
    @Override
    protected Long getEntityId(Product entity) {
        return entity.getId();
    }
    
    @Override
    protected Condition getActiveCondition() {
        return ProductSchema.ACTIVE.eq(true);
    }
    
    // ========== COMPLEX PRODUCT QUERIES ==========
    
    /**
     * Find active products with category and supplier information
     */
    @Transactional(readOnly = true)
    public List<Product> findActiveProductsWithCategory() {
        logger.debug("Finding active products with category information");
        
        try {
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .join(CategorySchema.CATEGORIES).on(ProductSchema.CATEGORY_ID.eq(CategorySchema.ID))
                .join(SupplierSchema.SUPPLIERS).on(ProductSchema.SUPPLIER_ID.eq(SupplierSchema.ID))
                .where(ProductSchema.ACTIVE.eq(true)
                    .and(CategorySchema.ACTIVE.eq(true))
                    .and(SupplierSchema.STATUS.eq("ACTIVE")))
                .orderBy(ProductSchema.NAME.asc())
                .fetch();
            
            return records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error finding active products with category", e);
            throw new RuntimeException("Failed to find active products with category", e);
        }
    }
    
    /**
     * Find products with filters and pagination
     */
    @Transactional(readOnly = true)
    public Page<Product> findProductsWithFilters(ProductFilter filter, Pageable pageable) {
        logger.debug("Finding products with filters: {}", filter);
        
        try {
            SelectConditionStep<Record> baseQuery = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .leftJoin(CategorySchema.CATEGORIES).on(ProductSchema.CATEGORY_ID.eq(CategorySchema.ID))
                .leftJoin(SupplierSchema.SUPPLIERS).on(ProductSchema.SUPPLIER_ID.eq(SupplierSchema.ID))
                .where(DSL.trueCondition());
            
            // Apply filters
            Condition condition = buildFilterCondition(filter);
            baseQuery = baseQuery.and(condition);
            
            // Get total count
            Integer totalCount = dsl.selectCount()
                .from(ProductSchema.PRODUCTS)
                .leftJoin(CategorySchema.CATEGORIES).on(ProductSchema.CATEGORY_ID.eq(CategorySchema.ID))
                .leftJoin(SupplierSchema.SUPPLIERS).on(ProductSchema.SUPPLIER_ID.eq(SupplierSchema.ID))
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            // Get paginated results
            Result<Record> records = baseQuery
                .orderBy(ProductSchema.NAME.asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(products, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding products with filters", e);
            throw new RuntimeException("Failed to find products with filters", e);
        }
    }
    
    /**
     * Full-text search products by name and description
     */
    @Transactional(readOnly = true)
    public List<Product> searchProducts(String searchTerm) {
        logger.debug("Searching products with term: {}", searchTerm);
        
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return findAllActive();
        }
        
        try {
            String searchPattern = "%" + searchTerm.toLowerCase() + "%";
            
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(ProductSchema.ACTIVE.eq(true)
                    .and(DSL.lower(ProductSchema.NAME).like(searchPattern)
                        .or(DSL.lower(ProductSchema.DESCRIPTION).like(searchPattern))
                        .or(DSL.lower(ProductSchema.SKU).like(searchPattern))))
                .orderBy(
                    // Prioritize exact matches in name
                    DSL.case_()
                        .when(DSL.lower(ProductSchema.NAME).eq(searchTerm.toLowerCase()), 1)
                        .when(DSL.lower(ProductSchema.NAME).like(searchTerm.toLowerCase() + "%"), 2)
                        .when(DSL.lower(ProductSchema.SKU).eq(searchTerm.toLowerCase()), 3)
                        .else_(4),
                    ProductSchema.NAME.asc()
                )
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} products matching search term", products.size());
            return products;
        } catch (Exception e) {
            logger.error("Error searching products", e);
            throw new RuntimeException("Failed to search products", e);
        }
    }
    
    /**
     * Find product by SKU with inventory information
     */
    @Transactional(readOnly = true)
    public Optional<Product> findBySkuWithInventory(String sku) {
        logger.debug("Finding product by SKU with inventory: {}", sku);
        
        try {
            Record record = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .leftJoin(InventorySchema.INVENTORY).on(ProductSchema.ID.eq(InventorySchema.PRODUCT_ID))
                .where(ProductSchema.SKU.eq(sku))
                .fetchOne();
            
            if (record != null) {
                Product product = recordToEntity(record);
                logger.debug("Found product by SKU: {}", sku);
                return Optional.of(product);
            } else {
                logger.debug("Product not found by SKU: {}", sku);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding product by SKU: {}", sku, e);
            throw new RuntimeException("Failed to find product by SKU", e);
        }
    }
    
    /**
     * Find products with low stock levels
     */
    @Transactional(readOnly = true)
    public List<Product> findLowStockProducts() {
        logger.debug("Finding products with low stock levels");
        
        try {
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .join(InventorySchema.INVENTORY).on(ProductSchema.ID.eq(InventorySchema.PRODUCT_ID))
                .where(ProductSchema.ACTIVE.eq(true)
                    .and(InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED)
                        .le(ProductSchema.REORDER_LEVEL)))
                .orderBy(
                    InventorySchema.QUANTITY_ON_HAND.minus(InventorySchema.QUANTITY_ALLOCATED).asc(),
                    ProductSchema.NAME.asc()
                )
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} products with low stock", products.size());
            return products;
        } catch (Exception e) {
            logger.error("Error finding low stock products", e);
            throw new RuntimeException("Failed to find low stock products", e);
        }
    }
    
    /**
     * Find products by category with pagination
     */
    @Transactional(readOnly = true)
    public Page<Product> findByCategory(Long categoryId, Pageable pageable) {
        logger.debug("Finding products by category: {}", categoryId);
        
        try {
            Condition condition = ProductSchema.CATEGORY_ID.eq(categoryId)
                .and(ProductSchema.ACTIVE.eq(true));
            
            Integer totalCount = dsl.selectCount()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .orderBy(ProductSchema.NAME.asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(products, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding products by category", e);
            throw new RuntimeException("Failed to find products by category", e);
        }
    }
    
    /**
     * Find products by supplier with pagination
     */
    @Transactional(readOnly = true)
    public Page<Product> findBySupplier(Long supplierId, Pageable pageable) {
        logger.debug("Finding products by supplier: {}", supplierId);
        
        try {
            Condition condition = ProductSchema.SUPPLIER_ID.eq(supplierId)
                .and(ProductSchema.ACTIVE.eq(true));
            
            Integer totalCount = dsl.selectCount()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .orderBy(ProductSchema.NAME.asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(products, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding products by supplier", e);
            throw new RuntimeException("Failed to find products by supplier", e);
        }
    }
    
    /**
     * Update product pricing
     */
    @Transactional
    public void updateProductPricing(Long productId, BigDecimal costPrice, BigDecimal sellingPrice) {
        logger.debug("Updating product pricing for ID: {}", productId);
        
        try {
            int updatedRows = dsl.update(ProductSchema.PRODUCTS)
                .set(ProductSchema.COST_PRICE, costPrice)
                .set(ProductSchema.SELLING_PRICE, sellingPrice)
                .set(ProductSchema.UPDATED_AT, LocalDateTime.now())
                .where(ProductSchema.ID.eq(productId))
                .execute();
            
            if (updatedRows == 0) {
                throw new RuntimeException("Product not found for pricing update: " + productId);
            }
            
            logger.debug("Successfully updated pricing for product ID: {}", productId);
        } catch (Exception e) {
            logger.error("Error updating product pricing", e);
            throw new RuntimeException("Failed to update product pricing", e);
        }
    }
    
    /**
     * Find products by price range
     */
    @Transactional(readOnly = true)
    public List<Product> findByPriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        logger.debug("Finding products by price range: {} - {}", minPrice, maxPrice);
        
        try {
            Condition condition = ProductSchema.ACTIVE.eq(true);
            
            if (minPrice != null) {
                condition = condition.and(ProductSchema.SELLING_PRICE.ge(minPrice));
            }
            if (maxPrice != null) {
                condition = condition.and(ProductSchema.SELLING_PRICE.le(maxPrice));
            }
            
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .orderBy(ProductSchema.SELLING_PRICE.asc(), ProductSchema.NAME.asc())
                .fetch();
            
            return records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error finding products by price range", e);
            throw new RuntimeException("Failed to find products by price range", e);
        }
    }
    
    /**
     * Check if SKU exists
     */
    @Transactional(readOnly = true)
    public boolean existsBySku(String sku) {
        logger.debug("Checking if SKU exists: {}", sku);
        
        try {
            Integer count = dsl.selectCount()
                .from(ProductSchema.PRODUCTS)
                .where(ProductSchema.SKU.eq(sku))
                .fetchOne(0, Integer.class);
            
            boolean exists = count != null && count > 0;
            logger.debug("SKU {} exists: {}", sku, exists);
            return exists;
        } catch (Exception e) {
            logger.error("Error checking SKU existence", e);
            throw new RuntimeException("Failed to check SKU existence", e);
        }
    }
    
    /**
     * Check if slug exists
     */
    @Transactional(readOnly = true)
    public boolean existsBySlug(String slug) {
        logger.debug("Checking if slug exists: {}", slug);
        
        try {
            Integer count = dsl.selectCount()
                .from(ProductSchema.PRODUCTS)
                .where(ProductSchema.SLUG.eq(slug))
                .fetchOne(0, Integer.class);
            
            boolean exists = count != null && count > 0;
            logger.debug("Slug {} exists: {}", slug, exists);
            return exists;
        } catch (Exception e) {
            logger.error("Error checking slug existence", e);
            throw new RuntimeException("Failed to check slug existence", e);
        }
    }

    /**
     * Find product by SKU and active status
     */
    @Transactional(readOnly = true)
    public Optional<Product> findBySkuAndActiveTrue(String sku) {
        logger.debug("Finding active product by SKU: {}", sku);
        
        try {
            Record record = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(ProductSchema.SKU.eq(sku).and(ProductSchema.ACTIVE.eq(true)))
                .fetchOne();
            
            if (record != null) {
                Product product = recordToEntity(record);
                logger.debug("Found active product by SKU: {}", sku);
                return Optional.of(product);
            } else {
                logger.debug("Active product not found by SKU: {}", sku);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding active product by SKU: {}", sku, e);
            throw new RuntimeException("Failed to find active product by SKU", e);
        }
    }

    /**
     * Find product by SKU
     */
    @Transactional(readOnly = true)
    public Optional<Product> findBySku(String sku) {
        logger.debug("Finding product by SKU: {}", sku);
        
        try {
            Record record = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(ProductSchema.SKU.eq(sku))
                .fetchOne();
            
            if (record != null) {
                Product product = recordToEntity(record);
                logger.debug("Found product by SKU: {}", sku);
                return Optional.of(product);
            } else {
                logger.debug("Product not found by SKU: {}", sku);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding product by SKU: {}", sku, e);
            throw new RuntimeException("Failed to find product by SKU", e);
        }
    }

    /**
     * Find active products
     */
    @Transactional(readOnly = true)
    public List<Product> findActiveProducts() {
        logger.debug("Finding all active products");
        
        try {
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(ProductSchema.ACTIVE.eq(true))
                .orderBy(ProductSchema.NAME.asc())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} active products", products.size());
            return products;
        } catch (Exception e) {
            logger.error("Error finding active products", e);
            throw new RuntimeException("Failed to find active products", e);
        }
    }

    /**
     * Find products by category ID
     */
    @Transactional(readOnly = true)
    public List<Product> findByCategoryId(Long categoryId) {
        logger.debug("Finding products by category ID: {}", categoryId);
        
        try {
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(ProductSchema.CATEGORY_ID.eq(categoryId))
                .orderBy(ProductSchema.NAME.asc())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} products for category ID: {}", products.size(), categoryId);
            return products;
        } catch (Exception e) {
            logger.error("Error finding products by category ID", e);
            throw new RuntimeException("Failed to find products by category ID", e);
        }
    }

    /**
     * Find products by category ID and active status with pagination
     */
    @Transactional(readOnly = true)
    public Page<Product> findByCategoryIdAndActiveTrue(Long categoryId, Pageable pageable) {
        logger.debug("Finding active products by category ID: {} with pagination", categoryId);
        
        try {
            Condition condition = ProductSchema.CATEGORY_ID.eq(categoryId)
                .and(ProductSchema.ACTIVE.eq(true));
            
            Integer totalCount = dsl.selectCount()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .orderBy(ProductSchema.NAME.asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(products, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding active products by category ID", e);
            throw new RuntimeException("Failed to find active products by category ID", e);
        }
    }

    /**
     * Find products by supplier ID and active status with pagination
     */
    @Transactional(readOnly = true)
    public Page<Product> findBySupplierIdAndActiveTrue(Long supplierId, Pageable pageable) {
        logger.debug("Finding active products by supplier ID: {} with pagination", supplierId);
        
        try {
            Condition condition = ProductSchema.SUPPLIER_ID.eq(supplierId)
                .and(ProductSchema.ACTIVE.eq(true));
            
            Integer totalCount = dsl.selectCount()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .orderBy(ProductSchema.NAME.asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(products, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding active products by supplier ID", e);
            throw new RuntimeException("Failed to find active products by supplier ID", e);
        }
    }

    /**
     * Search products with pagination
     */
    @Transactional(readOnly = true)
    public Page<Product> searchProducts(String searchTerm, Pageable pageable) {
        logger.debug("Searching products with term: {} and pagination", searchTerm);
        
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return findByActiveTrue(pageable);
        }
        
        try {
            String searchPattern = "%" + searchTerm.toLowerCase() + "%";
            
            Condition condition = ProductSchema.ACTIVE.eq(true)
                .and(DSL.lower(ProductSchema.NAME).like(searchPattern)
                    .or(DSL.lower(ProductSchema.DESCRIPTION).like(searchPattern))
                    .or(DSL.lower(ProductSchema.SKU).like(searchPattern)));
            
            Integer totalCount = dsl.selectCount()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(condition)
                .orderBy(
                    // Prioritize exact matches in name
                    DSL.case_()
                        .when(DSL.lower(ProductSchema.NAME).eq(searchTerm.toLowerCase()), 1)
                        .when(DSL.lower(ProductSchema.NAME).like(searchTerm.toLowerCase() + "%"), 2)
                        .when(DSL.lower(ProductSchema.SKU).eq(searchTerm.toLowerCase()), 3)
                        .else_(4),
                    ProductSchema.NAME.asc()
                )
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} products matching search term with pagination", products.size());
            return new PageImpl<>(products, pageable, total);
        } catch (Exception e) {
            logger.error("Error searching products with pagination", e);
            throw new RuntimeException("Failed to search products with pagination", e);
        }
    }
    
    // ========== HELPER METHODS ==========
    
    private Condition buildFilterCondition(ProductFilter filter) {
        Condition condition = DSL.trueCondition();
        
        if (filter == null) {
            return condition;
        }
        
        if (filter.getActive() != null) {
            condition = condition.and(ProductSchema.ACTIVE.eq(filter.getActive()));
        }
        
        if (filter.getCategoryId() != null) {
            condition = condition.and(ProductSchema.CATEGORY_ID.eq(filter.getCategoryId()));
        }
        
        if (filter.getSupplierId() != null) {
            condition = condition.and(ProductSchema.SUPPLIER_ID.eq(filter.getSupplierId()));
        }
        
        if (filter.getMinPrice() != null) {
            condition = condition.and(ProductSchema.SELLING_PRICE.ge(filter.getMinPrice()));
        }
        
        if (filter.getMaxPrice() != null) {
            condition = condition.and(ProductSchema.SELLING_PRICE.le(filter.getMaxPrice()));
        }
        
        if (filter.getSearchTerm() != null && !filter.getSearchTerm().trim().isEmpty()) {
            String searchPattern = "%" + filter.getSearchTerm().toLowerCase() + "%";
            condition = condition.and(
                DSL.lower(ProductSchema.NAME).like(searchPattern)
                    .or(DSL.lower(ProductSchema.DESCRIPTION).like(searchPattern))
                    .or(DSL.lower(ProductSchema.SKU).like(searchPattern))
            );
        }
        
        return condition;
    }
    
    /**
     * Product filter class for complex queries
     */
    public static class ProductFilter {
        private Boolean active;
        private Long categoryId;
        private Long supplierId;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private String searchTerm;
        
        // Getters and setters
        public Boolean getActive() { return active; }
        public void setActive(Boolean active) { this.active = active; }
        
        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
        
        public Long getSupplierId() { return supplierId; }
        public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }
        
        public BigDecimal getMinPrice() { return minPrice; }
        public void setMinPrice(BigDecimal minPrice) { this.minPrice = minPrice; }
        
        public BigDecimal getMaxPrice() { return maxPrice; }
        public void setMaxPrice(BigDecimal maxPrice) { this.maxPrice = maxPrice; }
        
        public String getSearchTerm() { return searchTerm; }
        public void setSearchTerm(String searchTerm) { this.searchTerm = searchTerm; }
        
        @Override
        public String toString() {
            return "ProductFilter{" +
                    "active=" + active +
                    ", categoryId=" + categoryId +
                    ", supplierId=" + supplierId +
                    ", minPrice=" + minPrice +
                    ", maxPrice=" + maxPrice +
                    ", searchTerm='" + searchTerm + '\'' +
                    '}';
        }
    }

    // ========== METRICS SUPPORT METHODS ==========

    /**
     * Find all active products for metrics
     */
    @Transactional(readOnly = true)
    public List<Product> findActiveProducts() {
        logger.debug("Finding all active products");
        
        try {
            Result<Record> records = dsl.select()
                .from(ProductSchema.PRODUCTS)
                .where(ProductSchema.ACTIVE.eq(true))
                .orderBy(ProductSchema.NAME.asc())
                .fetch();
            
            List<Product> products = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} active products", products.size());
            return products;
        } catch (Exception e) {
            logger.error("Error finding active products", e);
            throw new RuntimeException("Failed to find active products", e);
        }
    }

    /**
     * Find all active products for metrics (alias method)
     */
    @Transactional(readOnly = true)
    public List<Product> findAllActiveProducts() {
        return findActiveProducts();
    }
}