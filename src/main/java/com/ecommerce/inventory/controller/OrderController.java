package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.OrderCancellationRequest;
import com.ecommerce.inventory.dto.request.OrderCreateRequest;
import com.ecommerce.inventory.dto.request.OrderFulfillmentRequest;
import com.ecommerce.inventory.dto.request.OrderStatusUpdateRequest;
import com.ecommerce.inventory.dto.request.FulfillmentRequest;
import com.ecommerce.inventory.dto.request.PartialFulfillmentRequest;
import com.ecommerce.inventory.dto.response.OrderResponse;
import com.ecommerce.inventory.dto.response.OrderSummaryResponse;
import com.ecommerce.inventory.entity.OrderStatus;
import com.ecommerce.inventory.service.OrderService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Order Management Controller
 * Handles complex order processing workflows and order lifecycle management
 */
@RestController
@RequestMapping("/api/v1/orders")
@Tag(name = "Order Management", description = "Order processing and management APIs")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserActivityService userActivityService;

    /**
     * Create a new order
     */
    @PostMapping
    @Operation(summary = "Create order", description = "Create a new order with automatic inventory allocation")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('EMPLOYEE')")
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderCreateRequest request) {
        OrderResponse order = orderService.createOrder(request);
        
        // Log order creation activity
        userActivityService.logActivity("ORDER_CREATED", "ORDER", 
            order.getId().toString(), 
            "Created order " + order.getOrderNumber() + " for customer: " + order.getCustomerName() + 
            ", Total: " + order.getTotalAmount());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    /**
     * Get order by ID
     */
    @GetMapping("/{orderId}")
    @Operation(summary = "Get order by ID", description = "Get order information by ID")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long orderId) {
        OrderResponse order = orderService.getOrderById(orderId);
        return ResponseEntity.ok(order);
    }

    /**
     * Get order by order number
     */
    @GetMapping("/number/{orderNumber}")
    @Operation(summary = "Get order by number", description = "Get order information by order number")
    public ResponseEntity<OrderResponse> getOrderByNumber(@PathVariable String orderNumber) {
        OrderResponse order = orderService.getOrderByNumber(orderNumber);
        return ResponseEntity.ok(order);
    }

    /**
     * Update order status with request body
     */
    @PutMapping("/{orderId}/status")
    @Operation(summary = "Update order status", description = "Update order status (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<OrderResponse> updateOrderStatus(@PathVariable Long orderId, 
                                                          @Valid @RequestBody OrderStatusUpdateRequest request) {
        OrderResponse order = orderService.updateOrderStatus(orderId, request);
        
        // Log order status update activity
        userActivityService.logActivity("ORDER_STATUS_UPDATED", "ORDER", 
            orderId.toString(), 
            "Updated order status to: " + request.getStatus() + 
            (request.getNotes() != null ? " - Notes: " + request.getNotes() : ""));
        
        return ResponseEntity.ok(order);
    }

    /**
     * Get all orders with pagination and filtering
     */
    @GetMapping
    @Operation(summary = "Get all orders", description = "Get all orders with pagination and filtering")
    public ResponseEntity<Page<OrderSummaryResponse>> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String customerName,
            @RequestParam(required = false) String customerEmail,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<OrderSummaryResponse> orders = orderService.getAllOrders(
            status, customerName, customerEmail, startDate, endDate, minAmount, maxAmount, pageable);
        return ResponseEntity.ok(orders);
    }

    /**
     * Search orders
     */
    @GetMapping("/search")
    @Operation(summary = "Search orders", description = "Search orders by order number, customer name, or email")
    public ResponseEntity<Page<OrderSummaryResponse>> searchOrders(
            @RequestParam String q,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<OrderSummaryResponse> orders = orderService.searchOrders(q, pageable);
        return ResponseEntity.ok(orders);
    }

    /**
     * Get orders by status
     */
    @GetMapping("/by-status/{status}")
    @Operation(summary = "Get orders by status", description = "Get orders by specific status")
    public ResponseEntity<Page<OrderSummaryResponse>> getOrdersByStatus(
            @PathVariable OrderStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<OrderSummaryResponse> orders = orderService.getOrdersByStatus(status, pageable);
        return ResponseEntity.ok(orders);
    }

    /**
     * Get pending orders
     */
    @GetMapping("/pending")
    @Operation(summary = "Get pending orders", description = "Get all pending orders")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('EMPLOYEE')")
    public ResponseEntity<List<OrderSummaryResponse>> getPendingOrders() {
        List<OrderSummaryResponse> orders = orderService.getPendingOrders();
        return ResponseEntity.ok(orders);
    }

    /**
     * Process order fulfillment
     */
    @PostMapping("/{orderId}/fulfill")
    @Operation(summary = "Process order fulfillment", description = "Process order fulfillment with shipment details (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<OrderResponse> processOrderFulfillment(@PathVariable Long orderId,
                                                               @Valid @RequestBody FulfillmentRequest request) {
        OrderResponse order = orderService.processOrderFulfillment(orderId, request);
        
        // Log order fulfillment activity
        userActivityService.logActivity("ORDER_FULFILLED", "ORDER", 
            orderId.toString(), 
            "Order fulfilled - Tracking: " + request.getTrackingNumber() + 
            ", Carrier: " + request.getShippingCarrier());
        
        return ResponseEntity.ok(order);
    }

    /**
     * Process partial order fulfillment
     */
    @PostMapping("/{orderId}/partial-fulfill")
    @Operation(summary = "Process partial order fulfillment", description = "Process partial order fulfillment with shipment details (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<OrderResponse> processPartialOrderFulfillment(@PathVariable Long orderId,
                                                                       @Valid @RequestBody PartialFulfillmentRequest request) {
        OrderResponse order = orderService.processPartialOrderFulfillment(orderId, request);
        
        // Log partial order fulfillment activity
        userActivityService.logActivity("ORDER_PARTIALLY_FULFILLED", "ORDER", 
            orderId.toString(), 
            "Order partially fulfilled - Quantity: " + request.getQuantityShipped() + 
            ", Tracking: " + request.getTrackingNumber() + 
            ", Carrier: " + request.getShippingCarrier());
        
        return ResponseEntity.ok(order);
    }

    /**
     * Update order status with parameters
     */
    @PutMapping("/{orderId}/status")
    @Operation(summary = "Update order status", description = "Update order status with parameters (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<OrderResponse> updateOrderStatusWithParams(@PathVariable Long orderId,
                                                                    @RequestParam String status,
                                                                    @RequestParam(required = false) String reason) {
        OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
        OrderResponse order = orderService.updateOrderStatus(orderId, orderStatus, reason);
        
        // Log order status update activity
        userActivityService.logActivity("ORDER_STATUS_UPDATED", "ORDER", 
            orderId.toString(), 
            "Updated order status to: " + orderStatus + 
            (reason != null ? " - Reason: " + reason : ""));
        
        return ResponseEntity.ok(order);
    }

    /**
     * Cancel order
     */
    @PostMapping("/{orderId}/cancel")
    @Operation(summary = "Cancel order", description = "Cancel order and release inventory (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> cancelOrder(@PathVariable Long orderId,
                                                          @Valid @RequestBody OrderCancellationRequest request) {
        orderService.cancelOrder(orderId, request);
        
        // Log order cancellation activity
        userActivityService.logActivity("ORDER_CANCELLED", "ORDER", 
            orderId.toString(), 
            "Order cancelled - Reason: " + request.getReason());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Order cancelled successfully");
        response.put("orderId", orderId.toString());
        response.put("reason", request.getReason());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get order analytics
     */
    @GetMapping("/analytics")
    @Operation(summary = "Get order analytics", description = "Get order analytics and metrics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getOrderAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        Map<String, Object> analytics = orderService.getOrderAnalytics(startDate, endDate);
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get order statistics
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get order statistics", description = "Get order statistics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getOrderStatistics() {
        Map<String, Object> statistics = orderService.getOrderStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Get revenue report
     */
    @GetMapping("/revenue-report")
    @Operation(summary = "Get revenue report", description = "Get revenue report for date range (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getRevenueReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "DAILY") String groupBy) {
        
        Map<String, Object> report = orderService.getRevenueReport(startDate, endDate, groupBy);
        
        // Log revenue report generation activity
        userActivityService.logActivity("REVENUE_REPORT_GENERATED", "REPORT", 
            "revenue", "Generated " + groupBy + " revenue report");
        
        return ResponseEntity.ok(report);
    }

    /**
     * Get top customers
     */
    @GetMapping("/top-customers")
    @Operation(summary = "Get top customers", description = "Get top customers by order value (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getTopCustomers(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        List<Map<String, Object>> topCustomers = orderService.getTopCustomers(limit, startDate, endDate);
        return ResponseEntity.ok(topCustomers);
    }

    /**
     * Get order fulfillment metrics
     */
    @GetMapping("/fulfillment-metrics")
    @Operation(summary = "Get fulfillment metrics", description = "Get order fulfillment performance metrics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getFulfillmentMetrics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        Map<String, Object> metrics = orderService.getFulfillmentMetrics(startDate, endDate);
        return ResponseEntity.ok(metrics);
    }

    /**
     * Bulk update order status
     */
    @PutMapping("/bulk/status")
    @Operation(summary = "Bulk update order status", description = "Update status for multiple orders (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkUpdateOrderStatus(
            @RequestBody Map<String, Object> request) {
        
        @SuppressWarnings("unchecked")
        List<Long> orderIds = (List<Long>) request.get("orderIds");
        OrderStatus status = OrderStatus.valueOf(request.get("status").toString());
        String notes = (String) request.get("notes");
        
        if (orderIds == null || orderIds.isEmpty() || status == null) {
            throw new IllegalArgumentException("Order IDs and status are required");
        }
        
        int updatedCount = orderService.bulkUpdateOrderStatus(orderIds, status, notes);
        
        // Log bulk status update activity
        userActivityService.logActivity("ORDERS_BULK_STATUS_UPDATED", "ORDER", 
            "bulk", "Bulk updated status for " + updatedCount + " orders to: " + status + 
            (notes != null ? " - Notes: " + notes : ""));
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Order statuses updated successfully");
        response.put("updatedCount", updatedCount);
        response.put("orderIds", orderIds);
        response.put("status", status);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk cancel orders
     */
    @PostMapping("/bulk/cancel")
    @Operation(summary = "Bulk cancel orders", description = "Cancel multiple orders (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkCancelOrders(
            @RequestBody Map<String, Object> request) {
        
        @SuppressWarnings("unchecked")
        List<Long> orderIds = (List<Long>) request.get("orderIds");
        String reason = (String) request.get("reason");
        
        if (orderIds == null || orderIds.isEmpty() || reason == null) {
            throw new IllegalArgumentException("Order IDs and reason are required");
        }
        
        int cancelledCount = orderService.bulkCancelOrders(orderIds, reason);
        
        // Log bulk cancellation activity
        userActivityService.logActivity("ORDERS_BULK_CANCELLED", "ORDER", 
            "bulk", "Bulk cancelled " + cancelledCount + " orders - Reason: " + reason);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Orders cancelled successfully");
        response.put("cancelledCount", cancelledCount);
        response.put("orderIds", orderIds);
        response.put("reason", reason);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Export orders
     */
    @GetMapping("/export")
    @Operation(summary = "Export orders", description = "Export orders to CSV/Excel format (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> exportOrders(
            @RequestParam(defaultValue = "CSV") String format,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        String exportUrl = orderService.exportOrders(format, status, startDate, endDate);
        
        // Log export activity
        userActivityService.logActivity("ORDERS_EXPORTED", "EXPORT", 
            "orders", "Exported orders in " + format + " format");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Orders export initiated successfully");
        response.put("format", format);
        response.put("downloadUrl", exportUrl);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get order timeline
     */
    @GetMapping("/{orderId}/timeline")
    @Operation(summary = "Get order timeline", description = "Get order status change timeline")
    public ResponseEntity<List<Map<String, Object>>> getOrderTimeline(@PathVariable Long orderId) {
        List<Map<String, Object>> timeline = orderService.getOrderTimeline(orderId);
        return ResponseEntity.ok(timeline);
    }

    /**
     * Add order notes
     */
    @PostMapping("/{orderId}/notes")
    @Operation(summary = "Add order notes", description = "Add notes to an order (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> addOrderNotes(@PathVariable Long orderId,
                                                            @RequestBody Map<String, String> request) {
        String notes = request.get("notes");
        if (notes == null || notes.trim().isEmpty()) {
            throw new IllegalArgumentException("Notes are required");
        }
        
        orderService.addOrderNotes(orderId, notes);
        
        // Log notes addition activity
        userActivityService.logActivity("ORDER_NOTES_ADDED", "ORDER", 
            orderId.toString(), "Added notes to order");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Notes added successfully");
        response.put("orderId", orderId.toString());
        
        return ResponseEntity.ok(response);
    }
}