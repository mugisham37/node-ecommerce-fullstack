package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.*;
import com.ecommerce.inventory.dto.response.*;
import com.ecommerce.inventory.entity.*;
import com.ecommerce.inventory.exception.ResourceNotFoundException;
import com.ecommerce.inventory.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Supplier Relationship Management Service with comprehensive supplier lifecycle management
 * Handles supplier CRUD operations, performance tracking, and analytics
 */
@Service
@Transactional
public class SupplierService {

    private static final Logger logger = LoggerFactory.getLogger(SupplierService.class);

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CacheService cacheService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    /**
     * Create a new supplier
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"suppliers", "supplier-summaries"}, allEntries = true)
    public SupplierResponse createSupplier(SupplierCreateRequest request) {
        logger.info("Creating new supplier: {}", request.getName());

        // Check if supplier with same name already exists
        if (supplierRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Supplier with name '" + request.getName() + "' already exists");
        }

        // Create supplier entity
        Supplier supplier = new Supplier();
        supplier.setName(request.getName());
        supplier.setContactPerson(request.getContactPerson());
        supplier.setEmail(request.getEmail());
        supplier.setPhone(request.getPhone());
        supplier.setAddress(request.getAddress());
        supplier.setPaymentTerms(request.getPaymentTerms());
        supplier.setStatus(SupplierStatus.ACTIVE);

        Supplier savedSupplier = supplierRepository.save(supplier);

        // Publish supplier created event
        eventPublisher.publishEvent(new SupplierCreatedEvent(savedSupplier.getId(), savedSupplier.getName()));

        // Update cache
        SupplierResponse response = convertToSupplierResponse(savedSupplier);
        cacheService.put("suppliers", "supplier:" + savedSupplier.getId(), response);

        logger.info("Successfully created supplier with ID: {}", savedSupplier.getId());
        return response;
    }

    /**
     * Update supplier information
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "suppliers", key = "'supplier:' + #id"),
        @CacheEvict(value = "supplier-summaries", allEntries = true),
        @CacheEvict(value = "supplier-performance", key = "'performance:' + #id")
    })
    public SupplierResponse updateSupplier(Long id, SupplierUpdateRequest request) {
        logger.info("Updating supplier with ID: {}", id);

        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + id));

        // Update fields if provided
        if (request.getName() != null) {
            // Check if new name conflicts with existing supplier
            if (!request.getName().equals(supplier.getName()) && 
                supplierRepository.existsByName(request.getName())) {
                throw new IllegalArgumentException("Supplier with name '" + request.getName() + "' already exists");
            }
            supplier.setName(request.getName());
        }
        if (request.getContactPerson() != null) {
            supplier.setContactPerson(request.getContactPerson());
        }
        if (request.getEmail() != null) {
            supplier.setEmail(request.getEmail());
        }
        if (request.getPhone() != null) {
            supplier.setPhone(request.getPhone());
        }
        if (request.getAddress() != null) {
            supplier.setAddress(request.getAddress());
        }
        if (request.getPaymentTerms() != null) {
            supplier.setPaymentTerms(request.getPaymentTerms());
        }

        Supplier updatedSupplier = supplierRepository.save(supplier);

        // Publish supplier updated event
        eventPublisher.publishEvent(new SupplierUpdatedEvent(updatedSupplier.getId(), updatedSupplier.getName()));

        // Update cache
        SupplierResponse response = convertToSupplierResponse(updatedSupplier);
        cacheService.put("suppliers", "supplier:" + updatedSupplier.getId(), response);

        logger.info("Successfully updated supplier with ID: {}", id);
        return response;
    }

    /**
     * Update supplier status with business rule validation
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "suppliers", key = "'supplier:' + #id"),
        @CacheEvict(value = "supplier-summaries", allEntries = true),
        @CacheEvict(value = "supplier-performance", key = "'performance:' + #id")
    })
    public SupplierResponse updateSupplierStatus(Long id, SupplierStatusUpdateRequest request) {
        logger.info("Updating supplier status for ID: {} to {}", id, request.getNewStatus());

        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + id));

        SupplierStatus previousStatus = supplier.getStatus();

        // Validate status change based on business rules
        validateStatusChange(supplier, request.getNewStatus(), request.getReason());

        // Update status
        supplier.setStatus(request.getNewStatus());
        Supplier updatedSupplier = supplierRepository.save(supplier);

        // Handle status-specific business logic
        handleStatusChange(updatedSupplier, previousStatus, request.getNewStatus(), request.getReason());

        // Publish status change event
        eventPublisher.publishEvent(new SupplierStatusChangedEvent(updatedSupplier.getId(), 
                previousStatus, request.getNewStatus(), request.getReason()));

        // Update cache
        SupplierResponse response = convertToSupplierResponse(updatedSupplier);
        cacheService.put("suppliers", "supplier:" + updatedSupplier.getId(), response);

        logger.info("Successfully updated supplier status for ID: {} from {} to {}", 
                   id, previousStatus, request.getNewStatus());
        return response;
    }

    /**
     * Get supplier by ID with caching
     */
    @Cacheable(value = "suppliers", key = "'supplier:' + #id")
    public SupplierResponse getSupplierById(Long id) {
        logger.debug("Fetching supplier with ID: {}", id);

        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + id));

        return convertToSupplierResponse(supplier);
    }

    /**
     * Get all active suppliers with caching
     */
    @Cacheable(value = "supplier-summaries", key = "'active-suppliers:' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<SupplierSummaryResponse> getActiveSuppliers(Pageable pageable) {
        logger.debug("Fetching active suppliers, page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());

        Page<Supplier> suppliers = supplierRepository.findByStatus(SupplierStatus.ACTIVE, pageable);
        return suppliers.map(this::convertToSupplierSummaryResponse);
    }

    /**
     * Get suppliers by status with caching
     */
    @Cacheable(value = "supplier-summaries", key = "'status:' + #status + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<SupplierSummaryResponse> getSuppliersByStatus(SupplierStatus status, Pageable pageable) {
        logger.debug("Fetching suppliers with status: {}", status);

        Page<Supplier> suppliers = supplierRepository.findByStatus(status, pageable);
        return suppliers.map(this::convertToSupplierSummaryResponse);
    }

    /**
     * Search suppliers with caching
     */
    @Cacheable(value = "supplier-summaries", key = "'search:' + #searchTerm + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<SupplierSummaryResponse> searchSuppliers(String searchTerm, Pageable pageable) {
        logger.debug("Searching suppliers with term: {}", searchTerm);

        Page<Supplier> suppliers = supplierRepository.searchSuppliers(searchTerm, pageable);
        return suppliers.map(this::convertToSupplierSummaryResponse);
    }

    /**
     * Get supplier performance tracking and analytics
     */
    @Cacheable(value = "supplier-performance", key = "'performance:' + #id")
    public SupplierPerformanceResponse getSupplierPerformance(Long id) {
        logger.debug("Generating performance analytics for supplier ID: {}", id);

        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + id));

        return generateSupplierPerformanceAnalytics(supplier);
    }

    /**
     * Get all supplier performance analytics
     */
    @Cacheable(value = "supplier-performance", key = "'all-performance'")
    public List<SupplierPerformanceResponse> getAllSupplierPerformance() {
        logger.debug("Generating performance analytics for all suppliers");

        List<Supplier> suppliers = supplierRepository.findByStatus(SupplierStatus.ACTIVE);
        return suppliers.stream()
                .map(this::generateSupplierPerformanceAnalytics)
                .collect(Collectors.toList());
    }

    /**
     * Get suppliers with low performance
     */
    @Cacheable(value = "supplier-performance", key = "'low-performance'")
    public List<SupplierPerformanceResponse> getLowPerformanceSuppliers() {
        logger.debug("Finding suppliers with low performance");

        return getAllSupplierPerformance().stream()
                .filter(performance -> "POOR".equals(performance.getPerformanceRating()) || 
                                     "AVERAGE".equals(performance.getPerformanceRating()))
                .collect(Collectors.toList());
    }

    /**
     * Add supplier-product relationship management
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"suppliers", "supplier-summaries", "supplier-performance"}, allEntries = true)
    public void addProductToSupplier(Long supplierId, Long productId) {
        logger.info("Adding product {} to supplier {}", productId, supplierId);

        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + supplierId));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        if (!supplier.isActive()) {
            throw new IllegalStateException("Cannot add products to inactive supplier");
        }

        product.setSupplier(supplier);
        productRepository.save(product);

        // Publish event
        eventPublisher.publishEvent(new SupplierProductAddedEvent(supplierId, productId));

        logger.info("Successfully added product {} to supplier {}", productId, supplierId);
    }

    /**
     * Remove supplier-product relationship
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"suppliers", "supplier-summaries", "supplier-performance"}, allEntries = true)
    public void removeProductFromSupplier(Long supplierId, Long productId) {
        logger.info("Removing product {} from supplier {}", productId, supplierId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        if (product.getSupplier() == null || !product.getSupplier().getId().equals(supplierId)) {
            throw new IllegalArgumentException("Product is not associated with the specified supplier");
        }

        // Check if product has pending orders
        boolean hasPendingOrders = orderRepository.hasProductInPendingOrders(productId);
        if (hasPendingOrders) {
            throw new IllegalStateException("Cannot remove product with pending orders from supplier");
        }

        product.setSupplier(null);
        productRepository.save(product);

        // Publish event
        eventPublisher.publishEvent(new SupplierProductRemovedEvent(supplierId, productId));

        logger.info("Successfully removed product {} from supplier {}", productId, supplierId);
    }

    /**
     * Get products by supplier
     */
    @Cacheable(value = "suppliers", key = "'supplier-products:' + #supplierId + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<ProductResponse> getProductsBySupplier(Long supplierId, Pageable pageable) {
        logger.debug("Fetching products for supplier ID: {}", supplierId);

        // Verify supplier exists
        supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + supplierId));

        Page<Product> products = productRepository.findBySupplierIdAndActiveTrue(supplierId, pageable);
        return products.map(this::convertToProductResponse);
    }

    /**
     * Validate status change based on business rules
     */
    private void validateStatusChange(Supplier supplier, SupplierStatus newStatus, String reason) {
        if (supplier.getStatus() == newStatus) {
            throw new IllegalArgumentException("Supplier is already in " + newStatus + " status");
        }

        // Business rule: Cannot activate supplier without complete contact info
        if (newStatus == SupplierStatus.ACTIVE && !supplier.hasCompleteContactInfo()) {
            throw new IllegalStateException("Cannot activate supplier without complete contact information");
        }

        // Business rule: Must provide reason for suspension
        if (newStatus == SupplierStatus.SUSPENDED && (reason == null || reason.trim().isEmpty())) {
            throw new IllegalArgumentException("Reason is required when suspending a supplier");
        }

        // Business rule: Check for active products when deactivating
        if (newStatus == SupplierStatus.INACTIVE && supplier.getActiveProductCount() > 0) {
            logger.warn("Deactivating supplier {} with {} active products", 
                       supplier.getId(), supplier.getActiveProductCount());
        }
    }

    /**
     * Handle status change business logic
     */
    private void handleStatusChange(Supplier supplier, SupplierStatus previousStatus, 
                                  SupplierStatus newStatus, String reason) {
        switch (newStatus) {
            case INACTIVE:
                // Could implement logic to handle product deactivation
                logger.info("Supplier {} deactivated. Consider reviewing associated products.", supplier.getId());
                break;
            case SUSPENDED:
                // Could implement logic to pause orders or send notifications
                logger.info("Supplier {} suspended. Reason: {}", supplier.getId(), reason);
                break;
            case ACTIVE:
                // Could implement logic to reactivate processes
                logger.info("Supplier {} activated.", supplier.getId());
                break;
        }
    }

    /**
     * Generate comprehensive supplier performance analytics
     */
    private SupplierPerformanceResponse generateSupplierPerformanceAnalytics(Supplier supplier) {
        // Get product metrics
        long totalProducts = supplier.getTotalProductCount();
        long activeProducts = supplier.getActiveProductCount();
        long inactiveProducts = totalProducts - activeProducts;

        // Get order metrics (this would require more complex queries in a real implementation)
        // For now, using placeholder values
        long totalOrders = 0;
        long completedOrders = 0;
        long cancelledOrders = 0;
        BigDecimal totalOrderValue = BigDecimal.ZERO;
        BigDecimal averageOrderValue = BigDecimal.ZERO;

        // Calculate performance metrics
        double orderCompletionRate = totalOrders > 0 ? 
                (double) completedOrders / totalOrders * 100 : 0.0;
        double orderCancellationRate = totalOrders > 0 ? 
                (double) cancelledOrders / totalOrders * 100 : 0.0;

        // Quality metrics
        long totalReturns = 0; // Would be calculated from actual data
        double returnRate = totalOrders > 0 ? (double) totalReturns / totalOrders * 100 : 0.0;
        double qualityScore = calculateQualityScore(orderCompletionRate, returnRate);

        // Time metrics
        LocalDateTime firstOrderDate = null; // Would be calculated from actual data
        LocalDateTime lastOrderDate = null; // Would be calculated from actual data
        Integer daysSinceLastOrder = lastOrderDate != null ? 
                (int) ChronoUnit.DAYS.between(lastOrderDate, LocalDateTime.now()) : null;

        // Performance rating
        String performanceRating = calculatePerformanceRating(qualityScore, orderCompletionRate, returnRate);
        String recommendations = generateRecommendations(supplier, performanceRating, orderCompletionRate, returnRate);

        return SupplierPerformanceResponse.builder()
                .supplierId(supplier.getId())
                .supplierName(supplier.getName())
                .totalProducts(totalProducts)
                .activeProducts(activeProducts)
                .inactiveProducts(inactiveProducts)
                .totalOrders(totalOrders)
                .completedOrders(completedOrders)
                .cancelledOrders(cancelledOrders)
                .totalOrderValue(totalOrderValue)
                .averageOrderValue(averageOrderValue)
                .orderCompletionRate(orderCompletionRate)
                .orderCancellationRate(orderCancellationRate)
                .averageDeliveryDays(0) // Would be calculated from actual data
                .totalReturns(totalReturns)
                .returnRate(returnRate)
                .qualityScore(qualityScore)
                .totalPurchaseValue(BigDecimal.ZERO) // Would be calculated from actual data
                .averagePurchasePrice(BigDecimal.ZERO) // Would be calculated from actual data
                .totalSavings(BigDecimal.ZERO) // Would be calculated from actual data
                .firstOrderDate(firstOrderDate)
                .lastOrderDate(lastOrderDate)
                .daysSinceLastOrder(daysSinceLastOrder)
                .performanceRating(performanceRating)
                .recommendations(recommendations)
                .build();
    }

    /**
     * Calculate quality score based on various metrics
     */
    private double calculateQualityScore(double completionRate, double returnRate) {
        // Simple scoring algorithm - can be made more sophisticated
        double score = 100.0;
        score -= (100.0 - completionRate) * 0.5; // Completion rate impact
        score -= returnRate * 2.0; // Return rate impact (higher penalty)
        return Math.max(0.0, Math.min(100.0, score));
    }

    /**
     * Calculate performance rating based on metrics
     */
    private String calculatePerformanceRating(double qualityScore, double completionRate, double returnRate) {
        if (qualityScore >= 90 && completionRate >= 95 && returnRate <= 2) {
            return "EXCELLENT";
        } else if (qualityScore >= 75 && completionRate >= 85 && returnRate <= 5) {
            return "GOOD";
        } else if (qualityScore >= 60 && completionRate >= 70 && returnRate <= 10) {
            return "AVERAGE";
        } else {
            return "POOR";
        }
    }

    /**
     * Generate recommendations based on performance
     */
    private String generateRecommendations(Supplier supplier, String rating, 
                                         double completionRate, double returnRate) {
        StringBuilder recommendations = new StringBuilder();

        if ("POOR".equals(rating)) {
            recommendations.append("Consider reviewing supplier contract and performance requirements. ");
        }

        if (completionRate < 80) {
            recommendations.append("Improve order completion processes. ");
        }

        if (returnRate > 5) {
            recommendations.append("Focus on quality improvement initiatives. ");
        }

        if (!supplier.hasCompleteContactInfo()) {
            recommendations.append("Update contact information for better communication. ");
        }

        if (supplier.getActiveProductCount() == 0) {
            recommendations.append("Consider adding products or reviewing supplier relationship. ");
        }

        return recommendations.length() > 0 ? recommendations.toString().trim() : "No specific recommendations at this time.";
    }

    /**
     * Convert Supplier entity to SupplierResponse DTO
     */
    private SupplierResponse convertToSupplierResponse(Supplier supplier) {
        return SupplierResponse.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .contactPerson(supplier.getContactPerson())
                .email(supplier.getEmail())
                .phone(supplier.getPhone())
                .address(supplier.getAddress())
                .paymentTerms(supplier.getPaymentTerms())
                .status(supplier.getStatus())
                .statusDescription(supplier.getStatus().getDescription())
                .totalProductCount(supplier.getTotalProductCount())
                .activeProductCount(supplier.getActiveProductCount())
                .isActive(supplier.isActive())
                .canBeDeleted(supplier.canBeDeleted())
                .hasCompleteContactInfo(supplier.hasCompleteContactInfo())
                .primaryContact(supplier.getPrimaryContact())
                .createdAt(supplier.getCreatedAt())
                .updatedAt(supplier.getUpdatedAt())
                .build();
    }

    /**
     * Convert Supplier entity to SupplierSummaryResponse DTO
     */
    private SupplierSummaryResponse convertToSupplierSummaryResponse(Supplier supplier) {
        return SupplierSummaryResponse.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .contactPerson(supplier.getContactPerson())
                .email(supplier.getEmail())
                .phone(supplier.getPhone())
                .status(supplier.getStatus())
                .statusDescription(supplier.getStatus().getDescription())
                .totalProductCount(supplier.getTotalProductCount())
                .activeProductCount(supplier.getActiveProductCount())
                .isActive(supplier.isActive())
                .primaryContact(supplier.getPrimaryContact())
                .createdAt(supplier.getCreatedAt())
                .updatedAt(supplier.getUpdatedAt())
                .build();
    }

    /**
     * Convert Product entity to ProductResponse DTO (simplified version)
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

    // Event classes (these would typically be in separate files)
    public static class SupplierCreatedEvent {
        private final Long supplierId;
        private final String supplierName;

        public SupplierCreatedEvent(Long supplierId, String supplierName) {
            this.supplierId = supplierId;
            this.supplierName = supplierName;
        }

        public Long getSupplierId() { return supplierId; }
        public String getSupplierName() { return supplierName; }
    }

    public static class SupplierUpdatedEvent {
        private final Long supplierId;
        private final String supplierName;

        public SupplierUpdatedEvent(Long supplierId, String supplierName) {
            this.supplierId = supplierId;
            this.supplierName = supplierName;
        }

        public Long getSupplierId() { return supplierId; }
        public String getSupplierName() { return supplierName; }
    }

    public static class SupplierStatusChangedEvent {
        private final Long supplierId;
        private final SupplierStatus previousStatus;
        private final SupplierStatus newStatus;
        private final String reason;

        public SupplierStatusChangedEvent(Long supplierId, SupplierStatus previousStatus, 
                                        SupplierStatus newStatus, String reason) {
            this.supplierId = supplierId;
            this.previousStatus = previousStatus;
            this.newStatus = newStatus;
            this.reason = reason;
        }

        public Long getSupplierId() { return supplierId; }
        public SupplierStatus getPreviousStatus() { return previousStatus; }
        public SupplierStatus getNewStatus() { return newStatus; }
        public String getReason() { return reason; }
    }

    public static class SupplierProductAddedEvent {
        private final Long supplierId;
        private final Long productId;

        public SupplierProductAddedEvent(Long supplierId, Long productId) {
            this.supplierId = supplierId;
            this.productId = productId;
        }

        public Long getSupplierId() { return supplierId; }
        public Long getProductId() { return productId; }
    }

    public static class SupplierProductRemovedEvent {
        private final Long supplierId;
        private final Long productId;

        public SupplierProductRemovedEvent(Long supplierId, Long productId) {
            this.supplierId = supplierId;
            this.productId = productId;
        }

        public Long getSupplierId() { return supplierId; }
        public Long getProductId() { return productId; }
    }

    /**
     * Get all suppliers with filtering
     */
    public Page<SupplierResponse> getAllSuppliers(String name, String email, SupplierStatus status, Pageable pageable) {
        logger.debug("Fetching suppliers with filters - name: {}, email: {}, status: {}", name, email, status);
        
        Page<Supplier> suppliers = supplierRepository.findSuppliersWithFilters(name, email, status, pageable);
        return suppliers.map(this::convertToSupplierResponse);
    }

    /**
     * Search suppliers
     */
    public Page<SupplierResponse> searchSuppliers(String searchTerm, Pageable pageable) {
        logger.debug("Searching suppliers with term: {}", searchTerm);
        
        Page<Supplier> suppliers = supplierRepository.searchSuppliers(searchTerm, pageable);
        return suppliers.map(this::convertToSupplierResponse);
    }

    /**
     * Get suppliers by status
     */
    public List<SupplierResponse> getSuppliersByStatus(SupplierStatus status) {
        logger.debug("Fetching suppliers with status: {}", status);
        
        List<Supplier> suppliers = supplierRepository.findByStatus(status);
        return suppliers.stream()
                .map(this::convertToSupplierResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get active suppliers
     */
    public List<SupplierResponse> getActiveSuppliers() {
        logger.debug("Fetching active suppliers");
        
        List<Supplier> suppliers = supplierRepository.findByStatus(SupplierStatus.ACTIVE);
        return suppliers.stream()
                .map(this::convertToSupplierResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update supplier status
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"suppliers", "supplier-summaries"}, allEntries = true)
    public void updateSupplierStatus(Long supplierId, SupplierStatusUpdateRequest request) {
        logger.info("Updating supplier status for ID: {} to {}", supplierId, request.getStatus());

        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + supplierId));

        SupplierStatus previousStatus = supplier.getStatus();
        supplier.setStatus(request.getStatus());
        
        supplierRepository.save(supplier);

        // Publish status change event
        eventPublisher.publishEvent(new SupplierStatusChangedEvent(supplierId, 
                previousStatus, request.getStatus(), request.getReason()));

        logger.info("Successfully updated supplier status for ID: {} from {} to {}", 
                   supplierId, previousStatus, request.getStatus());
    }

    /**
     * Get supplier performance with date range
     */
    public SupplierPerformanceResponse getSupplierPerformance(Long supplierId, LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Generating performance analytics for supplier ID: {} from {} to {}", supplierId, startDate, endDate);

        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + supplierId));

        return generateSupplierPerformanceAnalytics(supplier);
    }

    /**
     * Get supplier summary
     */
    public SupplierSummaryResponse getSupplierSummary(Long supplierId) {
        logger.debug("Fetching supplier summary for ID: {}", supplierId);

        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + supplierId));

        return convertToSupplierSummaryResponse(supplier);
    }

    /**
     * Get supplier products
     */
    public Page<ProductResponse> getSupplierProducts(Long supplierId, Pageable pageable) {
        logger.debug("Fetching products for supplier ID: {}", supplierId);

        // Verify supplier exists
        supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + supplierId));

        Page<Product> products = productRepository.findBySupplierIdAndActiveTrue(supplierId, pageable);
        return products.map(this::convertToProductResponse);
    }

    /**
     * Bulk update supplier status
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"suppliers", "supplier-summaries"}, allEntries = true)
    public int bulkUpdateSupplierStatus(List<Long> supplierIds, SupplierStatus status, String reason) {
        logger.info("Bulk updating status for {} suppliers to {}", supplierIds.size(), status);

        int updatedCount = 0;
        for (Long supplierId : supplierIds) {
            try {
                SupplierStatusUpdateRequest request = new SupplierStatusUpdateRequest();
                request.setStatus(status);
                request.setReason(reason);
                updateSupplierStatus(supplierId, request);
                updatedCount++;
            } catch (Exception e) {
                logger.warn("Failed to update status for supplier {}: {}", supplierId, e.getMessage());
            }
        }

        logger.info("Successfully bulk updated status for {} out of {} suppliers", updatedCount, supplierIds.size());
        return updatedCount;
    }

    /**
     * Bulk create suppliers
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"suppliers", "supplier-summaries"}, allEntries = true)
    public List<SupplierResponse> bulkCreateSuppliers(List<SupplierCreateRequest> requests) {
        logger.info("Bulk creating {} suppliers", requests.size());

        List<SupplierResponse> responses = requests.stream()
                .map(this::createSupplier)
                .collect(Collectors.toList());

        logger.info("Successfully bulk created {} suppliers", responses.size());
        return responses;
    }

    /**
     * Bulk update suppliers
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = {"suppliers", "supplier-summaries"}, allEntries = true)
    public List<SupplierResponse> bulkUpdateSuppliers(List<SupplierUpdateRequest> requests) {
        logger.info("Bulk updating {} suppliers", requests.size());

        List<SupplierResponse> responses = requests.stream()
                .map(request -> updateSupplier(request.getId(), request))
                .collect(Collectors.toList());

        logger.info("Successfully bulk updated {} suppliers", responses.size());
        return responses;
    }

    /**
     * Get supplier statistics
     */
    public java.util.Map<String, Object> getSupplierStatistics() {
        java.util.Map<String, Object> statistics = new java.util.HashMap<>();
        
        long totalSuppliers = supplierRepository.count();
        long activeSuppliers = supplierRepository.countByStatus(SupplierStatus.ACTIVE);
        long inactiveSuppliers = supplierRepository.countByStatus(SupplierStatus.INACTIVE);
        long suspendedSuppliers = supplierRepository.countByStatus(SupplierStatus.SUSPENDED);
        
        statistics.put("totalSuppliers", totalSuppliers);
        statistics.put("activeSuppliers", activeSuppliers);
        statistics.put("inactiveSuppliers", inactiveSuppliers);
        statistics.put("suspendedSuppliers", suspendedSuppliers);
        
        return statistics;
    }

    /**
     * Get top performing suppliers
     */
    public List<SupplierPerformanceResponse> getTopPerformingSuppliers(int limit, LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Fetching top {} performing suppliers from {} to {}", limit, startDate, endDate);

        List<Supplier> suppliers = supplierRepository.findByStatus(SupplierStatus.ACTIVE);
        return suppliers.stream()
                .map(this::generateSupplierPerformanceAnalytics)
                .sorted((p1, p2) -> Double.compare(p2.getQualityScore(), p1.getQualityScore()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Send communication to supplier
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public void sendCommunication(Long supplierId, String subject, String message, String type) {
        logger.info("Sending {} communication to supplier {}: {}", type, supplierId, subject);

        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + supplierId));

        // In a real implementation, this would integrate with email/SMS services
        // For now, just log the communication
        logger.info("Communication sent to supplier {} ({}): Subject: {}, Message: {}, Type: {}", 
                   supplier.getName(), supplier.getEmail(), subject, message, type);

        // Could publish an event for audit logging
        // eventPublisher.publishEvent(new SupplierCommunicationSentEvent(supplierId, subject, message, type));
    }
}