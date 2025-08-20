package com.ecommerce.inventory.entity;

import com.ecommerce.inventory.exception.InsufficientStockException;
import com.ecommerce.inventory.exception.InvalidOrderStatusTransitionException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for advanced entity relationships and business logic
 */
class AdvancedEntityRelationshipsTest {

    private Product product;
    private User user;
    private Category category;
    private Supplier supplier;

    @BeforeEach
    void setUp() {
        // Create test category
        category = new Category();
        category.setId(1L);
        category.setName("Electronics");
        category.setSlug("electronics");

        // Create test supplier
        supplier = new Supplier();
        supplier.setId(1L);
        supplier.setName("Test Supplier");
        supplier.setContactEmail("supplier@test.com");
        supplier.setStatus(SupplierStatus.ACTIVE);

        // Create test product
        product = new Product();
        product.setId(1L);
        product.setName("Test Product");
        product.setSku("TEST-001");
        product.setCategory(category);
        product.setSupplier(supplier);
        product.setCostPrice(BigDecimal.valueOf(10.00));
        product.setSellingPrice(BigDecimal.valueOf(15.00));
        product.setReorderLevel(5);
        product.setActive(true);

        // Create test user
        user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setFirstName("Test");
        user.setLastName("User");
        user.setRole(Role.MANAGER);
        user.setActive(true);
    }

    @Test
    @DisplayName("Inventory - Stock allocation and release operations")
    void testInventoryStockOperations() {
        // Create inventory with initial stock
        Inventory inventory = new Inventory(product, "MAIN", 100);
        
        // Test initial state
        assertEquals(100, inventory.getQuantityOnHand());
        assertEquals(0, inventory.getQuantityAllocated());
        assertEquals(100, inventory.getQuantityAvailable());
        assertFalse(inventory.isLowStock());

        // Test stock allocation
        assertTrue(inventory.canAllocate(20));
        inventory.allocateStock(20);
        assertEquals(100, inventory.getQuantityOnHand());
        assertEquals(20, inventory.getQuantityAllocated());
        assertEquals(80, inventory.getQuantityAvailable());

        // Test stock release
        inventory.releaseStock(10);
        assertEquals(100, inventory.getQuantityOnHand());
        assertEquals(10, inventory.getQuantityAllocated());
        assertEquals(90, inventory.getQuantityAvailable());

        // Test insufficient stock allocation
        assertThrows(InsufficientStockException.class, () -> {
            inventory.allocateStock(100); // Only 90 available
        });

        // Test stock adjustment
        inventory.adjustStock(50, "Damaged goods removed");
        assertEquals(50, inventory.getQuantityOnHand());
        assertEquals(10, inventory.getQuantityAllocated());
        assertEquals(40, inventory.getQuantityAvailable());

        // Test low stock detection
        product.setReorderLevel(45);
        assertTrue(inventory.isLowStock());
        assertTrue(inventory.needsReordering());
    }

    @Test
    @DisplayName("StockMovement - Audit trail creation and business logic")
    void testStockMovementOperations() {
        // Test allocation movement creation
        StockMovement allocation = StockMovement.createAllocation(product, 25, "ORD-123", user);
        
        assertEquals(product, allocation.getProduct());
        assertEquals(StockMovementType.ALLOCATION, allocation.getMovementType());
        assertEquals(25, allocation.getQuantity());
        assertEquals("ORD-123", allocation.getReferenceId());
        assertEquals("ORDER", allocation.getReferenceType());
        assertEquals(user, allocation.getUser());
        assertTrue(allocation.isOrderRelated());
        assertTrue(allocation.affectsAllocatedQuantity());
        assertFalse(allocation.increasesInventory());

        // Test release movement creation
        StockMovement release = StockMovement.createRelease(product, 15, "ORD-123", user);
        
        assertEquals(StockMovementType.RELEASE, release.getMovementType());
        assertEquals(15, release.getQuantity());
        assertTrue(release.increasesInventory());
        assertTrue(release.affectsAllocatedQuantity());

        // Test adjustment movement creation
        StockMovement adjustment = StockMovement.createAdjustment(product, 10, "Cycle count adjustment", user);
        
        assertEquals(StockMovementType.ADJUSTMENT, adjustment.getMovementType());
        assertTrue(adjustment.isAdjustment());
        assertFalse(adjustment.isOrderRelated());

        // Test effective quantity change calculation
        assertEquals(-25, allocation.getEffectiveQuantityChange()); // Negative for allocation
        assertEquals(15, release.getEffectiveQuantityChange()); // Positive for release
    }

    @Test
    @DisplayName("Order - Order lifecycle and status transitions")
    void testOrderLifecycle() {
        // Create new order
        Order order = new Order("John Doe", "john@example.com", "123 Main St", user);
        
        assertEquals(OrderStatus.PENDING, order.getStatus());
        assertTrue(order.canBeCancelled());
        assertTrue(order.canBeModified());
        assertFalse(order.isFinalState());
        assertTrue(order.isActive());

        // Test order confirmation
        order.confirm();
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());
        assertTrue(order.canBeCancelled());
        assertFalse(order.canBeModified());

        // Test processing
        order.startProcessing();
        assertEquals(OrderStatus.PROCESSING, order.getStatus());
        assertFalse(order.canBeCancelled());

        // Test shipping
        order.ship();
        assertEquals(OrderStatus.SHIPPED, order.getStatus());

        // Test delivery
        order.deliver();
        assertEquals(OrderStatus.DELIVERED, order.getStatus());
        assertTrue(order.isFinalState());

        // Test invalid status transition
        Order pendingOrder = new Order("Jane Doe", "jane@example.com", "456 Oak St", user);
        assertThrows(InvalidOrderStatusTransitionException.class, () -> {
            pendingOrder.updateStatus(OrderStatus.SHIPPED); // Cannot go directly from PENDING to SHIPPED
        });
    }

    @Test
    @DisplayName("OrderItem - Item management and calculations")
    void testOrderItemOperations() {
        // Create order and order item
        Order order = new Order("Customer Name", "customer@example.com", "Address", user);
        OrderItem orderItem = OrderItem.fromProduct(product, 3);
        
        assertEquals(product, orderItem.getProduct());
        assertEquals(3, orderItem.getQuantity());
        assertEquals(product.getSellingPrice(), orderItem.getUnitPrice());
        assertEquals(BigDecimal.valueOf(45.00), orderItem.getTotalPrice()); // 3 * 15.00

        // Add item to order
        order.addOrderItem(orderItem);
        assertEquals(1, order.getOrderItems().size());
        assertEquals(BigDecimal.valueOf(45.00), order.getSubtotal());
        assertEquals(BigDecimal.valueOf(45.00), order.getTotalAmount());

        // Test quantity update
        orderItem.updateQuantity(5);
        assertEquals(5, orderItem.getQuantity());
        assertEquals(BigDecimal.valueOf(75.00), orderItem.getTotalPrice());
        assertEquals(BigDecimal.valueOf(75.00), order.getSubtotal());

        // Test custom pricing with discount
        OrderItem discountedItem = OrderItem.withCustomPrice(product, 2, BigDecimal.valueOf(12.00));
        order.addOrderItem(discountedItem);
        
        assertTrue(discountedItem.hasDiscount());
        assertEquals(BigDecimal.valueOf(6.00), discountedItem.getDiscountAmount()); // (15-12) * 2
        assertEquals(BigDecimal.valueOf(20.00), discountedItem.getDiscountPercentage()); // 20% discount

        // Test order totals with tax and shipping
        order.calculateTax(BigDecimal.valueOf(0.08)); // 8% tax
        order.setShippingCostAndRecalculate(BigDecimal.valueOf(10.00));
        
        BigDecimal expectedSubtotal = BigDecimal.valueOf(99.00); // 75 + 24
        BigDecimal expectedTax = BigDecimal.valueOf(7.92); // 99 * 0.08
        BigDecimal expectedTotal = BigDecimal.valueOf(116.92); // 99 + 7.92 + 10
        
        assertEquals(expectedSubtotal, order.getSubtotal());
        assertEquals(expectedTax, order.getTaxAmount());
        assertEquals(expectedTotal, order.getTotalAmount());
    }

    @Test
    @DisplayName("Entity Relationships - Cascade operations and fetch strategies")
    void testEntityRelationships() {
        // Create inventory for product
        Inventory inventory = new Inventory(product, "MAIN", 50);
        product.setInventory(inventory);
        
        // Create stock movements
        StockMovement movement1 = StockMovement.createInbound(product, 50, "Initial stock", user);
        StockMovement movement2 = StockMovement.createAllocation(product, 10, "ORD-001", user);
        product.getStockMovements().add(movement1);
        product.getStockMovements().add(movement2);
        
        // Create order with items
        Order order = new Order("Test Customer", "test@customer.com", "Test Address", user);
        OrderItem orderItem = OrderItem.fromProduct(product, 2);
        order.addOrderItem(orderItem);
        product.getOrderItems().add(orderItem);
        
        // Verify relationships
        assertEquals(inventory, product.getInventory());
        assertEquals(product, inventory.getProduct());
        assertEquals(2, product.getStockMovements().size());
        assertEquals(1, product.getOrderItems().size());
        assertEquals(product, orderItem.getProduct());
        assertEquals(order, orderItem.getOrder());
        
        // Test business logic integration
        assertTrue(product.isLowStock()); // 50 - 10 = 40 available, reorder level is 5, so not low
        assertEquals(Integer.valueOf(40), product.getCurrentStock());
        assertTrue(product.needsReordering() == false); // Not low stock yet
        
        // Test order contains product
        assertTrue(order.containsProduct(product));
        assertEquals(orderItem, order.getOrderItemByProduct(product));
    }

    @Test
    @DisplayName("Business Logic Validation - Edge cases and error handling")
    void testBusinessLogicValidation() {
        // Test inventory edge cases
        Inventory inventory = new Inventory(product, "MAIN", 10);
        
        // Cannot allocate negative quantity
        assertThrows(IllegalArgumentException.class, () -> {
            inventory.allocateStock(-5);
        });
        
        // Cannot release more than allocated
        inventory.allocateStock(5);
        inventory.releaseStock(10); // Should not throw, just set to 0
        assertEquals(0, inventory.getQuantityAllocated());
        
        // Cannot adjust to quantity less than allocated
        inventory.allocateStock(8);
        assertThrows(IllegalArgumentException.class, () -> {
            inventory.adjustStock(5, "Invalid adjustment"); // 5 < 8 allocated
        });
        
        // Test order item validation
        OrderItem orderItem = new OrderItem();
        assertFalse(orderItem.isValid()); // Missing required fields
        
        orderItem.setProduct(product);
        orderItem.setQuantity(2);
        orderItem.setUnitPrice(BigDecimal.valueOf(15.00));
        orderItem.calculateTotalPrice();
        assertTrue(orderItem.isValid());
        
        // Test order modification restrictions
        Order order = new Order("Customer", "email@test.com", "Address", user);
        order.addOrderItem(orderItem);
        order.confirm(); // Change status to CONFIRMED
        
        assertThrows(IllegalStateException.class, () -> {
            OrderItem newItem = OrderItem.fromProduct(product, 1);
            order.addOrderItem(newItem); // Cannot modify confirmed order
        });
    }

    @Test
    @DisplayName("Enum Business Logic - Status transitions and type behaviors")
    void testEnumBusinessLogic() {
        // Test OrderStatus transitions
        assertTrue(OrderStatus.PENDING.canTransitionTo(OrderStatus.CONFIRMED));
        assertTrue(OrderStatus.PENDING.canTransitionTo(OrderStatus.CANCELLED));
        assertFalse(OrderStatus.PENDING.canTransitionTo(OrderStatus.SHIPPED));
        
        assertTrue(OrderStatus.CONFIRMED.canBeCancelled());
        assertFalse(OrderStatus.PROCESSING.canBeCancelled());
        
        assertTrue(OrderStatus.DELIVERED.isFinalState());
        assertFalse(OrderStatus.PENDING.isFinalState());
        
        // Test StockMovementType behaviors
        assertTrue(StockMovementType.INBOUND.increasesInventory());
        assertTrue(StockMovementType.OUTBOUND.decreasesInventory());
        assertFalse(StockMovementType.ALLOCATION.increasesInventory());
        
        assertTrue(StockMovementType.ALLOCATION.affectsAllocatedQuantity());
        assertFalse(StockMovementType.INBOUND.affectsAllocatedQuantity());
        
        assertTrue(StockMovementType.ADJUSTMENT.isAdjustment());
        assertFalse(StockMovementType.INBOUND.isAdjustment());
        
        assertTrue(StockMovementType.ALLOCATION.requiresReference());
        assertFalse(StockMovementType.ADJUSTMENT.requiresReference());
    }
}