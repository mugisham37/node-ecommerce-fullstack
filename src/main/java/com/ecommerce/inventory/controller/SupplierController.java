package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.SupplierCreateRequest;
import com.ecommerce.inventory.dto.request.SupplierStatusUpdateRequest;
import com.ecommerce.inventory.dto.request.SupplierUpdateRequest;
import com.ecommerce.inventory.dto.response.SupplierPerformanceResponse;
import com.ecommerce.inventory.dto.response.SupplierResponse;
import com.ecommerce.inventory.dto.response.SupplierSummaryResponse;
import com.ecommerce.inventory.entity.SupplierStatus;
import com.ecommerce.inventory.service.SupplierService;
import com.ecommerce.inventory.service.UserActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Supplier Management Controller
 * Handles supplier relationship management operations
 */
@RestController
@RequestMapping("/api/v1/suppliers")
@Tag(name = "Supplier Management", description = "Supplier relationship management APIs")
public class SupplierController {

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private UserActivityService userActivityService;

    /**
     * Create a new supplier
     */
    @PostMapping
    @Operation(summary = "Create supplier", description = "Create a new supplier (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<SupplierResponse> createSupplier(@Valid @RequestBody SupplierCreateRequest request) {
        SupplierResponse supplier = supplierService.createSupplier(request);
        
        // Log supplier creation activity
        userActivityService.logActivity("SUPPLIER_CREATED", "SUPPLIER", 
            supplier.getId().toString(), "Created new supplier: " + supplier.getName());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(supplier);
    }

    /**
     * Get supplier by ID
     */
    @GetMapping("/{supplierId}")
    @Operation(summary = "Get supplier by ID", description = "Get supplier information by ID")
    public ResponseEntity<SupplierResponse> getSupplierById(@PathVariable Long supplierId) {
        SupplierResponse supplier = supplierService.getSupplierById(supplierId);
        return ResponseEntity.ok(supplier);
    }

    /**
     * Update supplier information
     */
    @PutMapping("/{supplierId}")
    @Operation(summary = "Update supplier", description = "Update supplier information (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<SupplierResponse> updateSupplier(@PathVariable Long supplierId, 
                                                          @Valid @RequestBody SupplierUpdateRequest request) {
        SupplierResponse supplier = supplierService.updateSupplier(supplierId, request);
        
        // Log supplier update activity
        userActivityService.logActivity("SUPPLIER_UPDATED", "SUPPLIER", 
            supplierId.toString(), "Updated supplier: " + supplier.getName());
        
        return ResponseEntity.ok(supplier);
    }

    /**
     * Get all suppliers with pagination
     */
    @GetMapping
    @Operation(summary = "Get all suppliers", description = "Get all suppliers with pagination and filtering")
    public ResponseEntity<Page<SupplierResponse>> getAllSuppliers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) SupplierStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<SupplierResponse> suppliers = supplierService.getAllSuppliers(name, email, status, pageable);
        return ResponseEntity.ok(suppliers);
    }

    /**
     * Search suppliers
     */
    @GetMapping("/search")
    @Operation(summary = "Search suppliers", description = "Search suppliers by name, email, or contact information")
    public ResponseEntity<Page<SupplierResponse>> searchSuppliers(
            @RequestParam String q,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<SupplierResponse> suppliers = supplierService.searchSuppliers(q, pageable);
        return ResponseEntity.ok(suppliers);
    }

    /**
     * Get suppliers by status
     */
    @GetMapping("/by-status/{status}")
    @Operation(summary = "Get suppliers by status", description = "Get suppliers by status")
    public ResponseEntity<List<SupplierResponse>> getSuppliersByStatus(@PathVariable SupplierStatus status) {
        List<SupplierResponse> suppliers = supplierService.getSuppliersByStatus(status);
        return ResponseEntity.ok(suppliers);
    }

    /**
     * Get active suppliers
     */
    @GetMapping("/active")
    @Operation(summary = "Get active suppliers", description = "Get all active suppliers")
    public ResponseEntity<List<SupplierResponse>> getActiveSuppliers() {
        List<SupplierResponse> suppliers = supplierService.getActiveSuppliers();
        return ResponseEntity.ok(suppliers);
    }

    /**
     * Update supplier status
     */
    @PutMapping("/{supplierId}/status")
    @Operation(summary = "Update supplier status", description = "Update supplier status (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> updateSupplierStatus(
            @PathVariable Long supplierId,
            @Valid @RequestBody SupplierStatusUpdateRequest request) {
        
        supplierService.updateSupplierStatus(supplierId, request);
        
        // Log supplier status update activity
        userActivityService.logActivity("SUPPLIER_STATUS_UPDATED", "SUPPLIER", 
            supplierId.toString(), "Updated supplier status to: " + request.getStatus() + 
            (request.getReason() != null ? " - Reason: " + request.getReason() : ""));
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Supplier status updated successfully");
        response.put("supplierId", supplierId.toString());
        response.put("status", request.getStatus().toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get supplier performance metrics
     */
    @GetMapping("/{supplierId}/performance")
    @Operation(summary = "Get supplier performance", description = "Get supplier performance metrics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<SupplierPerformanceResponse> getSupplierPerformance(
            @PathVariable Long supplierId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        SupplierPerformanceResponse performance = supplierService.getSupplierPerformance(supplierId, startDate, endDate);
        return ResponseEntity.ok(performance);
    }

    /**
     * Get supplier summary
     */
    @GetMapping("/{supplierId}/summary")
    @Operation(summary = "Get supplier summary", description = "Get supplier summary information")
    public ResponseEntity<SupplierSummaryResponse> getSupplierSummary(@PathVariable Long supplierId) {
        SupplierSummaryResponse summary = supplierService.getSupplierSummary(supplierId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Get supplier products
     */
    @GetMapping("/{supplierId}/products")
    @Operation(summary = "Get supplier products", description = "Get products associated with supplier")
    public ResponseEntity<Page<com.ecommerce.inventory.dto.response.ProductResponse>> getSupplierProducts(
            @PathVariable Long supplierId,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<com.ecommerce.inventory.dto.response.ProductResponse> products = 
            supplierService.getSupplierProducts(supplierId, pageable);
        return ResponseEntity.ok(products);
    }

    /**
     * Bulk update supplier status
     */
    @PutMapping("/bulk/status")
    @Operation(summary = "Bulk update supplier status", description = "Update status for multiple suppliers (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkUpdateSupplierStatus(
            @RequestBody Map<String, Object> request) {
        
        @SuppressWarnings("unchecked")
        List<Long> supplierIds = (List<Long>) request.get("supplierIds");
        SupplierStatus status = SupplierStatus.valueOf(request.get("status").toString());
        String reason = (String) request.get("reason");
        
        if (supplierIds == null || supplierIds.isEmpty() || status == null) {
            throw new IllegalArgumentException("Supplier IDs and status are required");
        }
        
        int updatedCount = supplierService.bulkUpdateSupplierStatus(supplierIds, status, reason);
        
        // Log bulk status update activity
        userActivityService.logActivity("SUPPLIERS_BULK_STATUS_UPDATED", "SUPPLIER", 
            "bulk", "Bulk updated status for " + updatedCount + " suppliers to: " + status + 
            (reason != null ? " - Reason: " + reason : ""));
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Supplier statuses updated successfully");
        response.put("updatedCount", updatedCount);
        response.put("supplierIds", supplierIds);
        response.put("status", status);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk create suppliers
     */
    @PostMapping("/bulk")
    @Operation(summary = "Bulk create suppliers", description = "Create multiple suppliers (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkCreateSuppliers(
            @Valid @RequestBody List<SupplierCreateRequest> requests) {
        
        List<SupplierResponse> suppliers = supplierService.bulkCreateSuppliers(requests);
        
        // Log bulk creation activity
        userActivityService.logActivity("SUPPLIERS_BULK_CREATED", "SUPPLIER", 
            "bulk", "Bulk created " + suppliers.size() + " suppliers");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Suppliers created successfully");
        response.put("createdCount", suppliers.size());
        response.put("suppliers", suppliers);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk update suppliers
     */
    @PutMapping("/bulk")
    @Operation(summary = "Bulk update suppliers", description = "Update multiple suppliers (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkUpdateSuppliers(
            @Valid @RequestBody List<SupplierUpdateRequest> requests) {
        
        List<SupplierResponse> suppliers = supplierService.bulkUpdateSuppliers(requests);
        
        // Log bulk update activity
        userActivityService.logActivity("SUPPLIERS_BULK_UPDATED", "SUPPLIER", 
            "bulk", "Bulk updated " + suppliers.size() + " suppliers");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Suppliers updated successfully");
        response.put("updatedCount", suppliers.size());
        response.put("suppliers", suppliers);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get supplier statistics
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get supplier statistics", description = "Get supplier statistics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getSupplierStatistics() {
        Map<String, Object> statistics = supplierService.getSupplierStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Get top performing suppliers
     */
    @GetMapping("/top-performers")
    @Operation(summary = "Get top performing suppliers", description = "Get top performing suppliers (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<SupplierPerformanceResponse>> getTopPerformingSuppliers(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        List<SupplierPerformanceResponse> topPerformers = 
            supplierService.getTopPerformingSuppliers(limit, startDate, endDate);
        return ResponseEntity.ok(topPerformers);
    }

    /**
     * Send communication to supplier
     */
    @PostMapping("/{supplierId}/communicate")
    @Operation(summary = "Send communication to supplier", description = "Send communication to supplier (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> sendCommunication(
            @PathVariable Long supplierId,
            @RequestBody Map<String, String> request) {
        
        String subject = request.get("subject");
        String message = request.get("message");
        String type = request.get("type"); // EMAIL, SMS, etc.
        
        if (subject == null || message == null || type == null) {
            throw new IllegalArgumentException("Subject, message, and type are required");
        }
        
        supplierService.sendCommunication(supplierId, subject, message, type);
        
        // Log communication activity
        userActivityService.logActivity("SUPPLIER_COMMUNICATION_SENT", "SUPPLIER", 
            supplierId.toString(), "Sent " + type + " communication - Subject: " + subject);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Communication sent successfully");
        response.put("supplierId", supplierId.toString());
        response.put("type", type);
        
        return ResponseEntity.ok(response);
    }
}