package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.ProductCreateRequest;
import com.ecommerce.inventory.dto.request.ProductUpdateRequest;
import com.ecommerce.inventory.dto.response.ProductResponse;
import com.ecommerce.inventory.entity.Product;
import com.ecommerce.inventory.entity.Category;
import com.ecommerce.inventory.entity.Supplier;
import com.ecommerce.inventory.exception.ResourceNotFoundException;
import com.ecommerce.inventory.repository.ProductRepository;
import com.ecommerce.inventory.repository.CategoryRepository;
import com.ecommerce.inventory.repository.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Product Management Service with comprehensive caching integration
 * Handles product CRUD operations, search functionality, and business logic
 */
@Service
@Transactional
public class ProductService {

    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private CacheService cacheService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    /**
     * Create a new product with cache warming
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"products", "search"}, allEntries = true)
    public ProductResponse createProduct(ProductCreateRequest request) {
        logger.info("Creating new product with SKU: {}", request.getSku());

        // Validate category exists
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));

        // Validate supplier exists
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + request.getSupplierId()));

        // Check if SKU already exists
        if (productRepository.existsBySku(request.getSku())) {
            throw new IllegalArgumentException("Product with SKU " + request.getSku() + " already exists");
        }

        // Create product
        Product product = new Product();
        product.setName(request.getName());
        product.setSku(request.getSku());
        product.setSlug(generateSlug(request.getName()));
        product.setDescription(request.getDescription());
        product.setCategory(category);
        product.setSupplier(supplier);
        product.setCostPrice(request.getCostPrice());
        product.setSellingPrice(request.getSellingPrice());
        product.setReorderLevel(request.getReorderLevel());
        product.setReorderQuantity(request.getReorderQuantity());
        product.setActive(true);

        Product savedProduct = productRepository.save(product);
        
        // Warm cache with new product
        cacheService.put("products", "product:" + savedProduct.getId(), savedProduct);
        cacheService.put("products", "sku:" + savedProduct.getSku(), savedProduct);

        // Invalidate related caches
        cacheService.invalidateRelatedCaches("product", savedProduct.getId());

        logger.info("Successfully created product with ID: {}", savedProduct.getId());
        return convertToProductResponse(savedProduct);
    }

    /**
     * Update product with intelligent cache invalidation
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "products", key = "'product:' + #id"),
        @CacheEvict(value = "products", key = "'sku:' + @productRepository.findById(#id).orElse(new com.ecommerce.inventory.entity.Product()).getSku()"),
        @CacheEvict(value = "search", allEntries = true)
    })
    public ProductResponse updateProduct(Long id, ProductUpdateRequest request) {
        logger.info("Updating product with ID: {}", id);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        // Update fields if provided
        if (request.getName() != null) {
            product.setName(request.getName());
            product.setSlug(generateSlug(request.getName()));
        }
        if (request.getDescription() != null) {
            product.setDescription(request.getDescription());
        }
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));
            product.setCategory(category);
        }
        if (request.getSupplierId() != null) {
            Supplier supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + request.getSupplierId()));
            product.setSupplier(supplier);
        }
        if (request.getCostPrice() != null) {
            product.setCostPrice(request.getCostPrice());
        }
        if (request.getSellingPrice() != null) {
            product.setSellingPrice(request.getSellingPrice());
        }
        if (request.getReorderLevel() != null) {
            product.setReorderLevel(request.getReorderLevel());
        }
        if (request.getReorderQuantity() != null) {
            product.setReorderQuantity(request.getReorderQuantity());
        }

        Product updatedProduct = productRepository.save(product);

        // Update cache with new data
        cacheService.put("products", "product:" + updatedProduct.getId(), updatedProduct);
        cacheService.put("products", "sku:" + updatedProduct.getSku(), updatedProduct);

        // Invalidate related caches
        cacheService.invalidateRelatedCaches("product", updatedProduct.getId());

        logger.info("Successfully updated product with ID: {}", updatedProduct.getId());
        return convertToProductResponse(updatedProduct);
    }

    /**
     * Get product by ID with caching
     */
    @Cacheable(value = "products", key = "'product:' + #id")
    public ProductResponse getProductById(Long id) {
        logger.debug("Fetching product with ID: {}", id);
        
        Product product = productRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        return convertToProductResponse(product);
    }

    /**
     * Get product by SKU with caching
     */
    @Cacheable(value = "products", key = "'sku:' + #sku")
    public ProductResponse getProductBySku(String sku) {
        logger.debug("Fetching product with SKU: {}", sku);
        
        Product product = productRepository.findBySkuAndActiveTrue(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with SKU: " + sku));

        return convertToProductResponse(product);
    }

    /**
     * Get all active products with caching
     */
    @Cacheable(value = "products", key = "'active-products:' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<ProductResponse> getAllActiveProducts(Pageable pageable) {
        logger.debug("Fetching active products, page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        
        Page<Product> products = productRepository.findByActiveTrue(pageable);
        return products.map(this::convertToProductResponse);
    }

    /**
     * Search products with caching
     */
    @Cacheable(value = "search", key = "'products:' + #searchTerm + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<ProductResponse> searchProducts(String searchTerm, Pageable pageable) {
        logger.debug("Searching products with term: {}", searchTerm);
        
        Page<Product> products = productRepository.searchProducts(searchTerm, pageable);
        return products.map(this::convertToProductResponse);
    }

    /**
     * Get products by category with caching
     */
    @Cacheable(value = "products", key = "'category:' + #categoryId + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<ProductResponse> getProductsByCategory(Long categoryId, Pageable pageable) {
        logger.debug("Fetching products for category ID: {}", categoryId);
        
        // Verify category exists
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        Page<Product> products = productRepository.findByCategoryIdAndActiveTrue(categoryId, pageable);
        return products.map(this::convertToProductResponse);
    }

    /**
     * Get products by supplier with caching
     */
    @Cacheable(value = "products", key = "'supplier:' + #supplierId + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<ProductResponse> getProductsBySupplier(Long supplierId, Pageable pageable) {
        logger.debug("Fetching products for supplier ID: {}", supplierId);
        
        // Verify supplier exists
        supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + supplierId));

        Page<Product> products = productRepository.findBySupplierIdAndActiveTrue(supplierId, pageable);
        return products.map(this::convertToProductResponse);
    }

    /**
     * Get low stock products with caching (shorter TTL)
     */
    @Cacheable(value = "inventory", key = "'low-stock-products'")
    public List<ProductResponse> getLowStockProducts() {
        logger.debug("Fetching low stock products");
        
        List<Product> products = productRepository.findLowStockProducts();
        return products.stream()
                .map(this::convertToProductResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update product pricing with cache invalidation
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "products", key = "'product:' + #id"),
        @CacheEvict(value = "products", allEntries = true)
    })
    public void updateProductPricing(Long id, BigDecimal costPrice, BigDecimal sellingPrice) {
        logger.info("Updating pricing for product ID: {}", id);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        product.setCostPrice(costPrice);
        product.setSellingPrice(sellingPrice);
        
        Product updatedProduct = productRepository.save(product);

        // Update cache
        cacheService.put("products", "product:" + updatedProduct.getId(), updatedProduct);
        cacheService.put("products", "sku:" + updatedProduct.getSku(), updatedProduct);

        logger.info("Successfully updated pricing for product ID: {}", id);
    }

    /**
     * Deactivate product with cache eviction
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "products", key = "'product:' + #id"),
        @CacheEvict(value = "products", allEntries = true),
        @CacheEvict(value = "search", allEntries = true)
    })
    public void deactivateProduct(Long id) {
        logger.info("Deactivating product with ID: {}", id);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        product.setActive(false);
        productRepository.save(product);

        // Remove from cache
        cacheService.evict("products", "product:" + id);
        cacheService.evict("products", "sku:" + product.getSku());

        // Invalidate related caches
        cacheService.invalidateRelatedCaches("product", id);

        logger.info("Successfully deactivated product with ID: {}", id);
    }

    /**
     * Activate product with cache warming
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"products", "search"}, allEntries = true)
    public void activateProduct(Long id) {
        logger.info("Activating product with ID: {}", id);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        product.setActive(true);
        Product activatedProduct = productRepository.save(product);

        // Warm cache
        cacheService.put("products", "product:" + activatedProduct.getId(), activatedProduct);
        cacheService.put("products", "sku:" + activatedProduct.getSku(), activatedProduct);

        logger.info("Successfully activated product with ID: {}", id);
    }

    /**
     * Convert Product entity to ProductResponse DTO
     */
    private ProductResponse convertToProductResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .sku(product.getSku())
                .description(product.getDescription())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .supplierId(product.getSupplier().getId())
                .supplierName(product.getSupplier().getName())
                .costPrice(product.getCostPrice())
                .sellingPrice(product.getSellingPrice())
                .profitMargin(product.calculateProfitMargin())
                .reorderLevel(product.getReorderLevel())
                .reorderQuantity(product.getReorderQuantity())
                .active(product.getActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    /**
     * Get all products with filtering
     */
    public Page<ProductResponse> getAllProducts(String name, String sku, Long categoryId, Long supplierId, 
                                               Boolean active, Boolean lowStock, Pageable pageable) {
        logger.debug("Fetching products with filters - name: {}, sku: {}, categoryId: {}, supplierId: {}, active: {}, lowStock: {}", 
                    name, sku, categoryId, supplierId, active, lowStock);
        
        Page<Product> products = productRepository.findProductsWithFilters(name, sku, categoryId, supplierId, active, lowStock, pageable);
        return products.map(this::convertToProductResponse);
    }

    /**
     * Bulk activate products
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"products", "search"}, allEntries = true)
    public int bulkActivateProducts(List<Long> productIds) {
        logger.info("Bulk activating {} products", productIds.size());

        int activatedCount = 0;
        for (Long productId : productIds) {
            try {
                activateProduct(productId);
                activatedCount++;
            } catch (Exception e) {
                logger.warn("Failed to activate product {}: {}", productId, e.getMessage());
            }
        }

        logger.info("Successfully bulk activated {} out of {} products", activatedCount, productIds.size());
        return activatedCount;
    }

    /**
     * Bulk deactivate products
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"products", "search"}, allEntries = true)
    public int bulkDeactivateProducts(List<Long> productIds) {
        logger.info("Bulk deactivating {} products", productIds.size());

        int deactivatedCount = 0;
        for (Long productId : productIds) {
            try {
                deactivateProduct(productId);
                deactivatedCount++;
            } catch (Exception e) {
                logger.warn("Failed to deactivate product {}: {}", productId, e.getMessage());
            }
        }

        logger.info("Successfully bulk deactivated {} out of {} products", deactivatedCount, productIds.size());
        return deactivatedCount;
    }

    /**
     * Bulk update category for products
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"products", "search"}, allEntries = true)
    public int bulkUpdateCategory(List<Long> productIds, Long categoryId) {
        logger.info("Bulk updating category for {} products to category ID: {}", productIds.size(), categoryId);

        // Validate category exists
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        int updatedCount = 0;
        for (Long productId : productIds) {
            try {
                Product product = productRepository.findById(productId)
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));
                
                product.setCategory(category);
                productRepository.save(product);
                updatedCount++;
            } catch (Exception e) {
                logger.warn("Failed to update category for product {}: {}", productId, e.getMessage());
            }
        }

        logger.info("Successfully bulk updated category for {} out of {} products", updatedCount, productIds.size());
        return updatedCount;
    }

    /**
     * Get product statistics
     */
    public java.util.Map<String, Object> getProductStatistics() {
        java.util.Map<String, Object> statistics = new java.util.HashMap<>();
        
        long totalProducts = productRepository.count();
        long activeProducts = productRepository.countByActiveTrue();
        long inactiveProducts = totalProducts - activeProducts;
        long lowStockProducts = productRepository.countLowStockProducts();
        
        statistics.put("totalProducts", totalProducts);
        statistics.put("activeProducts", activeProducts);
        statistics.put("inactiveProducts", inactiveProducts);
        statistics.put("lowStockProducts", lowStockProducts);
        
        return statistics;
    }

    /**
     * Generate URL-friendly slug from product name
     */
    private String generateSlug(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}