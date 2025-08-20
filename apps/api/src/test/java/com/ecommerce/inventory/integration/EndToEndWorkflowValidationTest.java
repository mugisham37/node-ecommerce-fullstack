package com.ecommerce.inventory.integration;

import com.ecommerce.inventory.dto.request.*;
import com.ecommerce.inventory.dto.response.*;
import com.ecommerce.inventory.entity.*;
import com.ecommerce.inventory.event.inventory.StockUpdatedEvent;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.event.order.OrderStatusChangedEvent;
import com.ecommerce.inventory.repository.*;
import com.ecommerce.inventory.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-End Workflow Validation Tests
 * 
 * This test class validates complete order processing workflows from creation to fulfillment,
 * verifies inventory allocation and release mechanisms, tests event-driven architecture,
 * and validates caching strategies under load.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
@AutoConfigureWebMvc
@RecordApplicationEvents
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class EndToEndWorkflowValidationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductService productService;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private CacheService cacheService;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private ApplicationEvents applicationEvents;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private OrderRepository orderRepository;

    private Long testProductId;
    private Long testCategoryId;
    private Long testSupplierId;
    private String testProductSku;

    @BeforeEach
    void setUp() {
        // Clear cache before each test
        cacheService.clearAllCaches();
        
        // Set up test data
        setupTestData();
    }

    private void setupTestData() {
        // Create test category
        CategoryCreateRequest categoryRequest = new CategoryCreateRequest();
        categoryRequest.setName("Test Category");
        categoryRequest.setDescription("Test category for E2E tests");
        CategoryResponse category = categoryService.createCategory(categoryRequest);
        testCategoryId = category.getId();

        // Create test supplier
        SupplierCreateRequest supplierRequest = new SupplierCreateRequest();
        supplierRequest.setName("Test Supplier");
        supplierRequest.setContactEmail("supplier@test.com");
        supplierRequest.setContactPhone("123-456-7890");
        supplierRequest.setAddress("123 Supplier St");
        SupplierResponse supplier = supplierService.createSupplier(supplierRequest);
        testSupplierId = supplier.getId();

        // Create test product
        ProductCreateRequest productRequest = new ProductCreateRequest();
        productRequest.setName("Test Product");
        productRequest.setSku("TEST-SKU-001");
        productRequest.setCategoryId(testCategoryId);
        productRequest.setSupplierId(testSupplierId);
        productRequest.setCostPrice(BigDecimal.valueOf(10.00));
        productRequest.setSellingPrice(BigDecimal.valueOf(20.00));
        productRequest.setReorderLevel(5);
        productRequest.setReorderQuantity(50);
        ProductResponse product = productService.createProduct(productRequest);
        testProductId = product.getId();
        testProductSku = product.getSku();

        // Initialize inventory
        InventoryAdjustmentRequest inventoryRequest = new InventoryAdjustmentRequest();
        inventoryRequest.setQuantity(100);
        inventoryRequest.setReason("Initial stock");
        inventoryRequest.setMovementType(StockMovementType.ADJUSTMENT);
        inventoryService.adjustInventory(testProductId, inventoryRequest);
    }

    /**
     * Test complete order processing workflow from creation to fulfillment
     * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
     */
    @Test
    @Order(1)
    @WithMockUser(roles = "EMPLOYEE")
    @Transactional
    void testCompleteOrderProcessingWorkflow() throws Exception {
        // Step 1: Create order
        OrderCreateRequest orderRequest = new OrderCreateRequest();
        orderRequest.setCustomerName("John Doe");
        orderRequest.setCustomerEmail("john@example.com");
        orderRequest.setCustomerPhone("555-1234");
        orderRequest.setShippingAddress("123 Main St, City, State 12345");
        
        OrderItemRequest orderItem = new OrderItemRequest();
        orderItem.setProductId(testProductId);
        orderItem.setQuantity(10);
        orderItem.setUnitPrice(BigDecimal.valueOf(20.00));
        orderRequest.setOrderItems(List.of(orderItem));

        String orderJson = objectMapper.writeValueAsString(orderRequest);

        MvcResult createResult = mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(orderJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerName").value("John Doe"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.orderItems").isArray())
                .andExpect(jsonPath("$.orderItems[0].quantity").value(10))
                .andReturn();

        String responseContent = createResult.getResponse().getContentAsString();
        OrderResponse createdOrder = objectMapper.readValue(responseContent, OrderResponse.class);
        Long orderId = createdOrder.getId();

        // Verify inventory allocation
        InventoryResponse inventory = inventoryService.getInventoryByProduct(testProductId);
        assertThat(inventory.getQuantityAllocated()).isEqualTo(10);
        assertThat(inventory.getQuantityAvailable()).isEqualTo(90);

        // Verify OrderCreatedEvent was published
        assertThat(applicationEvents.stream(OrderCreatedEvent.class)).hasSize(1);

        // Step 2: Confirm order
        mockMvc.perform(put("/api/orders/{id}/status", orderId)
                .param("status", "CONFIRMED")
                .param("reason", "Payment confirmed"))
                .andExpect(status().isOk())
                .andExpected(jsonPath("$.status").value("CONFIRMED"));

        // Verify OrderStatusChangedEvent was published
        assertThat(applicationEvents.stream(OrderStatusChangedEvent.class)).hasSizeGreaterThan(0);

        // Step 3: Process fulfillment
        FulfillmentRequest fulfillmentRequest = new FulfillmentRequest();
        fulfillmentRequest.setTrackingNumber("TRACK123456");
        fulfillmentRequest.setShippingCarrier("UPS");
        fulfillmentRequest.setNotes("Shipped via ground");

        String fulfillmentJson = objectMapper.writeValueAsString(fulfillmentRequest);

        mockMvc.perform(post("/api/orders/{id}/fulfill", orderId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(fulfillmentJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"));

        // Verify inventory was properly reduced
        InventoryResponse finalInventory = inventoryService.getInventoryByProduct(testProductId);
        assertThat(finalInventory.getQuantityOnHand()).isEqualTo(90);
        assertThat(finalInventory.getQuantityAllocated()).isEqualTo(0);
        assertThat(finalInventory.getQuantityAvailable()).isEqualTo(90);

        // Step 4: Complete order
        mockMvc.perform(put("/api/orders/{id}/status", orderId)
                .param("status", "DELIVERED")
                .param("reason", "Package delivered"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"));

        // Verify final order state
        OrderResponse finalOrder = orderService.getOrderById(orderId);
        assertThat(finalOrder.getStatus()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(finalOrder.getTrackingNumber()).isEqualTo("TRACK123456");
    }

    /**
     * Test inventory allocation and release mechanisms
     * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
     */
    @Test
    @Order(2)
    @WithMockUser(roles = "MANAGER")
    @Transactional
    void testInventoryAllocationAndReleaseMechanisms() throws Exception {
        // Test allocation
        boolean allocated = inventoryService.allocateInventory(testProductId, 25, "ORDER-001");
        assertThat(allocated).isTrue();

        InventoryResponse inventory = inventoryService.getInventoryByProduct(testProductId);
        assertThat(inventory.getQuantityAllocated()).isEqualTo(25);
        assertThat(inventory.getQuantityAvailable()).isEqualTo(75);

        // Test insufficient stock allocation
        boolean overAllocated = inventoryService.allocateInventory(testProductId, 80, "ORDER-002");
        assertThat(overAllocated).isFalse();

        // Test release
        inventoryService.releaseInventory(testProductId, 15, "ORDER-001");
        
        InventoryResponse updatedInventory = inventoryService.getInventoryByProduct(testProductId);
        assertThat(updatedInventory.getQuantityAllocated()).isEqualTo(10);
        assertThat(updatedInventory.getQuantityAvailable()).isEqualTo(90);

        // Test order cancellation and inventory release
        OrderCreateRequest orderRequest = new OrderCreateRequest();
        orderRequest.setCustomerName("Jane Doe");
        orderRequest.setCustomerEmail("jane@example.com");
        orderRequest.setShippingAddress("456 Oak St, City, State 12345");
        
        OrderItemRequest orderItem = new OrderItemRequest();
        orderItem.setProductId(testProductId);
        orderItem.setQuantity(20);
        orderItem.setUnitPrice(BigDecimal.valueOf(20.00));
        orderRequest.setOrderItems(List.of(orderItem));

        OrderResponse order = orderService.createOrder(orderRequest);
        
        // Verify allocation
        inventory = inventoryService.getInventoryByProduct(testProductId);
        assertThat(inventory.getQuantityAllocated()).isEqualTo(30); // 10 + 20

        // Cancel order
        orderService.cancelOrder(order.getId(), "Customer requested cancellation");

        // Verify inventory release
        InventoryResponse releasedInventory = inventoryService.getInventoryByProduct(testProductId);
        assertThat(releasedInventory.getQuantityAllocated()).isEqualTo(10); // Back to 10
        assertThat(releasedInventory.getQuantityAvailable()).isEqualTo(90);
    }

    /**
     * Test event-driven architecture with complex business scenarios
     * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
     */
    @Test
    @Order(3)
    @WithMockUser(roles = "MANAGER")
    void testEventDrivenArchitectureComplexScenarios() throws Exception {
        // Clear previous events
        applicationEvents.clear();

        // Scenario 1: Low stock event triggering
        InventoryAdjustmentRequest lowStockAdjustment = new InventoryAdjustmentRequest();
        lowStockAdjustment.setQuantity(3); // Below reorder level of 5
        lowStockAdjustment.setReason("Simulating low stock");
        lowStockAdjustment.setMovementType(StockMovementType.ADJUSTMENT);
        
        inventoryService.adjustInventory(testProductId, lowStockAdjustment);

        // Verify StockUpdatedEvent was published
        assertThat(applicationEvents.stream(StockUpdatedEvent.class)).hasSizeGreaterThan(0);

        // Scenario 2: Multiple concurrent orders triggering events
        CompletableFuture<OrderResponse> order1Future = CompletableFuture.supplyAsync(() -> {
            OrderCreateRequest request = createOrderRequest("Customer 1", 1);
            return orderService.createOrder(request);
        });

        CompletableFuture<OrderResponse> order2Future = CompletableFuture.supplyAsync(() -> {
            OrderCreateRequest request = createOrderRequest("Customer 2", 1);
            return orderService.createOrder(request);
        });

        CompletableFuture<OrderResponse> order3Future = CompletableFuture.supplyAsync(() -> {
            OrderCreateRequest request = createOrderRequest("Customer 3", 1);
            return orderService.createOrder(request);
        });

        // Wait for all orders to complete
        CompletableFuture.allOf(order1Future, order2Future, order3Future)
                .get(10, TimeUnit.SECONDS);

        // Verify multiple OrderCreatedEvents were published
        assertThat(applicationEvents.stream(OrderCreatedEvent.class)).hasSizeGreaterThanOrEqualTo(3);

        // Scenario 3: Event-driven cache invalidation
        ProductUpdateRequest updateRequest = new ProductUpdateRequest();
        updateRequest.setName("Updated Test Product");
        updateRequest.setSellingPrice(BigDecimal.valueOf(25.00));

        productService.updateProduct(testProductId, updateRequest);

        // Verify cache was invalidated (product should be fetched from database)
        ProductResponse cachedProduct = productService.getProductById(testProductId);
        assertThat(cachedProduct.getName()).isEqualTo("Updated Test Product");
        assertThat(cachedProduct.getSellingPrice()).isEqualByComparingTo(BigDecimal.valueOf(25.00));
    }

    /**
     * Test caching strategies and performance under load
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
     */
    @Test
    @Order(4)
    @WithMockUser(roles = "EMPLOYEE")
    void testCachingStrategiesAndPerformanceUnderLoad() throws Exception {
        // Warm up cache
        cacheService.warmupCache();

        // Test cache hit performance
        long startTime = System.currentTimeMillis();
        for (int i = 0; i < 100; i++) {
            productService.getProductById(testProductId);
        }
        long cacheHitTime = System.currentTimeMillis() - startTime;

        // Clear cache and test database hit performance
        cacheService.clearAllCaches();
        
        startTime = System.currentTimeMillis();
        for (int i = 0; i < 100; i++) {
            productService.getProductById(testProductId);
        }
        long dbHitTime = System.currentTimeMillis() - startTime;

        // Cache should be significantly faster
        assertThat(cacheHitTime).isLessThan(dbHitTime / 2);

        // Test cache invalidation on updates
        ProductResponse originalProduct = productService.getProductById(testProductId);
        
        ProductUpdateRequest updateRequest = new ProductUpdateRequest();
        updateRequest.setName("Cache Test Product");
        productService.updateProduct(testProductId, updateRequest);

        ProductResponse updatedProduct = productService.getProductById(testProductId);
        assertThat(updatedProduct.getName()).isEqualTo("Cache Test Product");
        assertThat(updatedProduct.getName()).isNotEqualTo(originalProduct.getName());

        // Test concurrent cache access
        List<CompletableFuture<ProductResponse>> futures = List.of(
            CompletableFuture.supplyAsync(() -> productService.getProductById(testProductId)),
            CompletableFuture.supplyAsync(() -> productService.getProductById(testProductId)),
            CompletableFuture.supplyAsync(() -> productService.getProductById(testProductId)),
            CompletableFuture.supplyAsync(() -> productService.getProductById(testProductId)),
            CompletableFuture.supplyAsync(() -> productService.getProductById(testProductId))
        );

        List<ProductResponse> results = futures.stream()
                .map(CompletableFuture::join)
                .toList();

        // All results should be identical (cached)
        assertThat(results).hasSize(5);
        assertThat(results).allMatch(product -> product.getName().equals("Cache Test Product"));

        // Test cache statistics
        var cacheStats = cacheService.getCacheStatistics();
        assertThat(cacheStats).isNotNull();
        assertThat(cacheStats.getHitCount()).isGreaterThan(0);
    }

    /**
     * Test complex multi-step workflow with rollback scenarios
     * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
     */
    @Test
    @Order(5)
    @WithMockUser(roles = "MANAGER")
    @Transactional
    void testComplexWorkflowWithRollbackScenarios() throws Exception {
        // Create order that will exceed available inventory
        OrderCreateRequest largeOrderRequest = new OrderCreateRequest();
        largeOrderRequest.setCustomerName("Large Order Customer");
        largeOrderRequest.setCustomerEmail("large@example.com");
        largeOrderRequest.setShippingAddress("789 Large St, City, State 12345");
        
        OrderItemRequest largeOrderItem = new OrderItemRequest();
        largeOrderItem.setProductId(testProductId);
        largeOrderItem.setQuantity(150); // More than available (100)
        largeOrderItem.setUnitPrice(BigDecimal.valueOf(20.00));
        largeOrderRequest.setOrderItems(List.of(largeOrderItem));

        // This should fail due to insufficient inventory
        String largeOrderJson = objectMapper.writeValueAsString(largeOrderRequest);
        
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(largeOrderJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Insufficient Stock"));

        // Verify inventory wasn't affected by failed order
        InventoryResponse inventory = inventoryService.getInventoryByProduct(testProductId);
        assertThat(inventory.getQuantityAllocated()).isEqualTo(0);
        assertThat(inventory.getQuantityAvailable()).isEqualTo(100);

        // Test partial fulfillment scenario
        OrderCreateRequest partialOrderRequest = new OrderCreateRequest();
        partialOrderRequest.setCustomerName("Partial Order Customer");
        partialOrderRequest.setCustomerEmail("partial@example.com");
        partialOrderRequest.setShippingAddress("456 Partial St, City, State 12345");
        
        OrderItemRequest partialOrderItem = new OrderItemRequest();
        partialOrderItem.setProductId(testProductId);
        partialOrderItem.setQuantity(30);
        partialOrderItem.setUnitPrice(BigDecimal.valueOf(20.00));
        partialOrderRequest.setOrderItems(List.of(partialOrderItem));

        OrderResponse partialOrder = orderService.createOrder(partialOrderRequest);

        // Confirm order
        orderService.updateOrderStatus(partialOrder.getId(), OrderStatus.CONFIRMED, "Payment confirmed");

        // Attempt partial fulfillment
        PartialFulfillmentRequest partialFulfillment = new PartialFulfillmentRequest();
        partialFulfillment.setQuantityShipped(20); // Ship only 20 out of 30
        partialFulfillment.setTrackingNumber("PARTIAL123");
        partialFulfillment.setShippingCarrier("FedEx");
        partialFulfillment.setNotes("Partial shipment - remaining items backordered");

        String partialFulfillmentJson = objectMapper.writeValueAsString(partialFulfillment);

        mockMvc.perform(post("/api/orders/{id}/partial-fulfill", partialOrder.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(partialFulfillmentJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIALLY_SHIPPED"));

        // Verify inventory reflects partial fulfillment
        InventoryResponse partialInventory = inventoryService.getInventoryByProduct(testProductId);
        assertThat(partialInventory.getQuantityOnHand()).isEqualTo(80); // 100 - 20 shipped
        assertThat(partialInventory.getQuantityAllocated()).isEqualTo(10); // 30 - 20 shipped
        assertThat(partialInventory.getQuantityAvailable()).isEqualTo(70); // 80 - 10
    }

    private OrderCreateRequest createOrderRequest(String customerName, int quantity) {
        OrderCreateRequest request = new OrderCreateRequest();
        request.setCustomerName(customerName);
        request.setCustomerEmail(customerName.toLowerCase().replace(" ", "") + "@example.com");
        request.setShippingAddress("123 Test St, City, State 12345");
        
        OrderItemRequest orderItem = new OrderItemRequest();
        orderItem.setProductId(testProductId);
        orderItem.setQuantity(quantity);
        orderItem.setUnitPrice(BigDecimal.valueOf(20.00));
        request.setOrderItems(List.of(orderItem));
        
        return request;
    }

    @AfterEach
    void tearDown() {
        // Clean up test data and clear caches
        cacheService.clearAllCaches();
    }
}