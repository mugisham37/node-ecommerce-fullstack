package com.ecommerce.inventory.entity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for JPA entity relationships and database operations
 */
@DataJpaTest
@ActiveProfiles("test")
class EntityRelationshipIntegrationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("JPA Relationships - Persist and fetch entities with relationships")
    void testJpaRelationships() {
        // Create and persist category
        Category category = new Category();
        category.setName("Electronics");
        category.setSlug("electronics");
        category.setActive(true);
        entityManager.persistAndFlush(category);

        // Create and persist supplier
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setContactEmail("supplier@test.com");
        supplier.setContactPhone("123-456-7890");
        supplier.setStatus(SupplierStatus.ACTIVE);
        entityManager.persistAndFlush(supplier);

        // Create and persist user
        User user = new User();
        user.setEmail("test@example.com");
        user.setPasswordHash("hashedpassword");
        user.setFirstName("Test");
        user.setLastName("User");
        user.setRole(Role.MANAGER);
        user.setActive(true);
        entityManager.persistAndFlush(user);

        // Create and persist product
        Product product = new Product();
        product.setName("Test Product");
        product.setSku("TEST-001");
        product.setCategory(category);
        product.setSupplier(supplier);
        product.setCostPrice(BigDecimal.valueOf(10.00));
        product.setSellingPrice(BigDecimal.valueOf(15.00));
        product.setReorderLevel(5);
        product.setActive(true);
        entityManager.persistAndFlush(product);

        // Create and persist inventory
        Inventory inventory = new Inventory();
        inventory.setProduct(product);
        inventory.setWarehouseLocation("MAIN");
        inventory.setQuantityOnHand(100);
        inventory.setQuantityAllocated(0);
        inventory.setLastCountedAt(LocalDateTime.now());
        entityManager.persistAndFlush(inventory);

        // Create and persist stock movement
        StockMovement stockMovement = new StockMovement();
        stockMovement.setProduct(product);
        stockMovement.setMovementType(StockMovementType.INBOUND);
        stockMovement.setQuantity(100);
        stockMovement.setReason("Initial stock");
        stockMovement.setWarehouseLocation("MAIN");
        stockMovement.setUser(user);
        stockMovement.setCreatedAt(LocalDateTime.now());
        entityManager.persistAndFlush(stockMovement);

        // Create and persist order
        Order order = new Order();
        order.setOrderNumber("ORD-TEST-001");
        order.setCustomerName("John Doe");
        order.setCustomerEmail("john@example.com");
        order.setShippingAddress("123 Main St");
        order.setStatus(OrderStatus.PENDING);
        order.setSubtotal(BigDecimal.valueOf(30.00));
        order.setTaxAmount(BigDecimal.valueOf(2.40));
        order.setShippingCost(BigDecimal.valueOf(5.00));
        order.setTotalAmount(BigDecimal.valueOf(37.40));
        order.setCreatedBy(user);
        entityManager.persistAndFlush(order);

        // Create and persist order item
        OrderItem orderItem = new OrderItem();
        orderItem.setOrder(order);
        orderItem.setProduct(product);
        orderItem.setQuantity(2);
        orderItem.setUnitPrice(BigDecimal.valueOf(15.00));
        orderItem.setTotalPrice(BigDecimal.valueOf(30.00));
        entityManager.persistAndFlush(orderItem);

        // Clear persistence context to ensure fresh fetch
        entityManager.clear();

        // Verify relationships by fetching and checking
        Product fetchedProduct = entityManager.find(Product.class, product.getId());
        assertNotNull(fetchedProduct);
        assertEquals("Test Product", fetchedProduct.getName());
        assertEquals("TEST-001", fetchedProduct.getSku());
        
        // Verify category relationship
        assertNotNull(fetchedProduct.getCategory());
        assertEquals("Electronics", fetchedProduct.getCategory().getName());
        
        // Verify supplier relationship
        assertNotNull(fetchedProduct.getSupplier());
        assertEquals("Test Supplier", fetchedProduct.getSupplier().getName());

        // Verify inventory relationship (OneToOne)
        Inventory fetchedInventory = entityManager.find(Inventory.class, inventory.getId());
        assertNotNull(fetchedInventory);
        assertEquals(fetchedProduct.getId(), fetchedInventory.getProduct().getId());
        assertEquals(100, fetchedInventory.getQuantityOnHand());
        assertEquals(0, fetchedInventory.getQuantityAllocated());

        // Verify stock movement relationship
        StockMovement fetchedMovement = entityManager.find(StockMovement.class, stockMovement.getId());
        assertNotNull(fetchedMovement);
        assertEquals(fetchedProduct.getId(), fetchedMovement.getProduct().getId());
        assertEquals(StockMovementType.INBOUND, fetchedMovement.getMovementType());
        assertEquals(100, fetchedMovement.getQuantity());
        assertEquals(user.getId(), fetchedMovement.getUser().getId());

        // Verify order and order item relationships
        Order fetchedOrder = entityManager.find(Order.class, order.getId());
        assertNotNull(fetchedOrder);
        assertEquals("ORD-TEST-001", fetchedOrder.getOrderNumber());
        assertEquals(user.getId(), fetchedOrder.getCreatedBy().getId());

        OrderItem fetchedOrderItem = entityManager.find(OrderItem.class, orderItem.getId());
        assertNotNull(fetchedOrderItem);
        assertEquals(fetchedOrder.getId(), fetchedOrderItem.getOrder().getId());
        assertEquals(fetchedProduct.getId(), fetchedOrderItem.getProduct().getId());
        assertEquals(2, fetchedOrderItem.getQuantity());
        assertEquals(BigDecimal.valueOf(15.00), fetchedOrderItem.getUnitPrice());
        assertEquals(BigDecimal.valueOf(30.00), fetchedOrderItem.getTotalPrice());
    }

    @Test
    @DisplayName("Cascade Operations - Test cascade delete and orphan removal")
    void testCascadeOperations() {
        // Create and persist entities with cascade relationships
        Category category = new Category();
        category.setName("Test Category");
        category.setSlug("test-category");
        category.setActive(true);
        entityManager.persistAndFlush(category);

        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setContactEmail("supplier@test.com");
        supplier.setStatus(SupplierStatus.ACTIVE);
        entityManager.persistAndFlush(supplier);

        Product product = new Product();
        product.setName("Test Product");
        product.setSku("TEST-CASCADE-001");
        product.setCategory(category);
        product.setSupplier(supplier);
        product.setCostPrice(BigDecimal.valueOf(10.00));
        product.setSellingPrice(BigDecimal.valueOf(15.00));
        product.setActive(true);
        entityManager.persistAndFlush(product);

        // Create inventory with cascade ALL from product
        Inventory inventory = new Inventory();
        inventory.setProduct(product);
        inventory.setWarehouseLocation("MAIN");
        inventory.setQuantityOnHand(50);
        product.setInventory(inventory);
        entityManager.persistAndFlush(product);

        // Create stock movement with cascade ALL from product
        StockMovement stockMovement = new StockMovement();
        stockMovement.setProduct(product);
        stockMovement.setMovementType(StockMovementType.INBOUND);
        stockMovement.setQuantity(50);
        stockMovement.setReason("Test stock");
        stockMovement.setWarehouseLocation("MAIN");
        product.getStockMovements().add(stockMovement);
        entityManager.persistAndFlush(product);

        Long productId = product.getId();
        Long inventoryId = inventory.getId();
        Long stockMovementId = stockMovement.getId();

        // Clear context
        entityManager.clear();

        // Verify entities exist
        assertNotNull(entityManager.find(Product.class, productId));
        assertNotNull(entityManager.find(Inventory.class, inventoryId));
        assertNotNull(entityManager.find(StockMovement.class, stockMovementId));

        // Delete product - should cascade to inventory and stock movements
        Product productToDelete = entityManager.find(Product.class, productId);
        entityManager.remove(productToDelete);
        entityManager.flush();

        // Verify cascade delete worked
        assertNull(entityManager.find(Product.class, productId));
        assertNull(entityManager.find(Inventory.class, inventoryId));
        assertNull(entityManager.find(StockMovement.class, stockMovementId));
    }

    @Test
    @DisplayName("Optimistic Locking - Test version-based concurrency control")
    void testOptimisticLocking() {
        // Create and persist inventory with version field
        Category category = new Category();
        category.setName("Test Category");
        category.setSlug("test-category");
        category.setActive(true);
        entityManager.persistAndFlush(category);

        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setContactEmail("supplier@test.com");
        supplier.setStatus(SupplierStatus.ACTIVE);
        entityManager.persistAndFlush(supplier);

        Product product = new Product();
        product.setName("Test Product");
        product.setSku("TEST-VERSION-001");
        product.setCategory(category);
        product.setSupplier(supplier);
        product.setCostPrice(BigDecimal.valueOf(10.00));
        product.setSellingPrice(BigDecimal.valueOf(15.00));
        product.setActive(true);
        entityManager.persistAndFlush(product);

        Inventory inventory = new Inventory();
        inventory.setProduct(product);
        inventory.setWarehouseLocation("MAIN");
        inventory.setQuantityOnHand(100);
        inventory.setQuantityAllocated(0);
        entityManager.persistAndFlush(inventory);

        // Verify initial version
        assertEquals(0L, inventory.getVersion());

        // Update inventory
        inventory.setQuantityOnHand(90);
        entityManager.persistAndFlush(inventory);

        // Version should be incremented
        assertTrue(inventory.getVersion() > 0L);
    }
}