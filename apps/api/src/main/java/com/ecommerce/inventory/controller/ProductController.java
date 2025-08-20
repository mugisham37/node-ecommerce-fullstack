package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.ProductCreateRequest;
import com.ecommerce.inventory.dto.request.ProductUpdateRequest;
import com.ecommerce.inventory.dto.response.ProductResponse;
import com.ecommerce.inventory.dto.versioning.ApiVersion;
import com.ecommerce.inventory.service.ProductService;
import com.ecommerce.inventory.service.UserActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Product Management Controller
 * Handles comprehensive product management operations
 */
@RestController
@RequestMapping("/api/v1/products")
@Tag(name = "Product Management", description = "Product catalog management APIs")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private UserActivityService userActivityService;

    /**
     * Create a new product
     */
    @PostMapping
    @ApiVersion("1.0")
    @Operation(
        summary = "Create New Product",
        description = """
            Create a new product in the inventory system with comprehensive validation and business logic.
            
            **Business Rules:**
            - SKU must be unique across all products
            - Selling price must be greater than or equal to cost price
            - Category and supplier must exist and be active
            - Product slug is auto-generated from the product name
            - Reorder levels help with inventory management
            
            **Required Permissions:** MANAGER or ADMIN role
            
            **Validation:**
            - All required fields must be provided
            - SKU format validation (uppercase letters, numbers, hyphens only)
            - Price validation (positive values with 2 decimal places)
            - Name and description length limits
            
            **Post-Creation:**
            - Inventory record is automatically created
            - Activity is logged for audit trail
            - Product is set to active status by default
            """,
        tags = {"Product Management"}
    )
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "201",
            description = "Product created successfully",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = ProductResponse.class),
                examples = @ExampleObject(
                    name = "Created Product",
                    summary = "Successfully created product response",
                    value = """
                        {
                            "id": 1,
                            "name": "Wireless Bluetooth Headphones",
                            "slug": "wireless-bluetooth-headphones",
                            "sku": "ELEC-HEAD-WBH001",
                            "description": "High-quality wireless Bluetooth headphones with noise cancellation",
                            "categoryId": 1,
                            "categoryName": "Electronics",
                            "supplierId": 1,
                            "supplierName": "TechSupply Co.",
                            "costPrice": 45.99,
                            "sellingPrice": 89.99,
                            "profitMargin": 48.89,
                            "reorderLevel": 10,
                            "reorderQuantity": 50,
                            "active": true,
                            "createdAt": "2024-01-15T10:30:00",
                            "updatedAt": "2024-01-15T10:30:00"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid request data",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Validation Error",
                    summary = "Request validation failed",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 400,
                            "error": "Bad Request",
                            "message": "Validation failed",
                            "path": "/api/v1/products",
                            "details": {
                                "name": "Product name is required",
                                "sku": "SKU must contain only uppercase letters, numbers, and hyphens",
                                "costPrice": "Cost price must be greater than 0"
                            }
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Unauthorized - Authentication required",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE)
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Forbidden - Insufficient permissions",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Access Denied",
                    summary = "Insufficient permissions",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 403,
                            "error": "Forbidden",
                            "message": "Access denied. MANAGER or ADMIN role required.",
                            "path": "/api/v1/products"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "409",
            description = "Conflict - SKU already exists",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "SKU Conflict",
                    summary = "SKU already exists",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 409,
                            "error": "Conflict",
                            "message": "Product with SKU 'ELEC-HEAD-WBH001' already exists",
                            "path": "/api/v1/products"
                        }
                        """
                )
            )
        )
    })
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ProductResponse> createProduct(
        @Parameter(
            description = "Product creation request with all required information",
            required = true,
            schema = @Schema(implementation = ProductCreateRequest.class),
            example = """
                {
                    "name": "Wireless Bluetooth Headphones",
                    "sku": "ELEC-HEAD-WBH001",
                    "description": "High-quality wireless Bluetooth headphones with noise cancellation",
                    "categoryId": 1,
                    "supplierId": 1,
                    "costPrice": 45.99,
                    "sellingPrice": 89.99,
                    "reorderLevel": 10,
                    "reorderQuantity": 50
                }
                """
        )
        @Valid @RequestBody ProductCreateRequest request) {
        ProductResponse product = productService.createProduct(request);
        
        // Log product creation activity
        userActivityService.logActivity("PRODUCT_CREATED", "PRODUCT", 
            product.getId().toString(), "Created new product: " + product.getName() + " (SKU: " + product.getSku() + ")");
        
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    /**
     * Get product by ID
     */
    @GetMapping("/{productId}")
    @Operation(summary = "Get product by ID", description = "Get product information by ID")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long productId) {
        ProductResponse product = productService.getProductById(productId);
        return ResponseEntity.ok(product);
    }

    /**
     * Update product information
     */
    @PutMapping("/{productId}")
    @Operation(summary = "Update product", description = "Update product information (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ProductResponse> updateProduct(@PathVariable Long productId, 
                                                        @Valid @RequestBody ProductUpdateRequest request) {
        ProductResponse product = productService.updateProduct(productId, request);
        
        // Log product update activity
        userActivityService.logActivity("PRODUCT_UPDATED", "PRODUCT", 
            productId.toString(), "Updated product: " + product.getName() + " (SKU: " + product.getSku() + ")");
        
        return ResponseEntity.ok(product);
    }

    /**
     * Get all products with pagination
     */
    @GetMapping
    @Operation(summary = "Get all products", description = "Get all products with pagination and filtering")
    public ResponseEntity<Page<ProductResponse>> getAllProducts(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean lowStock,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<ProductResponse> products = productService.getAllProducts(
            name, sku, categoryId, supplierId, active, lowStock, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Search products
     */
    @GetMapping("/search")
    @Operation(summary = "Search products", description = "Search products by name, SKU, or description")
    public ResponseEntity<Page<ProductResponse>> searchProducts(
            @RequestParam String q,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ProductResponse> products = productService.searchProducts(q, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Get products by category
     */
    @GetMapping("/by-category/{categoryId}")
    @Operation(summary = "Get products by category", description = "Get products by category ID")
    public ResponseEntity<Page<ProductResponse>> getProductsByCategory(
            @PathVariable Long categoryId,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ProductResponse> products = productService.getProductsByCategory(categoryId, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Get products by supplier
     */
    @GetMapping("/by-supplier/{supplierId}")
    @Operation(summary = "Get products by supplier", description = "Get products by supplier ID")
    public ResponseEntity<Page<ProductResponse>> getProductsBySupplier(
            @PathVariable Long supplierId,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ProductResponse> products = productService.getProductsBySupplier(supplierId, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Get low stock products
     */
    @GetMapping("/low-stock")
    @Operation(summary = "Get low stock products", description = "Get products with low stock levels")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('EMPLOYEE')")
    public ResponseEntity<List<ProductResponse>> getLowStockProducts() {
        List<ProductResponse> products = productService.getLowStockProducts();
        return ResponseEntity.ok(products);
    }

    /**
     * Activate product
     */
    @PutMapping("/{productId}/activate")
    @Operation(summary = "Activate product", description = "Activate product (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> activateProduct(@PathVariable Long productId) {
        productService.activateProduct(productId);
        
        // Log product activation activity
        userActivityService.logActivity("PRODUCT_ACTIVATED", "PRODUCT", 
            productId.toString(), "Product activated");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Product activated successfully");
        response.put("productId", productId.toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Deactivate product
     */
    @PutMapping("/{productId}/deactivate")
    @Operation(summary = "Deactivate product", description = "Deactivate product (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> deactivateProduct(@PathVariable Long productId) {
        productService.deactivateProduct(productId);
        
        // Log product deactivation activity
        userActivityService.logActivity("PRODUCT_DEACTIVATED", "PRODUCT", 
            productId.toString(), "Product deactivated");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Product deactivated successfully");
        response.put("productId", productId.toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Update product pricing
     */
    @PutMapping("/{productId}/pricing")
    @Operation(summary = "Update product pricing", description = "Update product cost and selling prices (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> updateProductPricing(
            @PathVariable Long productId,
            @RequestBody Map<String, BigDecimal> pricingRequest) {
        
        BigDecimal costPrice = pricingRequest.get("costPrice");
        BigDecimal sellingPrice = pricingRequest.get("sellingPrice");
        
        if (costPrice == null || sellingPrice == null) {
            throw new IllegalArgumentException("Both costPrice and sellingPrice are required");
        }
        
        productService.updateProductPricing(productId, costPrice, sellingPrice);
        
        // Log pricing update activity
        userActivityService.logActivity("PRODUCT_PRICING_UPDATED", "PRODUCT", 
            productId.toString(), "Updated pricing - Cost: " + costPrice + ", Selling: " + sellingPrice);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Product pricing updated successfully");
        response.put("productId", productId.toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk activate products
     */
    @PutMapping("/bulk/activate")
    @Operation(summary = "Bulk activate products", description = "Activate multiple products (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkActivateProducts(@RequestBody List<Long> productIds) {
        int activatedCount = productService.bulkActivateProducts(productIds);
        
        // Log bulk activation activity
        userActivityService.logActivity("PRODUCTS_BULK_ACTIVATED", "PRODUCT", 
            "bulk", "Bulk activated " + activatedCount + " products");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Products activated successfully");
        response.put("activatedCount", activatedCount);
        response.put("productIds", productIds);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk deactivate products
     */
    @PutMapping("/bulk/deactivate")
    @Operation(summary = "Bulk deactivate products", description = "Deactivate multiple products (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkDeactivateProducts(@RequestBody List<Long> productIds) {
        int deactivatedCount = productService.bulkDeactivateProducts(productIds);
        
        // Log bulk deactivation activity
        userActivityService.logActivity("PRODUCTS_BULK_DEACTIVATED", "PRODUCT", 
            "bulk", "Bulk deactivated " + deactivatedCount + " products");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Products deactivated successfully");
        response.put("deactivatedCount", deactivatedCount);
        response.put("productIds", productIds);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk update category
     */
    @PutMapping("/bulk/update-category")
    @Operation(summary = "Bulk update product category", description = "Update category for multiple products (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkUpdateCategory(
            @RequestBody Map<String, Object> request) {
        
        @SuppressWarnings("unchecked")
        List<Long> productIds = (List<Long>) request.get("productIds");
        Long categoryId = Long.valueOf(request.get("categoryId").toString());
        
        if (productIds == null || productIds.isEmpty() || categoryId == null) {
            throw new IllegalArgumentException("Product IDs and category ID are required");
        }
        
        int updatedCount = productService.bulkUpdateCategory(productIds, categoryId);
        
        // Log bulk category update activity
        userActivityService.logActivity("PRODUCTS_BULK_CATEGORY_UPDATED", "PRODUCT", 
            "bulk", "Bulk updated category for " + updatedCount + " products to category ID: " + categoryId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Product categories updated successfully");
        response.put("updatedCount", updatedCount);
        response.put("productIds", productIds);
        response.put("categoryId", categoryId);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get product statistics
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get product statistics", description = "Get product statistics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getProductStatistics() {
        Map<String, Object> statistics = productService.getProductStatistics();
        return ResponseEntity.ok(statistics);
    }
}