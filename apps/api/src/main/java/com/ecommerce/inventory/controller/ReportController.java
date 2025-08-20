package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.service.ReportService;
import com.ecommerce.inventory.service.UserActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reporting and Analytics Controller
 * Handles comprehensive business analytics and reporting endpoints
 */
@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "Reports and Analytics", description = "Business analytics and reporting APIs")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @Autowired
    private UserActivityService userActivityService;

    /**
     * Get dashboard metrics
     */
    @GetMapping("/dashboard")
    @Operation(summary = "Get dashboard metrics", description = "Get real-time dashboard metrics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getDashboardMetrics() {
        Map<String, Object> metrics = reportService.getDashboardMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get inventory analytics
     */
    @GetMapping("/inventory/analytics")
    @Operation(summary = "Get inventory analytics", description = "Get comprehensive inventory analytics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getInventoryAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        Map<String, Object> analytics = reportService.getInventoryAnalytics(startDate, endDate);
        
        // Log analytics generation activity
        userActivityService.logActivity("INVENTORY_ANALYTICS_GENERATED", "REPORT", 
            "inventory", "Generated inventory analytics report");
        
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get sales analytics
     */
    @GetMapping("/sales/analytics")
    @Operation(summary = "Get sales analytics", description = "Get comprehensive sales analytics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getSalesAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "DAILY") String groupBy) {
        
        Map<String, Object> analytics = reportService.getSalesAnalytics(startDate, endDate, groupBy);
        
        // Log analytics generation activity
        userActivityService.logActivity("SALES_ANALYTICS_GENERATED", "REPORT", 
            "sales", "Generated " + groupBy + " sales analytics report");
        
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get product performance report
     */
    @GetMapping("/products/performance")
    @Operation(summary = "Get product performance", description = "Get product performance analytics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getProductPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "REVENUE") String sortBy,
            @RequestParam(defaultValue = "20") int limit) {
        
        List<Map<String, Object>> performance = reportService.getProductPerformance(startDate, endDate, sortBy, limit);
        
        // Log report generation activity
        userActivityService.logActivity("PRODUCT_PERFORMANCE_REPORT_GENERATED", "REPORT", 
            "products", "Generated product performance report");
        
        return ResponseEntity.ok(performance);
    }

    /**
     * Get supplier performance report
     */
    @GetMapping("/suppliers/performance")
    @Operation(summary = "Get supplier performance", description = "Get supplier performance analytics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getSupplierPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "QUALITY_SCORE") String sortBy,
            @RequestParam(defaultValue = "10") int limit) {
        
        List<Map<String, Object>> performance = reportService.getSupplierPerformance(startDate, endDate, sortBy, limit);
        
        // Log report generation activity
        userActivityService.logActivity("SUPPLIER_PERFORMANCE_REPORT_GENERATED", "REPORT", 
            "suppliers", "Generated supplier performance report");
        
        return ResponseEntity.ok(performance);
    }

    /**
     * Get financial summary
     */
    @GetMapping("/financial/summary")
    @Operation(summary = "Get financial summary", description = "Get financial summary report (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getFinancialSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        Map<String, Object> summary = reportService.getFinancialSummary(startDate, endDate);
        
        // Log report generation activity
        userActivityService.logActivity("FINANCIAL_SUMMARY_GENERATED", "REPORT", 
            "financial", "Generated financial summary report");
        
        return ResponseEntity.ok(summary);
    }

    /**
     * Get inventory valuation report
     */
    @GetMapping("/inventory/valuation")
    @Operation(summary = "Get inventory valuation", description = "Get inventory valuation report (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getInventoryValuation(
            @RequestParam(required = false) String warehouseLocation,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long supplierId) {
        
        Map<String, Object> valuation = reportService.getInventoryValuation(warehouseLocation, categoryId, supplierId);
        
        // Log report generation activity
        userActivityService.logActivity("INVENTORY_VALUATION_GENERATED", "REPORT", 
            "inventory", "Generated inventory valuation report");
        
        return ResponseEntity.ok(valuation);
    }

    /**
     * Get stock movement report
     */
    @GetMapping("/inventory/movements")
    @Operation(summary = "Get stock movement report", description = "Get stock movement analytics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getStockMovementReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String movementType,
            @RequestParam(required = false) Long productId) {
        
        Map<String, Object> report = reportService.getStockMovementReport(startDate, endDate, movementType, productId);
        
        // Log report generation activity
        userActivityService.logActivity("STOCK_MOVEMENT_REPORT_GENERATED", "REPORT", 
            "inventory", "Generated stock movement report");
        
        return ResponseEntity.ok(report);
    }

    /**
     * Get customer analytics
     */
    @GetMapping("/customers/analytics")
    @Operation(summary = "Get customer analytics", description = "Get customer behavior analytics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getCustomerAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        Map<String, Object> analytics = reportService.getCustomerAnalytics(startDate, endDate);
        
        // Log analytics generation activity
        userActivityService.logActivity("CUSTOMER_ANALYTICS_GENERATED", "REPORT", 
            "customers", "Generated customer analytics report");
        
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get order fulfillment report
     */
    @GetMapping("/orders/fulfillment")
    @Operation(summary = "Get order fulfillment report", description = "Get order fulfillment analytics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getOrderFulfillmentReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        Map<String, Object> report = reportService.getOrderFulfillmentReport(startDate, endDate);
        
        // Log report generation activity
        userActivityService.logActivity("ORDER_FULFILLMENT_REPORT_GENERATED", "REPORT", 
            "orders", "Generated order fulfillment report");
        
        return ResponseEntity.ok(report);
    }

    /**
     * Get ABC analysis report
     */
    @GetMapping("/inventory/abc-analysis")
    @Operation(summary = "Get ABC analysis", description = "Get ABC analysis for inventory management (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getAbcAnalysis(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "REVENUE") String analysisType) {
        
        Map<String, Object> analysis = reportService.getAbcAnalysis(startDate, endDate, analysisType);
        
        // Log analysis generation activity
        userActivityService.logActivity("ABC_ANALYSIS_GENERATED", "REPORT", 
            "inventory", "Generated ABC analysis report");
        
        return ResponseEntity.ok(analysis);
    }

    /**
     * Generate scheduled report
     */
    @PostMapping("/scheduled")
    @Operation(summary = "Generate scheduled report", description = "Generate and schedule report delivery (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> generateScheduledReport(@RequestBody Map<String, Object> request) {
        String reportType = (String) request.get("reportType");
        String schedule = (String) request.get("schedule");
        String format = (String) request.get("format");
        @SuppressWarnings("unchecked")
        List<String> recipients = (List<String>) request.get("recipients");
        
        if (reportType == null || schedule == null || format == null || recipients == null) {
            throw new IllegalArgumentException("Report type, schedule, format, and recipients are required");
        }
        
        String reportId = reportService.scheduleReport(reportType, schedule, format, recipients);
        
        // Log scheduled report creation activity
        userActivityService.logActivity("SCHEDULED_REPORT_CREATED", "REPORT", 
            reportId, "Created scheduled " + reportType + " report with " + schedule + " schedule");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Scheduled report created successfully");
        response.put("reportId", reportId);
        response.put("reportType", reportType);
        response.put("schedule", schedule);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get scheduled reports
     */
    @GetMapping("/scheduled")
    @Operation(summary = "Get scheduled reports", description = "Get list of scheduled reports (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getScheduledReports() {
        List<Map<String, Object>> scheduledReports = reportService.getScheduledReports();
        return ResponseEntity.ok(scheduledReports);
    }

    /**
     * Update scheduled report
     */
    @PutMapping("/scheduled/{reportId}")
    @Operation(summary = "Update scheduled report", description = "Update scheduled report configuration (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> updateScheduledReport(@PathVariable String reportId,
                                                                    @RequestBody Map<String, Object> request) {
        reportService.updateScheduledReport(reportId, request);
        
        // Log scheduled report update activity
        userActivityService.logActivity("SCHEDULED_REPORT_UPDATED", "REPORT", 
            reportId, "Updated scheduled report configuration");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Scheduled report updated successfully");
        response.put("reportId", reportId);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Delete scheduled report
     */
    @DeleteMapping("/scheduled/{reportId}")
    @Operation(summary = "Delete scheduled report", description = "Delete scheduled report (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteScheduledReport(@PathVariable String reportId) {
        reportService.deleteScheduledReport(reportId);
        
        // Log scheduled report deletion activity
        userActivityService.logActivity("SCHEDULED_REPORT_DELETED", "REPORT", 
            reportId, "Deleted scheduled report");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Scheduled report deleted successfully");
        response.put("reportId", reportId);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Export report
     */
    @PostMapping("/export")
    @Operation(summary = "Export report", description = "Export report in specified format (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> exportReport(@RequestBody Map<String, Object> request) {
        String reportType = (String) request.get("reportType");
        String format = (String) request.get("format");
        @SuppressWarnings("unchecked")
        Map<String, Object> parameters = (Map<String, Object>) request.get("parameters");
        
        if (reportType == null || format == null) {
            throw new IllegalArgumentException("Report type and format are required");
        }
        
        String exportUrl = reportService.exportReport(reportType, format, parameters);
        
        // Log report export activity
        userActivityService.logActivity("REPORT_EXPORTED", "EXPORT", 
            reportType, "Exported " + reportType + " report in " + format + " format");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Report export initiated successfully");
        response.put("reportType", reportType);
        response.put("format", format);
        response.put("downloadUrl", exportUrl);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get report templates
     */
    @GetMapping("/templates")
    @Operation(summary = "Get report templates", description = "Get available report templates (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getReportTemplates() {
        List<Map<String, Object>> templates = reportService.getReportTemplates();
        return ResponseEntity.ok(templates);
    }

    /**
     * Create custom report
     */
    @PostMapping("/custom")
    @Operation(summary = "Create custom report", description = "Create custom report with specified parameters (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createCustomReport(@RequestBody Map<String, Object> request) {
        String reportName = (String) request.get("reportName");
        @SuppressWarnings("unchecked")
        Map<String, Object> configuration = (Map<String, Object>) request.get("configuration");
        
        if (reportName == null || configuration == null) {
            throw new IllegalArgumentException("Report name and configuration are required");
        }
        
        Map<String, Object> report = reportService.createCustomReport(reportName, configuration);
        
        // Log custom report creation activity
        userActivityService.logActivity("CUSTOM_REPORT_CREATED", "REPORT", 
            reportName, "Created custom report: " + reportName);
        
        return ResponseEntity.ok(report);
    }

    /**
     * Get system performance metrics
     */
    @GetMapping("/system/performance")
    @Operation(summary = "Get system performance", description = "Get system performance metrics (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getSystemPerformanceMetrics() {
        Map<String, Object> metrics = reportService.getSystemPerformanceMetrics();
        
        // Log system metrics access activity
        userActivityService.logActivity("SYSTEM_PERFORMANCE_ACCESSED", "REPORT", 
            "system", "Accessed system performance metrics");
        
        return ResponseEntity.ok(metrics);
    }
}