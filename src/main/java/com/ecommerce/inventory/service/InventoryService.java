package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.InventoryAdjustmentRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;
import com.ecommerce.inventory.dto.response.LowStockAlert;
import com.ecommerce.inventory.entity.Inventory;
import com.ecommerce.inventory.entity.Product;
import com.ecommerce.inventory.entity.StockMovement;
import com.ecommerce.inventory.entity.StockMovementType;
import com.ecommerce.inventory.exception.InsufficientStockException;
import com.ecommerce.inventory.exception.ResourceNotFoundException;
import com.ecommerce.inventory.repository.InventoryRepository;
import com.ecommerce.inventory.repository.ProductRepository;
import com.ecommerce.inventory.repository.StockMovementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import com.ecommerce.inventory.event.EventPublisher;
import com.ecommerce.inventory.event.inventory.StockUpdatedEvent;
import com.ecommerce.inventory.event.inventory.InventoryAllocatedEvent;
import com.ecommerce.inventory.event.inventory.InventoryReleasedEvent;
import com.ecommerce.inventory.event.inventory.LowStockEvent;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.event.order.OrderCancelledEvent;
import com.ecommerce.inventory.security.UserPrincipal;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Advanced Inventory Management Service with real-time caching
 * Handles inventory tracking, allocation, and stock movement operations
 */
@Service
@Transactional
public class InventoryService {

    private static final Logger logger = LoggerFactory.getLogger(InventoryService.class);

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private CacheService cacheService;

    @Autowired
    private EventPublisher eventPublisher;

    /**
     * Get inventory by product ID with caching
     */
    @Cacheable(value = "inventory", key = "'product:' + #productId")
    public InventoryResponse getInventoryByProduct(Long productId) {
        logger.debug("Fetching inventory for product ID: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        Inventory inventory = inventoryRepository.findByProductId(productId)
                .orElseGet(() -> createInitialInventory(product));

        return convertToInventoryResponse(inventory);
    }

    /**
     * Get inventory by product ID and warehouse location with caching
     */
    @Cacheable(value = "inventory", key = "'product:' + #productId + ':warehouse:' + #warehouseLocation")
    public InventoryResponse getInventoryByProductAndWarehouse(Long productId, String warehouseLocation) {
        logger.debug("Fetching inventory for product ID: {} at warehouse: {}", productId, warehouseLocation);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        Inventory inventory = inventoryRepository.findByProductIdAndWarehouseLocation(productId, warehouseLocation)
                .orElseGet(() -> createInitialInventoryForWarehouse(product, warehouseLocation));

        return convertToInventoryResponse(inventory);
    }

    /**
     * Get all inventory locations for a product
     */
    @Cacheable(value = "inventory", key = "'product-locations:' + #productId")
    public List<InventoryResponse> getAllInventoryLocationsForProduct(Long productId) {
        logger.debug("Fetching all inventory locations for product ID: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        List<Inventory> inventories = inventoryRepository.findAllByProductId(productId);
        
        if (inventories.isEmpty()) {
            // Create initial inventory for main warehouse if none exists
            Inventory mainInventory = createInitialInventory(product);
            inventories = List.of(mainInventory);
        }

        return inventories.stream()
                .map(this::convertToInventoryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get consolidated inventory across all warehouses for a product
     */
    @Cacheable(value = "inventory", key = "'consolidated:' + #productId")
    public InventoryResponse getConsolidatedInventory(Long productId) {
        logger.debug("Fetching consolidated inventory for product ID: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        List<Inventory> inventories = inventoryRepository.findAllByProductId(productId);
        
        if (inventories.isEmpty()) {
            return convertToInventoryResponse(createInitialInventory(product));
        }

        // Consolidate quantities across all warehouses
        int totalOnHand = inventories.stream().mapToInt(Inventory::getQuantityOnHand).sum();
        int totalAllocated = inventories.stream().mapToInt(Inventory::getQuantityAllocated).sum();
        
        // Create a virtual consolidated inventory response
        return InventoryResponse.builder()
                .productId(productId)
                .productName(product.getName())
                .sku(product.getSku())
                .warehouseLocation("ALL_WAREHOUSES")
                .quantityOnHand(totalOnHand)
                .quantityAllocated(totalAllocated)
                .quantityAvailable(totalOnHand - totalAllocated)
                .reorderLevel(product.getReorderLevel())
                .reorderQuantity(product.getReorderQuantity())
                .isLowStock((totalOnHand - totalAllocated) <= product.getReorderLevel())
                .lastCountedAt(inventories.stream()
                        .map(Inventory::getLastCountedAt)
                        .max(LocalDateTime::compareTo)
                        .orElse(LocalDateTime.now()))
                .build();
    }

    /**
     * Get inventory by product SKU with caching
     */
    @Cacheable(value = "inventory", key = "'sku:' + #sku")
    public InventoryResponse getInventoryBySku(String sku) {
        logger.debug("Fetching inventory for product SKU: {}", sku);

        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with SKU: " + sku));

        return getInventoryByProduct(product.getId());
    }

    /**
     * Adjust inventory with cache invalidation and audit trail
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'sku:' + @productRepository.findById(#productId).orElse(new com.ecommerce.inventory.entity.Product()).getSku()"),
        @CacheEvict(value = "inventory", key = "'low-stock-products'")
    })
    public void adjustInventory(Long productId, InventoryAdjustmentRequest request) {
        adjustInventoryAtWarehouse(productId, "MAIN", request);
    }

    /**
     * Adjust inventory at specific warehouse with cache invalidation and audit trail
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId + ':warehouse:' + #warehouseLocation"),
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'consolidated:' + #productId"),
        @CacheEvict(value = "inventory", key = "'product-locations:' + #productId"),
        @CacheEvict(value = "inventory", key = "'low-stock-products'")
    })
    public void adjustInventoryAtWarehouse(Long productId, String warehouseLocation, InventoryAdjustmentRequest request) {
        logger.info("Adjusting inventory for product ID: {} at warehouse: {}, new quantity: {}", 
                   productId, warehouseLocation, request.getNewQuantity());

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        Inventory inventory = inventoryRepository.findByProductIdAndWarehouseLocation(productId, warehouseLocation)
                .orElseGet(() -> createInitialInventoryForWarehouse(product, warehouseLocation));

        Integer previousQuantity = inventory.getQuantityOnHand();
        
        // Validate adjustment
        if (request.getNewQuantity() < inventory.getQuantityAllocated()) {
            throw new IllegalArgumentException("Cannot set quantity below allocated amount: " + inventory.getQuantityAllocated());
        }

        // Update inventory
        inventory.adjustStock(request.getNewQuantity(), request.getReason());
        Inventory updatedInventory = inventoryRepository.save(inventory);

        // Create stock movement record
        createStockMovementWithWarehouse(product, warehouseLocation, StockMovementType.ADJUSTMENT, 
                          request.getNewQuantity() - previousQuantity, request.getReason());

        // Publish stock updated event
        StockUpdatedEvent stockEvent = new StockUpdatedEvent(
            this, productId, product.getSku(), warehouseLocation,
            previousQuantity, request.getNewQuantity(), StockMovementType.ADJUSTMENT,
            request.getReason(), "INVENTORY_ADJUSTMENT", "MANUAL", getCurrentUserId()
        );
        eventPublisher.publishEvent(stockEvent);

        // Update cache
        cacheService.put("inventory", "product:" + productId + ":warehouse:" + warehouseLocation, 
                        convertToInventoryResponse(updatedInventory));

        // Invalidate related caches
        cacheService.invalidateRelatedCaches("inventory", productId);

        // Check consolidated inventory for low stock
        InventoryResponse consolidated = getConsolidatedInventory(productId);
        if (consolidated.getQuantityAvailable() <= product.getReorderLevel()) {
            LowStockEvent lowStockEvent = new LowStockEvent(
                this, productId, product.getSku(), warehouseLocation,
                consolidated.getQuantityAvailable(), product.getReorderLevel(),
                product.getReorderQuantity(), getCurrentUserId()
            );
            eventPublisher.publishEvent(lowStockEvent);
        }

        logger.info("Successfully adjusted inventory for product ID: {} at warehouse: {}", productId, warehouseLocation);
    }

    /**
     * Allocate inventory for orders with optimistic locking
     */
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'sku:' + @productRepository.findById(#productId).orElse(new com.ecommerce.inventory.entity.Product()).getSku()")
    })
    public boolean allocateInventory(Long productId, Integer quantity, String referenceId) {
        return allocateInventoryAtWarehouse(productId, "MAIN", quantity, referenceId);
    }

    /**
     * Allocate inventory at specific warehouse with optimistic locking
     */
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId + ':warehouse:' + #warehouseLocation"),
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'consolidated:' + #productId"),
        @CacheEvict(value = "inventory", key = "'product-locations:' + #productId")
    })
    public boolean allocateInventoryAtWarehouse(Long productId, String warehouseLocation, Integer quantity, String referenceId) {
        logger.info("Allocating {} units for product ID: {} at warehouse: {}, reference: {}", 
                   quantity, productId, warehouseLocation, referenceId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        Inventory inventory = inventoryRepository.findByProductIdAndWarehouseLocation(productId, warehouseLocation)
                .orElseGet(() -> createInitialInventoryForWarehouse(product, warehouseLocation));

        // Check availability
        if (!inventory.canAllocate(quantity)) {
            logger.warn("Insufficient stock for allocation at warehouse {}. Product ID: {}, Requested: {}, Available: {}", 
                       warehouseLocation, productId, quantity, inventory.getQuantityAvailable());
            throw new InsufficientStockException(productId, quantity, inventory.getQuantityAvailable());
        }

        // Allocate stock
        inventory.allocateStock(quantity);
        Inventory updatedInventory = inventoryRepository.save(inventory);

        // Create stock movement record
        createStockMovementWithWarehouse(product, warehouseLocation, StockMovementType.ALLOCATION, -quantity, 
                          "Allocated for reference: " + referenceId);

        // Publish inventory allocated event
        InventoryAllocatedEvent allocatedEvent = new InventoryAllocatedEvent(
            this, productId, product.getSku(), warehouseLocation,
            quantity, referenceId, "ORDER", getCurrentUserId()
        );
        eventPublisher.publishEvent(allocatedEvent);

        // Update cache
        cacheService.put("inventory", "product:" + productId + ":warehouse:" + warehouseLocation, 
                        convertToInventoryResponse(updatedInventory));

        logger.info("Successfully allocated {} units for product ID: {} at warehouse: {}", quantity, productId, warehouseLocation);
        return true;
    }

    /**
     * Smart allocation across multiple warehouses
     */
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'consolidated:' + #productId"),
        @CacheEvict(value = "inventory", key = "'product-locations:' + #productId")
    })
    public boolean allocateInventoryAcrossWarehouses(Long productId, Integer quantity, String referenceId) {
        logger.info("Smart allocating {} units for product ID: {} across warehouses, reference: {}", 
                   quantity, productId, referenceId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        List<Inventory> inventories = inventoryRepository.findByProductIdOrderByQuantityAvailableDesc(productId);
        
        if (inventories.isEmpty()) {
            inventories = List.of(createInitialInventory(product));
        }

        // Check total availability across all warehouses
        int totalAvailable = inventories.stream().mapToInt(Inventory::getQuantityAvailable).sum();
        if (totalAvailable < quantity) {
            logger.warn("Insufficient total stock across all warehouses. Product ID: {}, Requested: {}, Available: {}", 
                       productId, quantity, totalAvailable);
            throw new InsufficientStockException(productId, quantity, totalAvailable);
        }

        // Allocate from warehouses with highest availability first
        int remainingToAllocate = quantity;
        for (Inventory inventory : inventories) {
            if (remainingToAllocate <= 0) break;
            
            int availableAtWarehouse = inventory.getQuantityAvailable();
            if (availableAtWarehouse > 0) {
                int toAllocateHere = Math.min(remainingToAllocate, availableAtWarehouse);
                
                inventory.allocateStock(toAllocateHere);
                inventoryRepository.save(inventory);
                
                createStockMovementWithWarehouse(product, inventory.getWarehouseLocation(), 
                                               StockMovementType.ALLOCATION, -toAllocateHere, 
                                               "Smart allocated for reference: " + referenceId);
                
                remainingToAllocate -= toAllocateHere;
                
                logger.debug("Allocated {} units at warehouse {} for product ID: {}", 
                           toAllocateHere, inventory.getWarehouseLocation(), productId);
            }
        }

        logger.info("Successfully smart allocated {} units for product ID: {} across warehouses", quantity, productId);
        return true;
    }

    /**
     * Release allocated inventory
     */
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'sku:' + @productRepository.findById(#productId).orElse(new com.ecommerce.inventory.entity.Product()).getSku()")
    })
    public void releaseInventory(Long productId, Integer quantity, String referenceId) {
        releaseInventoryAtWarehouse(productId, "MAIN", quantity, referenceId);
    }

    /**
     * Release allocated inventory at specific warehouse
     */
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId + ':warehouse:' + #warehouseLocation"),
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'consolidated:' + #productId"),
        @CacheEvict(value = "inventory", key = "'product-locations:' + #productId")
    })
    public void releaseInventoryAtWarehouse(Long productId, String warehouseLocation, Integer quantity, String referenceId) {
        logger.info("Releasing {} units for product ID: {} at warehouse: {}, reference: {}", 
                   quantity, productId, warehouseLocation, referenceId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        Inventory inventory = inventoryRepository.findByProductIdAndWarehouseLocation(productId, warehouseLocation)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for product ID: " + productId + " at warehouse: " + warehouseLocation));

        // Release stock
        inventory.releaseStock(quantity);
        Inventory updatedInventory = inventoryRepository.save(inventory);

        // Create stock movement record
        createStockMovementWithWarehouse(product, warehouseLocation, StockMovementType.RELEASE, quantity, 
                          "Released from reference: " + referenceId);

        // Publish inventory released event
        InventoryReleasedEvent releasedEvent = new InventoryReleasedEvent(
            this, productId, product.getSku(), warehouseLocation,
            quantity, referenceId, "ORDER", getCurrentUserId()
        );
        eventPublisher.publishEvent(releasedEvent);

        // Update cache
        cacheService.put("inventory", "product:" + productId + ":warehouse:" + warehouseLocation, 
                        convertToInventoryResponse(updatedInventory));

        logger.info("Successfully released {} units for product ID: {} at warehouse: {}", quantity, productId, warehouseLocation);
    }

    /**
     * Reduce inventory from allocation (move from allocated to shipped/consumed)
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('EMPLOYEE')")
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'consolidated:' + #productId"),
        @CacheEvict(value = "inventory", key = "'sku:' + @productRepository.findById(#productId).orElse(new com.ecommerce.inventory.entity.Product()).getSku()")
    })
    public void reduceInventoryFromAllocation(Long productId, Integer quantity, String referenceId) {
        reduceInventoryFromAllocationAtWarehouse(productId, "MAIN", quantity, referenceId);
    }

    /**
     * Reduce inventory from allocation at specific warehouse
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('EMPLOYEE')")
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId + ':warehouse:' + #warehouseLocation"),
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'consolidated:' + #productId"),
        @CacheEvict(value = "inventory", key = "'product-locations:' + #productId")
    })
    public void reduceInventoryFromAllocationAtWarehouse(Long productId, String warehouseLocation, Integer quantity, String referenceId) {
        logger.info("Reducing {} units from allocation for product ID: {} at warehouse: {}, reference: {}", 
                   quantity, productId, warehouseLocation, referenceId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        Inventory inventory = inventoryRepository.findByProductIdAndWarehouseLocation(productId, warehouseLocation)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for product ID: " + productId + " at warehouse: " + warehouseLocation));

        // Check if enough allocated quantity exists
        if (inventory.getQuantityAllocated() < quantity) {
            throw new InsufficientStockException(productId, quantity, inventory.getQuantityAllocated());
        }

        // Reduce both allocated and on-hand quantities
        inventory.setQuantityAllocated(inventory.getQuantityAllocated() - quantity);
        inventory.setQuantityOnHand(inventory.getQuantityOnHand() - quantity);

        Inventory updatedInventory = inventoryRepository.save(inventory);

        // Create stock movement record
        createStockMovementWithWarehouse(product, warehouseLocation, StockMovementType.SALE, -quantity, 
                          "Shipped/consumed from reference: " + referenceId);

        // Publish stock updated event
        StockUpdatedEvent stockUpdatedEvent = new StockUpdatedEvent(
            this, productId, product.getSku(), warehouseLocation,
            inventory.getQuantityOnHand() + quantity, // previous quantity
            inventory.getQuantityOnHand(), // new quantity
            StockMovementType.SALE, referenceId, getCurrentUserId()
        );
        eventPublisher.publishEvent(stockUpdatedEvent);

        // Update cache
        cacheService.put("inventory", "product:" + productId + ":warehouse:" + warehouseLocation, 
                        convertToInventoryResponse(updatedInventory));

        logger.info("Successfully reduced {} units from allocation for product ID: {} at warehouse: {}", 
                   quantity, productId, warehouseLocation);
    }

    /**
     * Transfer inventory between warehouses
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "'product:' + #productId + ':warehouse:' + #fromWarehouse"),
        @CacheEvict(value = "inventory", key = "'product:' + #productId + ':warehouse:' + #toWarehouse"),
        @CacheEvict(value = "inventory", key = "'product:' + #productId"),
        @CacheEvict(value = "inventory", key = "'consolidated:' + #productId"),
        @CacheEvict(value = "inventory", key = "'product-locations:' + #productId")
    })
    public void transferInventoryBetweenWarehouses(Long productId, String fromWarehouse, String toWarehouse, 
                                                  Integer quantity, String reason) {
        logger.info("Transferring {} units for product ID: {} from {} to {}", 
                   quantity, productId, fromWarehouse, toWarehouse);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        // Get source inventory
        Inventory fromInventory = inventoryRepository.findByProductIdAndWarehouseLocation(productId, fromWarehouse)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for product ID: " + productId + " at warehouse: " + fromWarehouse));

        // Check availability
        if (fromInventory.getQuantityAvailable() < quantity) {
            throw new InsufficientStockException(productId, quantity, fromInventory.getQuantityAvailable());
        }

        // Get or create destination inventory
        Inventory toInventory = inventoryRepository.findByProductIdAndWarehouseLocation(productId, toWarehouse)
                .orElseGet(() -> createInitialInventoryForWarehouse(product, toWarehouse));

        // Perform transfer
        fromInventory.setQuantityOnHand(fromInventory.getQuantityOnHand() - quantity);
        toInventory.setQuantityOnHand(toInventory.getQuantityOnHand() + quantity);

        inventoryRepository.save(fromInventory);
        inventoryRepository.save(toInventory);

        // Create stock movement records
        createStockMovementWithWarehouse(product, fromWarehouse, StockMovementType.TRANSFER_OUT, -quantity, 
                          "Transfer to " + toWarehouse + ": " + reason);
        createStockMovementWithWarehouse(product, toWarehouse, StockMovementType.TRANSFER_IN, quantity, 
                          "Transfer from " + fromWarehouse + ": " + reason);

        logger.info("Successfully transferred {} units for product ID: {} from {} to {}", 
                   quantity, productId, fromWarehouse, toWarehouse);
    }

    /**
     * Check low stock levels with caching
     */
    @Cacheable(value = "inventory", key = "'low-stock-alerts'")
    public List<LowStockAlert> checkLowStockLevels() {
        logger.debug("Checking for low stock levels");

        List<Product> lowStockProducts = productRepository.findLowStockProducts();
        
        return lowStockProducts.stream()
                .map(product -> {
                    Inventory inventory = inventoryRepository.findByProductId(product.getId())
                            .orElse(null);
                    
                    if (inventory != null) {
                        return LowStockAlert.builder()
                                .productId(product.getId())
                                .productName(product.getName())
                                .sku(product.getSku())
                                .currentStock(inventory.getQuantityAvailable())
                                .reorderLevel(product.getReorderLevel())
                                .reorderQuantity(product.getReorderQuantity())
                                .supplierName(product.getSupplier().getName())
                                .alertTimestamp(LocalDateTime.now())
                                .build();
                    }
                    return null;
                })
                .filter(alert -> alert != null)
                .collect(Collectors.toList());
    }

    /**
     * Get inventory movements for a product with caching
     */
    @Cacheable(value = "inventory", key = "'movements:' + #productId + ':' + #limit")
    public List<StockMovement> getInventoryMovements(Long productId, int limit) {
        logger.debug("Fetching inventory movements for product ID: {}", productId);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        return stockMovementRepository.findByProductIdOrderByCreatedAtDesc(productId, limit);
    }

    /**
     * Get total inventory value with caching
     */
    @Cacheable(value = "inventory", key = "'total-value'")
    public InventoryValueSummary getTotalInventoryValue() {
        logger.debug("Calculating total inventory value");

        List<Inventory> allInventory = inventoryRepository.findAll();
        
        return allInventory.stream()
                .collect(InventoryValueSummary::new,
                        (summary, inventory) -> {
                            if (inventory.getProduct() != null) {
                                summary.addProduct(inventory.getQuantityOnHand(), 
                                                 inventory.getProduct().getCostPrice());
                            }
                        },
                        InventoryValueSummary::combine);
    }

    /**
     * Event listener for order created events
     */
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        logger.info("Handling order created event for order ID: {}", event.getOrderId());
        
        // This would typically process inventory allocation for order items
        // Implementation depends on OrderCreatedEvent structure
    }

    /**
     * Event listener for order cancelled events
     */
    @EventListener
    public void handleOrderCancelled(OrderCancelledEvent event) {
        logger.info("Handling order cancelled event for order ID: {}", event.getOrderId());
        
        // This would typically release allocated inventory
        // Implementation depends on OrderCancelledEvent structure
    }

    /**
     * Create initial inventory record for a product
     */
    private Inventory createInitialInventory(Product product) {
        return createInitialInventoryForWarehouse(product, "MAIN");
    }

    /**
     * Create initial inventory record for a product at specific warehouse
     */
    private Inventory createInitialInventoryForWarehouse(Product product, String warehouseLocation) {
        Inventory inventory = new Inventory();
        inventory.setProduct(product);
        inventory.setWarehouseLocation(warehouseLocation);
        inventory.setQuantityOnHand(0);
        inventory.setQuantityAllocated(0);
        inventory.setLastCountedAt(LocalDateTime.now());
        
        return inventoryRepository.save(inventory);
    }

    /**
     * Create stock movement record
     */
    private void createStockMovement(Product product, StockMovementType type, Integer quantity, String reason) {
        createStockMovementWithWarehouse(product, "MAIN", type, quantity, reason);
    }

    /**
     * Create stock movement record with warehouse location
     */
    private void createStockMovementWithWarehouse(Product product, String warehouseLocation, 
                                                 StockMovementType type, Integer quantity, String reason) {
        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setMovementType(type);
        movement.setQuantity(quantity);
        movement.setReason(reason);
        movement.setMovementDate(LocalDateTime.now());
        // Note: StockMovement entity would need warehouseLocation field for full multi-warehouse support
        
        stockMovementRepository.save(movement);
    }

    /**
     * Get current authenticated user ID
     */
    private String getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
                return userPrincipal.getId().toString();
            }
            return "SYSTEM";
        } catch (Exception e) {
            logger.warn("Failed to get current user ID, using SYSTEM", e);
            return "SYSTEM";
        }
    }

    /**
     * Convert Inventory entity to InventoryResponse DTO
     */
    private InventoryResponse convertToInventoryResponse(Inventory inventory) {
        return InventoryResponse.builder()
                .id(inventory.getId())
                .productId(inventory.getProduct().getId())
                .productName(inventory.getProduct().getName())
                .sku(inventory.getProduct().getSku())
                .warehouseLocation(inventory.getWarehouseLocation())
                .quantityOnHand(inventory.getQuantityOnHand())
                .quantityAllocated(inventory.getQuantityAllocated())
                .quantityAvailable(inventory.getQuantityAvailable())
                .reorderLevel(inventory.getProduct().getReorderLevel())
                .reorderQuantity(inventory.getProduct().getReorderQuantity())
                .isLowStock(inventory.getQuantityAvailable() <= inventory.getProduct().getReorderLevel())
                .lastCountedAt(inventory.getLastCountedAt())
                .createdAt(inventory.getCreatedAt())
                .updatedAt(inventory.getUpdatedAt())
                .build();
    }

    /**
     * Get all inventory with filtering
     */
    public org.springframework.data.domain.Page<InventoryResponse> getAllInventory(String warehouseLocation, Boolean lowStock, Boolean outOfStock, org.springframework.data.domain.Pageable pageable) {
        logger.debug("Fetching all inventory with filters - warehouse: {}, lowStock: {}, outOfStock: {}", warehouseLocation, lowStock, outOfStock);
        
        org.springframework.data.domain.Page<Inventory> inventories = inventoryRepository.findInventoryWithFilters(warehouseLocation, lowStock, outOfStock, pageable);
        return inventories.map(this::convertToInventoryResponse);
    }

    /**
     * Search inventory
     */
    public org.springframework.data.domain.Page<InventoryResponse> searchInventory(String searchTerm, org.springframework.data.domain.Pageable pageable) {
        logger.debug("Searching inventory with term: {}", searchTerm);
        
        org.springframework.data.domain.Page<Inventory> inventories = inventoryRepository.searchInventory(searchTerm, pageable);
        return inventories.map(this::convertToInventoryResponse);
    }

    /**
     * Get low stock products
     */
    public List<LowStockAlert> getLowStockProducts() {
        return checkLowStockLevels();
    }

    /**
     * Get out of stock products
     */
    public List<InventoryResponse> getOutOfStockProducts() {
        logger.debug("Fetching out of stock products");
        
        List<Inventory> outOfStockInventories = inventoryRepository.findOutOfStockProducts();
        return outOfStockInventories.stream()
                .map(this::convertToInventoryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get inventory movements with filtering
     */
    public org.springframework.data.domain.Page<com.ecommerce.inventory.dto.response.StockMovementResponse> getInventoryMovements(
            Long productId, String movementType, LocalDateTime startDate, LocalDateTime endDate, org.springframework.data.domain.Pageable pageable) {
        
        logger.debug("Fetching inventory movements with filters");
        
        org.springframework.data.domain.Page<StockMovement> movements = stockMovementRepository.findMovementsWithFilters(
            productId, movementType, startDate, endDate, pageable);
        return movements.map(this::convertToStockMovementResponse);
    }

    /**
     * Get product inventory movements
     */
    public org.springframework.data.domain.Page<com.ecommerce.inventory.dto.response.StockMovementResponse> getProductInventoryMovements(
            Long productId, org.springframework.data.domain.Pageable pageable) {
        
        logger.debug("Fetching inventory movements for product ID: {}", productId);
        
        org.springframework.data.domain.Page<StockMovement> movements = stockMovementRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable);
        return movements.map(this::convertToStockMovementResponse);
    }

    /**
     * Get inventory valuation
     */
    public java.util.Map<String, Object> getInventoryValuation() {
        logger.debug("Calculating inventory valuation");
        
        java.util.Map<String, Object> valuation = new java.util.HashMap<>();
        
        List<Inventory> allInventory = inventoryRepository.findAll();
        
        java.math.BigDecimal totalCostValue = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalSellingValue = java.math.BigDecimal.ZERO;
        int totalProducts = 0;
        int totalQuantity = 0;
        
        for (Inventory inventory : allInventory) {
            if (inventory.getProduct() != null) {
                int quantity = inventory.getQuantityOnHand();
                totalQuantity += quantity;
                totalProducts++;
                
                java.math.BigDecimal costPrice = inventory.getProduct().getCostPrice();
                java.math.BigDecimal sellingPrice = inventory.getProduct().getSellingPrice();
                
                if (costPrice != null) {
                    totalCostValue = totalCostValue.add(costPrice.multiply(java.math.BigDecimal.valueOf(quantity)));
                }
                if (sellingPrice != null) {
                    totalSellingValue = totalSellingValue.add(sellingPrice.multiply(java.math.BigDecimal.valueOf(quantity)));
                }
            }
        }
        
        valuation.put("totalCostValue", totalCostValue);
        valuation.put("totalSellingValue", totalSellingValue);
        valuation.put("potentialProfit", totalSellingValue.subtract(totalCostValue));
        valuation.put("totalProducts", totalProducts);
        valuation.put("totalQuantity", totalQuantity);
        
        return valuation;
    }

    /**
     * Get inventory statistics
     */
    public java.util.Map<String, Object> getInventoryStatistics() {
        logger.debug("Generating inventory statistics");
        
        java.util.Map<String, Object> statistics = new java.util.HashMap<>();
        
        long totalProducts = inventoryRepository.countDistinctProducts();
        long lowStockProducts = inventoryRepository.countLowStockProducts();
        long outOfStockProducts = inventoryRepository.countOutOfStockProducts();
        
        statistics.put("totalProducts", totalProducts);
        statistics.put("lowStockProducts", lowStockProducts);
        statistics.put("outOfStockProducts", outOfStockProducts);
        statistics.put("inStockProducts", totalProducts - outOfStockProducts);
        
        return statistics;
    }

    /**
     * Generate inventory report
     */
    public java.util.Map<String, Object> generateInventoryReport(LocalDateTime startDate, LocalDateTime endDate, String reportType) {
        logger.debug("Generating {} inventory report from {} to {}", reportType, startDate, endDate);
        
        java.util.Map<String, Object> report = new java.util.HashMap<>();
        
        // Add basic inventory statistics
        report.putAll(getInventoryStatistics());
        
        // Add valuation information
        report.putAll(getInventoryValuation());
        
        // Add low stock alerts
        report.put("lowStockAlerts", getLowStockProducts());
        
        // Add report metadata
        report.put("reportType", reportType);
        report.put("generatedAt", LocalDateTime.now());
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        
        return report;
    }

    /**
     * Bulk adjust inventory
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public int bulkAdjustInventory(List<InventoryAdjustmentRequest> requests) {
        logger.info("Bulk adjusting inventory for {} products", requests.size());
        
        int adjustedCount = 0;
        for (InventoryAdjustmentRequest request : requests) {
            try {
                adjustInventory(request.getProductId(), request);
                adjustedCount++;
            } catch (Exception e) {
                logger.warn("Failed to adjust inventory for product {}: {}", request.getProductId(), e.getMessage());
            }
        }
        
        logger.info("Successfully bulk adjusted inventory for {} out of {} products", adjustedCount, requests.size());
        return adjustedCount;
    }

    /**
     * Check inventory availability
     */
    public java.util.Map<String, Object> checkInventoryAvailability(List<java.util.Map<String, Object>> items) {
        logger.debug("Checking inventory availability for {} items", items.size());
        
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        java.util.List<java.util.Map<String, Object>> itemAvailability = new java.util.ArrayList<>();
        boolean allAvailable = true;
        
        for (java.util.Map<String, Object> item : items) {
            Long productId = Long.valueOf(item.get("productId").toString());
            Integer requestedQuantity = Integer.valueOf(item.get("quantity").toString());
            
            try {
                InventoryResponse inventory = getInventoryByProduct(productId);
                boolean available = inventory.getQuantityAvailable() >= requestedQuantity;
                
                java.util.Map<String, Object> itemResult = new java.util.HashMap<>();
                itemResult.put("productId", productId);
                itemResult.put("requestedQuantity", requestedQuantity);
                itemResult.put("availableQuantity", inventory.getQuantityAvailable());
                itemResult.put("available", available);
                
                itemAvailability.add(itemResult);
                
                if (!available) {
                    allAvailable = false;
                }
            } catch (Exception e) {
                logger.warn("Error checking availability for product {}: {}", productId, e.getMessage());
                allAvailable = false;
            }
        }
        
        result.put("allAvailable", allAvailable);
        result.put("items", itemAvailability);
        
        return result;
    }

    /**
     * Get reorder recommendations
     */
    public List<java.util.Map<String, Object>> getReorderRecommendations() {
        logger.debug("Generating reorder recommendations");
        
        List<LowStockAlert> lowStockAlerts = getLowStockProducts();
        
        return lowStockAlerts.stream()
                .map(alert -> {
                    java.util.Map<String, Object> recommendation = new java.util.HashMap<>();
                    recommendation.put("productId", alert.getProductId());
                    recommendation.put("productName", alert.getProductName());
                    recommendation.put("sku", alert.getSku());
                    recommendation.put("currentStock", alert.getCurrentStock());
                    recommendation.put("reorderLevel", alert.getReorderLevel());
                    recommendation.put("recommendedQuantity", alert.getReorderQuantity());
                    recommendation.put("supplierName", alert.getSupplierName());
                    recommendation.put("priority", alert.getCurrentStock() == 0 ? "HIGH" : "MEDIUM");
                    return recommendation;
                })
                .collect(Collectors.toList());
    }

    /**
     * Update reorder levels
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public int updateReorderLevels(List<java.util.Map<String, Object>> updates) {
        logger.info("Updating reorder levels for {} products", updates.size());
        
        int updatedCount = 0;
        for (java.util.Map<String, Object> update : updates) {
            try {
                Long productId = Long.valueOf(update.get("productId").toString());
                Integer reorderLevel = Integer.valueOf(update.get("reorderLevel").toString());
                Integer reorderQuantity = update.containsKey("reorderQuantity") ? 
                    Integer.valueOf(update.get("reorderQuantity").toString()) : null;
                
                Product product = productRepository.findById(productId)
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));
                
                product.setReorderLevel(reorderLevel);
                if (reorderQuantity != null) {
                    product.setReorderQuantity(reorderQuantity);
                }
                
                productRepository.save(product);
                updatedCount++;
            } catch (Exception e) {
                logger.warn("Failed to update reorder levels for product: {}", e.getMessage());
            }
        }
        
        logger.info("Successfully updated reorder levels for {} out of {} products", updatedCount, updates.size());
        return updatedCount;
    }

    /**
     * Convert StockMovement entity to StockMovementResponse DTO
     */
    private com.ecommerce.inventory.dto.response.StockMovementResponse convertToStockMovementResponse(StockMovement movement) {
        return com.ecommerce.inventory.dto.response.StockMovementResponse.builder()
                .id(movement.getId())
                .productId(movement.getProduct().getId())
                .productName(movement.getProduct().getName())
                .productSku(movement.getProduct().getSku())
                .movementType(movement.getMovementType())
                .quantity(movement.getQuantity())
                .reason(movement.getReason())
                .createdAt(movement.getCreatedAt())
                .build();
    }

    /**
     * Inner class for inventory value summary
     */
    public static class InventoryValueSummary {
        private java.math.BigDecimal totalValue = java.math.BigDecimal.ZERO;
        private int totalProducts = 0;

        public void addProduct(int quantity, java.math.BigDecimal costPrice) {
            if (costPrice != null) {
                totalValue = totalValue.add(costPrice.multiply(java.math.BigDecimal.valueOf(quantity)));
            }
            totalProducts++;
        }

        public void combine(InventoryValueSummary other) {
            this.totalValue = this.totalValue.add(other.totalValue);
            this.totalProducts += other.totalProducts;
        }

        public java.math.BigDecimal getTotalValue() { return totalValue; }
        public int getTotalProducts() { return totalProducts; }
    }
}.getSku())
                .warehouseLocation(inventory.getWarehouseLocation())
                .quantityOnHand(inventory.getQuantityOnHand())
                .quantityAllocated(inventory.getQuantityAllocated())
                .quantityAvailable(inventory.getQuantityAvailable())
                .reorderLevel(inventory.getProduct().getReorderLevel())
                .reorderQuantity(inventory.getProduct().getReorderQuantity())
                .isLowStock(inventory.getQuantityAvailable() <= inventory.getProduct().getReorderLevel())
                .lastCountedAt(inventory.getLastCountedAt())
                .createdAt(inventory.getCreatedAt())
                .updatedAt(inventory.getUpdatedAt())
                .build();
    }

    // Event classes (these would typically be in separate files)
    public static class LowStockEvent {
        private final Object source;
        private final Long productId;
        private final Integer currentStock;
        private final Integer reorderLevel;

        public LowStockEvent(Object source, Long productId, Integer currentStock, Integer reorderLevel) {
            this.source = source;
            this.productId = productId;
            this.currentStock = currentStock;
            this.reorderLevel = reorderLevel;
        }

        // Getters
        public Object getSource() { return source; }
        public Long getProductId() { return productId; }
        public Integer getCurrentStock() { return currentStock; }
        public Integer getReorderLevel() { return reorderLevel; }
    }

    public static class OrderCreatedEvent {
        private final Long orderId;

        public OrderCreatedEvent(Long orderId) {
            this.orderId = orderId;
        }

        public Long getOrderId() { return orderId; }
    }

    public static class OrderCancelledEvent {
        private final Long orderId;

        public OrderCancelledEvent(Long orderId) {
            this.orderId = orderId;
        }

        public Long getOrderId() { return orderId; }
    }

    /**
     * Inventory value summary class
     */
    public static class InventoryValueSummary {
        private int totalProducts = 0;
        private java.math.BigDecimal totalValue = java.math.BigDecimal.ZERO;

        public void addProduct(Integer quantity, java.math.BigDecimal costPrice) {
            if (quantity != null && costPrice != null) {
                totalProducts += quantity;
                totalValue = totalValue.add(costPrice.multiply(java.math.BigDecimal.valueOf(quantity)));
            }
        }

        public InventoryValueSummary combine(InventoryValueSummary other) {
            this.totalProducts += other.totalProducts;
            this.totalValue = this.totalValue.add(other.totalValue);
            return this;
        }

        // Getters
        public int getTotalProducts() { return totalProducts; }
        public java.math.BigDecimal getTotalValue() { return totalValue; }
    }

    // ========== HEALTH CHECK SUPPORT METHODS ==========

    /**
     * Find low stock products for health checks
     */
    @Transactional(readOnly = true)
    public List<Product> findLowStockProducts() {
        logger.debug("Finding low stock products for health check");
        
        try {
            var lowStockInventory = inventoryRepository.findLowStockInventory();
            return lowStockInventory.stream()
                .map(item -> {
                    Product product = new Product();
                    product.setId(item.getInventory().getProduct().getId());
                    product.setSku(item.getProductSku());
                    product.setName(item.getProductName());
                    return product;
                })
                .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error finding low stock products", e);
            throw new RuntimeException("Failed to find low stock products", e);
        }
    }
}