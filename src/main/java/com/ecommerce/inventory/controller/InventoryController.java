package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.InventoryAdjustmentRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;
import com.ecommerce.inventory.dto.response.LowStockAlert;
import com.ecommerce.inventory.service.InventoryService;
import com.ecommerce.inventory.service.UserActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Inventory Management Controller
 * Handles real-time inventory tracking and management operations
 */
@RestController
@RequestMapping("/api/v1/inventory")
@Tag(name = "Inventory Management", description = "Real-time inventory tracking and management APIs")
public class InventoryController {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private UserActivityService userActivityService;

    /**
     * Get inventory by product ID
     */
    @GetMapping("/product/{productId}")
    @Operation(summary = "Get inventory by product", description = "Get current inventory levels for a product")
    public ResponseEntity<InventoryResponse> getInventoryByProduct(@PathVariable Long productId) {
        InventoryResponse inventory = inventoryService.getInventoryByProduct(productId);
        return ResponseEntity.ok(inventory);
    }

    /**
     * Get all inventory with pagination
     */
    @GetMapping
    @Operation(summary = "Get all inventory", description = "Get all inventory records with pagination and filtering")
    public ResponseEntity<Page<InventoryResponse>> getAllInventory(
            @RequestParam(required = false) String warehouseLocation,
            @RequestParam(required = false) Boolean lowStock,
            @RequestParam(required = false) Boolean outOfStock,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<InventoryResponse> inventory = inventoryService.getAllInventory(
            warehouseLocation, lowStock, outOfStock, pageable);
        return ResponseEntity.ok(inventory);
    }

    /**
     * Search inventory
     */
    @GetMapping("/search")
    @Operation(summary = "Search inventory", description = "Search inventory by product name or SKU")
    public ResponseEntity<Page<InventoryResponse>> searchInventory(
            @RequestParam String q,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<InventoryResponse> inventory = inventoryService.searchInventory(q, pageable);
        return ResponseEntity.ok(inventory);
    }

    /**
     * Get low stock products
     */
    @GetMapping("/low-stock")
    @Operation(summary = "Get low stock products", description = "Get products with low stock levels")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('EMPLOYEE')")
    public ResponseEntity<List<LowStockAlert>> getLowStockProducts() {
        List<LowStockAlert> lowStockProducts = inventoryService.getLowStockProducts();
        return ResponseEntity.ok(lowStockProducts);
    }

    /**
     * Get out of stock products
     */
    @GetMapping("/out-of-stock")
    @Operation(summary = "Get out of stock products", description = "Get products that are out of stock")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('EMPLOYEE')")
    public ResponseEntity<List<InventoryResponse>> getOutOfStockProducts() {
        List<InventoryResponse> outOfStockProducts = inventoryService.getOutOfStockProducts();
        return ResponseEntity.ok(outOfStockProducts);
    }

    /**
     * Adjust inventory levels
     */
    @PostMapping("/adjust")
    @Operation(summary = "Adjust inventory", description = "Adjust inventory levels for a product (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> adjustInventory(@Valid @RequestBody InventoryAdjustmentRequest request) {
        inventoryService.adjustInventory(request.getProductId(), request);
        
        // Log inventory adjustment activity
        userActivityService.logActivity("INVENTORY_ADJUSTED", "INVENTORY", 
            request.getProductId().toString(), 
            "Adjusted inventory - Type: " + request.getAdjustmentType() + 
            ", Quantity: " + request.getQuantity() + 
            ", Reason: " + request.getReason());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Inventory adjusted successfully");
        response.put("productId", request.getProductId().toString());
        response.put("adjustmentType", request.getAdjustmentType().toString());
        response.put("quantity", request.getQuantity().toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Allocate inventory for order
     */
    @PostMapping("/allocate")
    @Operation(summary = "Allocate inventory", description = "Allocate inventory for an order (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> allocateInventory(@RequestBody Map<String, Object> request) {
        Long productId = Long.valueOf(request.get("productId").toString());
        Integer quantity = Integer.valueOf(request.get("quantity").toString());
        String referenceId = (String) request.get("referenceId");
        
        if (productId == null || quantity == null || referenceId == null) {
            throw new IllegalArgumentException("Product ID, quantity, and reference ID are required");
        }
        
        boolean allocated = inventoryService.allocateInventory(productId, quantity, referenceId);
        
        // Log inventory allocation activity
        userActivityService.logActivity("INVENTORY_ALLOCATED", "INVENTORY", 
            productId.toString(), 
            "Allocated " + quantity + " units for reference: " + referenceId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("allocated", allocated);
        response.put("productId", productId);
        response.put("quantity", quantity);
        response.put("referenceId", referenceId);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Release allocated inventory
     */
    @PostMapping("/release")
    @Operation(summary = "Release inventory", description = "Release allocated inventory (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> releaseInventory(@RequestBody Map<String, Object> request) {
        Long productId = Long.valueOf(request.get("productId").toString());
        Integer quantity = Integer.valueOf(request.get("quantity").toString());
        String referenceId = (String) request.get("referenceId");
        
        if (productId == null || quantity == null || referenceId == null) {
            throw new IllegalArgumentException("Product ID, quantity, and reference ID are required");
        }
        
        inventoryService.releaseInventory(productId, quantity, referenceId);
        
        // Log inventory release activity
        userActivityService.logActivity("INVENTORY_RELEASED", "INVENTORY", 
            productId.toString(), 
            "Released " + quantity + " units for reference: " + referenceId);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Inventory released successfully");
        response.put("productId", productId.toString());
        response.put("quantity", quantity.toString());
        response.put("referenceId", referenceId);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get inventory movements
     */
    @GetMapping("/movements")
    @Operation(summary = "Get inventory movements", description = "Get inventory movement history")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Page<com.ecommerce.inventory.dto.response.StockMovementResponse>> getInventoryMovements(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String movementType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<com.ecommerce.inventory.dto.response.StockMovementResponse> movements = 
            inventoryService.getInventoryMovements(productId, movementType, startDate, endDate, pageable);
        return ResponseEntity.ok(movements);
    }

    /**
     * Get inventory movements by product
     */
    @GetMapping("/product/{productId}/movements")
    @Operation(summary = "Get product inventory movements", description = "Get inventory movement history for a specific product")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Page<com.ecommerce.inventory.dto.response.StockMovementResponse>> getProductInventoryMovements(
            @PathVariable Long productId,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<com.ecommerce.inventory.dto.response.StockMovementResponse> movements = 
            inventoryService.getProductInventoryMovements(productId, pageable);
        return ResponseEntity.ok(movements);
    }

    /**
     * Get inventory valuation
     */
    @GetMapping("/valuation")
    @Operation(summary = "Get inventory valuation", description = "Get current inventory valuation (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getInventoryValuation() {
        Map<String, Object> valuation = inventoryService.getInventoryValuation();
        return ResponseEntity.ok(valuation);
    }

    /**
     * Get inventory statistics
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get inventory statistics", description = "Get inventory statistics and metrics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getInventoryStatistics() {
        Map<String, Object> statistics = inventoryService.getInventoryStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Generate inventory report
     */
    @GetMapping("/report")
    @Operation(summary = "Generate inventory report", description = "Generate comprehensive inventory report (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> generateInventoryReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "SUMMARY") String reportType) {
        
        Map<String, Object> report = inventoryService.generateInventoryReport(startDate, endDate, reportType);
        
        // Log report generation activity
        userActivityService.logActivity("INVENTORY_REPORT_GENERATED", "REPORT", 
            "inventory", "Generated " + reportType + " inventory report");
        
        return ResponseEntity.ok(report);
    }

    /**
     * Bulk adjust inventory
     */
    @PostMapping("/bulk-adjust")
    @Operation(summary = "Bulk adjust inventory", description = "Adjust inventory for multiple products (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkAdjustInventory(
            @Valid @RequestBody List<InventoryAdjustmentRequest> requests) {
        
        int adjustedCount = inventoryService.bulkAdjustInventory(requests);
        
        // Log bulk adjustment activity
        userActivityService.logActivity("INVENTORY_BULK_ADJUSTED", "INVENTORY", 
            "bulk", "Bulk adjusted inventory for " + adjustedCount + " products");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Inventory bulk adjusted successfully");
        response.put("adjustedCount", adjustedCount);
        response.put("totalRequests", requests.size());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Check inventory availability
     */
    @PostMapping("/check-availability")
    @Operation(summary = "Check inventory availability", description = "Check if sufficient inventory is available for order")
    public ResponseEntity<Map<String, Object>> checkInventoryAvailability(
            @RequestBody List<Map<String, Object>> items) {
        
        Map<String, Object> availability = inventoryService.checkInventoryAvailability(items);
        return ResponseEntity.ok(availability);
    }

    /**
     * Get reorder recommendations
     */
    @GetMapping("/reorder-recommendations")
    @Operation(summary = "Get reorder recommendations", description = "Get product reorder recommendations (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getReorderRecommendations() {
        List<Map<String, Object>> recommendations = inventoryService.getReorderRecommendations();
        return ResponseEntity.ok(recommendations);
    }

    /**
     * Update reorder levels
     */
    @PutMapping("/reorder-levels")
    @Operation(summary = "Update reorder levels", description = "Update reorder levels for products (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> updateReorderLevels(
            @RequestBody List<Map<String, Object>> updates) {
        
        int updatedCount = inventoryService.updateReorderLevels(updates);
        
        // Log reorder level update activity
        userActivityService.logActivity("REORDER_LEVELS_UPDATED", "INVENTORY", 
            "bulk", "Updated reorder levels for " + updatedCount + " products");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Reorder levels updated successfully");
        response.put("updatedCount", updatedCount);
        
        return ResponseEntity.ok(response);
    }
}