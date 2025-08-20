package com.ecommerce.inventory.integration;

import com.ecommerce.inventory.dto.request.*;
import com.ecommerce.inventory.dto.response.*;
import com.ecommerce.inventory.entity.*;
import com.ecommerce.inventory.security.JwtTokenProvider;
import com.ecommerce.inventory.security.UserPrincipal;
import com.ecommerce.inventory.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Security and Performance Validation Tests
 * 
 * This test class verifies JWT authentication and authorization across all endpoints,
 * tests role-based access control with different user scenarios, validates system
 * performance under concurrent user load, and verifies monitoring and alerting systems.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
@AutoConfigureWebMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class SecurityAndPerformanceValidationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserService userService;

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

    private String adminToken;
    private String managerToken;
    private String employeeToken;
    private Long testProductId;
    private Long testCategoryId;
    private Long testSupplierId;

    @BeforeEach
    void setUp() {
        setupTestUsers();
        setupTestData();
    }

    private void setupTestUsers() {
        try {
            // Create admin user
            UserCreateRequest adminRequest = new UserCreateRequest();
            adminRequest.setEmail("admin@test.com");
            adminRequest.setPassword("admin123");
            adminRequest.setFirstName("Admin");
            adminRequest.setLastName("User");
            adminRequest.setRole(Role.ADMIN);
            UserResponse adminUser = userService.createUser(adminRequest);
            
            UserPrincipal adminPrincipal = UserPrincipal.create(adminUser.getId(), adminUser.getEmail(), 
                    adminUser.getFirstName() + " " + adminUser.getLastName(), adminUser.getRole());
            adminToken = jwtTokenProvider.generateAccessToken(adminPrincipal);

            // Create manager user
            UserCreateRequest managerRequest = new UserCreateRequest();
            managerRequest.setEmail("manager@test.com");
            managerRequest.setPassword("manager123");
            managerRequest.setFirstName("Manager");
            managerRequest.setLastName("User");
            managerRequest.setRole(Role.MANAGER);
            UserResponse managerUser = userService.createUser(managerRequest);
            
            UserPrincipal managerPrincipal = UserPrincipal.create(managerUser.getId(), managerUser.getEmail(), 
                    managerUser.getFirstName() + " " + managerUser.getLastName(), managerUser.getRole());
            managerToken = jwtTokenProvider.generateAccessToken(managerPrincipal);

            // Create employee user
            UserCreateRequest employeeRequest = new UserCreateRequest();
            employeeRequest.setEmail("employee@test.com");
            employeeRequest.setPassword("employee123");
            employeeRequest.setFirstName("Employee");
            employeeRequest.setLastName("User");
            employeeRequest.setRole(Role.EMPLOYEE);
            UserResponse employeeUser = userService.createUser(employeeRequest);
            
            UserPrincipal employeePrincipal = UserPrincipal.create(employeeUser.getId(), employeeUser.getEmail(), 
                    employeeUser.getFirstName() + " " + employeeUser.getLastName(), employeeUser.getRole());
            employeeToken = jwtTokenProvider.generateAccessToken(employeePrincipal);

        } catch (Exception e) {
            // Users might already exist, try to get tokens for existing users
            try {
                UserPrincipal adminPrincipal = UserPrincipal.create(1L, "admin@test.com", "Admin User", Role.ADMIN);
                adminToken = jwtTokenProvider.generateAccessToken(adminPrincipal);
                
                UserPrincipal managerPrincipal = UserPrincipal.create(2L, "manager@test.com", "Manager User", Role.MANAGER);
                managerToken = jwtTokenProvider.generateAccessToken(managerPrincipal);
                
                UserPrincipal employeePrincipal = UserPrincipal.create(3L, "employee@test.com", "Employee User", Role.EMPLOYEE);
                employeeToken = jwtTokenProvider.generateAccessToken(employeePrincipal);
            } catch (Exception ex) {
                // Fallback to mock tokens for testing
                adminToken = "mock-admin-token";
                managerToken = "mock-manager-token";
                employeeToken = "mock-employee-token";
            }
        }
    }

    private void setupTestData() {
        try {
            // Create test category
            CategoryCreateRequest categoryRequest = new CategoryCreateRequest();
            categoryRequest.setName("Security Test Category");
            categoryRequest.setDescription("Category for security tests");
            CategoryResponse category = categoryService.createCategory(categoryRequest);
            testCategoryId = category.getId();

            // Create test supplier
            SupplierCreateRequest supplierRequest = new SupplierCreateRequest();
            supplierRequest.setName("Security Test Supplier");
            supplierRequest.setContactEmail("supplier@test.com");
            supplierRequest.setContactPhone("123-456-7890");
            supplierRequest.setAddress("123 Test St");
            SupplierResponse supplier = supplierService.createSupplier(supplierRequest);
            testSupplierId = supplier.getId();

            // Create test product
            ProductCreateRequest productRequest = new ProductCreateRequest();
            productRequest.setName("Security Test Product");
            productRequest.setSku("SEC-TEST-001");
            productRequest.setCategoryId(testCategoryId);
            productRequest.setSupplierId(testSupplierId);
            productRequest.setCostPrice(BigDecimal.valueOf(10.00));
            productRequest.setSellingPrice(BigDecimal.valueOf(20.00));
            productRequest.setReorderLevel(5);
            productRequest.setReorderQuantity(50);
            ProductResponse product = productService.createProduct(productRequest);
            testProductId = product.getId();

            // Initialize inventory
            InventoryAdjustmentRequest inventoryRequest = new InventoryAdjustmentRequest();
            inventoryRequest.setQuantity(1000);
            inventoryRequest.setReason("Initial stock for security tests");
            inventoryRequest.setMovementType(StockMovementType.ADJUSTMENT);
            inventoryService.adjustInventory(testProductId, inventoryRequest);
        } catch (Exception e) {
            // Test data might already exist, use default IDs
            testCategoryId = 1L;
            testSupplierId = 1L;
            testProductId = 1L;
        }
    }

    /**
     * Test JWT authentication and authorization across all endpoints
     * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
     */
    @Test
    @Order(1)
    void testJwtAuthenticationAndAuthorizationAcrossEndpoints() throws Exception {
        // Test unauthenticated access - should be denied
        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnauthorized());

        // Test authenticated access with valid token
        mockMvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer " + employeeToken))
                .andExpect(status().isOk());

        // Test invalid token
        mockMvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());

        // Test expired token (simulate by using malformed token)
        mockMvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer expired.token.here"))
                .andExpect(status().isUnauthorized());

        // Test token refresh functionality
        UserPrincipal userPrincipal = UserPrincipal.create(1L, "test@example.com", "Test User", Role.EMPLOYEE);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userPrincipal);
        
        // Verify refresh token can be used to get new access token
        assertThat(jwtTokenProvider.validateToken(refreshToken)).isTrue();
        
        // Test access token expiration validation
        String accessToken = jwtTokenProvider.generateAccessToken(userPrincipal);
        assertThat(jwtTokenProvider.validateToken(accessToken)).isTrue();
        assertThat(jwtTokenProvider.getUserPrincipalFromToken(accessToken)).isNotNull();
    }

    /**
     * Test role-based access control with different user scenarios
     * Requirements: 1.4, 1.5, 1.6, 1.7
     */
    @Test
    @Order(2)
    void testRoleBasedAccessControlScenarios() throws Exception {
        // Test EMPLOYEE role permissions
        // Can view products
        mockMvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer " + employeeToken))
                .andExpect(status().isOk());

        // Can create orders
        OrderCreateRequest orderRequest = new OrderCreateRequest();
        orderRequest.setCustomerName("Test Customer");
        orderRequest.setCustomerEmail("customer@test.com");
        orderRequest.setShippingAddress("123 Test St");
        OrderItemRequest orderItem = new OrderItemRequest();
        orderItem.setProductId(testProductId);
        orderItem.setQuantity(1);
        orderItem.setUnitPrice(BigDecimal.valueOf(20.00));
        orderRequest.setOrderItems(List.of(orderItem));

        mockMvc.perform(post("/api/v1/orders")
                .header("Authorization", "Bearer " + employeeToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(orderRequest)))
                .andExpect(status().isCreated());

        // Cannot access admin-only endpoints
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", "Bearer " + employeeToken))
                .andExpect(status().isForbidden());

        // Cannot delete products
        mockMvc.perform(delete("/api/v1/products/" + testProductId)
                .header("Authorization", "Bearer " + employeeToken))
                .andExpect(status().isForbidden());

        // Test MANAGER role permissions
        // Can access inventory management
        mockMvc.perform(get("/api/v1/inventory/" + testProductId)
                .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk());

        // Can update order status
        mockMvc.perform(put("/api/v1/orders/1/status")
                .header("Authorization", "Bearer " + managerToken)
                .param("status", "CONFIRMED")
                .param("reason", "Manager approval"))
                .andExpect(status().isOk());

        // Cannot access user management (admin-only)
        mockMvc.perform(post("/api/v1/users")
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isForbidden());

        // Test ADMIN role permissions
        // Can access all endpoints
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Can manage system configuration
        mockMvc.perform(get("/actuator/health")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Can delete resources
        mockMvc.perform(delete("/api/v1/products/" + testProductId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    /**
     * Test system performance under concurrent user load
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
     */
    @Test
    @Order(3)
    void testSystemPerformanceUnderConcurrentLoad() throws Exception {
        int numberOfThreads = 50;
        int requestsPerThread = 10;
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        long startTime = System.currentTimeMillis();

        // Test concurrent product retrieval (cache performance)
        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        MvcResult result = mockMvc.perform(get("/api/v1/products/" + testProductId)
                                .header("Authorization", "Bearer " + employeeToken))
                                .andReturn();
                        
                        if (result.getResponse().getStatus() == 200) {
                            successCount.incrementAndGet();
                        } else {
                            errorCount.incrementAndGet();
                        }
                    }
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        // Wait for all threads to complete
        boolean completed = latch.await(30, TimeUnit.SECONDS);
        executor.shutdown();
        
        long endTime = System.currentTimeMillis();
        long totalTime = endTime - startTime;
        int totalRequests = numberOfThreads * requestsPerThread;

        assertThat(completed).isTrue();
        assertThat(successCount.get()).isGreaterThan(totalRequests * 0.95); // 95% success rate
        assertThat(errorCount.get()).isLessThan(totalRequests * 0.05); // Less than 5% errors
        assertThat(totalTime).isLessThan(10000); // Should complete within 10 seconds

        System.out.println("Performance Test Results:");
        System.out.println("Total Requests: " + totalRequests);
        System.out.println("Successful Requests: " + successCount.get());
        System.out.println("Failed Requests: " + errorCount.get());
        System.out.println("Total Time: " + totalTime + "ms");
        System.out.println("Average Response Time: " + (totalTime / totalRequests) + "ms");
        System.out.println("Requests per Second: " + (totalRequests * 1000 / totalTime));
    }

    /**
     * Test concurrent inventory operations for race condition prevention
     * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
     */
    @Test
    @Order(4)
    void testConcurrentInventoryOperationsRaceConditionPrevention() throws Exception {
        int numberOfThreads = 20;
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        AtomicInteger successfulAllocations = new AtomicInteger(0);
        AtomicInteger failedAllocations = new AtomicInteger(0);

        // Test concurrent inventory allocation
        for (int i = 0; i < numberOfThreads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    boolean allocated = inventoryService.allocateInventory(
                            testProductId, 10, "CONCURRENT-TEST-" + threadId);
                    
                    if (allocated) {
                        successfulAllocations.incrementAndGet();
                    } else {
                        failedAllocations.incrementAndGet();
                    }
                } catch (Exception e) {
                    failedAllocations.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean completed = latch.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        
        // Verify inventory consistency
        InventoryResponse finalInventory = inventoryService.getInventoryByProduct(testProductId);
        int expectedAllocated = successfulAllocations.get() * 10;
        
        assertThat(finalInventory.getQuantityAllocated()).isEqualTo(expectedAllocated);
        assertThat(finalInventory.getQuantityAvailable()).isEqualTo(1000 - expectedAllocated);

        System.out.println("Concurrent Inventory Test Results:");
        System.out.println("Successful Allocations: " + successfulAllocations.get());
        System.out.println("Failed Allocations: " + failedAllocations.get());
        System.out.println("Final Allocated Quantity: " + finalInventory.getQuantityAllocated());
        System.out.println("Final Available Quantity: " + finalInventory.getQuantityAvailable());
    }

    /**
     * Test cache performance and consistency under load
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
     */
    @Test
    @Order(5)
    void testCachePerformanceAndConsistencyUnderLoad() throws Exception {
        // Warm up cache
        cacheService.warmupCache();

        int numberOfReads = 1000;
        long startTime = System.currentTimeMillis();

        // Test cache hit performance
        for (int i = 0; i < numberOfReads; i++) {
            ProductResponse product = productService.getProductById(testProductId);
            assertThat(product).isNotNull();
        }

        long cacheHitTime = System.currentTimeMillis() - startTime;

        // Clear cache and test database hit performance
        cacheService.clearAllCaches();
        
        startTime = System.currentTimeMillis();
        for (int i = 0; i < numberOfReads; i++) {
            ProductResponse product = productService.getProductById(testProductId);
            assertThat(product).isNotNull();
        }
        long dbHitTime = System.currentTimeMillis() - startTime;

        // Cache should be significantly faster
        assertThat(cacheHitTime).isLessThan(dbHitTime / 2);

        // Test cache invalidation consistency
        ProductUpdateRequest updateRequest = new ProductUpdateRequest();
        updateRequest.setName("Updated Product Name");
        productService.updateProduct(testProductId, updateRequest);

        // Verify cache was invalidated
        ProductResponse updatedProduct = productService.getProductById(testProductId);
        assertThat(updatedProduct.getName()).isEqualTo("Updated Product Name");

        System.out.println("Cache Performance Test Results:");
        System.out.println("Cache Hit Time: " + cacheHitTime + "ms");
        System.out.println("Database Hit Time: " + dbHitTime + "ms");
        System.out.println("Cache Performance Improvement: " + (dbHitTime / cacheHitTime) + "x");
    }

    /**
     * Test monitoring and alerting systems functionality
     * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
     */
    @Test
    @Order(6)
    void testMonitoringAndAlertingSystemsFunctionality() throws Exception {
        // Test health check endpoints
        mockMvc.perform(get("/actuator/health")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpected(jsonPath("$.status").value("UP"));

        // Test metrics endpoint
        mockMvc.perform(get("/actuator/metrics")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Test specific business metrics
        mockMvc.perform(get("/actuator/metrics/inventory.low.stock.count")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Test custom health indicators
        mockMvc.perform(get("/actuator/health/database")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/actuator/health/redis")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Test low stock alert generation
        InventoryAdjustmentRequest lowStockAdjustment = new InventoryAdjustmentRequest();
        lowStockAdjustment.setQuantity(2); // Below reorder level
        lowStockAdjustment.setReason("Testing low stock alerts");
        lowStockAdjustment.setMovementType(StockMovementType.ADJUSTMENT);
        
        inventoryService.adjustInventory(testProductId, lowStockAdjustment);

        // Verify low stock alerts are generated
        List<LowStockAlert> alerts = inventoryService.checkLowStockLevels();
        assertThat(alerts).isNotEmpty();
        assertThat(alerts.stream().anyMatch(alert -> alert.getProductId().equals(testProductId))).isTrue();

        // Test performance monitoring
        long startTime = System.currentTimeMillis();
        for (int i = 0; i < 100; i++) {
            productService.getProductById(testProductId);
        }
        long endTime = System.currentTimeMillis();
        
        // Performance should be reasonable (less than 1 second for 100 requests)
        assertThat(endTime - startTime).isLessThan(1000);

        System.out.println("Monitoring Test Results:");
        System.out.println("Low Stock Alerts Generated: " + alerts.size());
        System.out.println("Performance Test Time: " + (endTime - startTime) + "ms");
    }

    /**
     * Test security headers and CORS configuration
     * Requirements: 1.7
     */
    @Test
    @Order(7)
    void testSecurityHeadersAndCorsConfiguration() throws Exception {
        // Test security headers are present
        MvcResult result = mockMvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer " + employeeToken))
                .andExpect(status().isOk())
                .andReturn();

        // Verify security headers
        assertThat(result.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(result.getResponse().getHeader("X-Frame-Options")).isEqualTo("DENY");
        assertThat(result.getResponse().getHeader("X-XSS-Protection")).isEqualTo("1; mode=block");

        // Test CORS preflight request
        mockMvc.perform(options("/api/v1/products")
                .header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk())
                .andExpected(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpected(header().string("Access-Control-Allow-Methods", containsString("GET")));
    }

    @AfterEach
    void tearDown() {
        // Clean up test data and clear caches
        try {
            cacheService.clearAllCaches();
        } catch (Exception e) {
            // Ignore cleanup errors
        }
    }
}