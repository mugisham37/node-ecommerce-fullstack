package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.monitoring.PerformanceMonitoringService;
import com.ecommerce.inventory.monitoring.SystemResourceMonitoringService;
import com.ecommerce.inventory.monitoring.BusinessMetricMonitoringService;
import com.ecommerce.inventory.monitoring.AlertingService;
import com.ecommerce.inventory.monitoring.AlertType;
import com.ecommerce.inventory.monitoring.AlertSeverity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for monitoring and observability endpoints
 */
@RestController
@RequestMapping("/monitoring")
@PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
public class MonitoringController {

    private final PerformanceMonitoringService performanceMonitoringService;
    private final SystemResourceMonitoringService systemResourceMonitoringService;
    private final BusinessMetricMonitoringService businessMetricMonitoringService;
    private final AlertingService alertingService;

    @Autowired
    public MonitoringController(PerformanceMonitoringService performanceMonitoringService,
                              SystemResourceMonitoringService systemResourceMonitoringService,
                              BusinessMetricMonitoringService businessMetricMonitoringService,
                              AlertingService alertingService) {
        this.performanceMonitoringService = performanceMonitoringService;
        this.systemResourceMonitoringService = systemResourceMonitoringService;
        this.businessMetricMonitoringService = businessMetricMonitoringService;
        this.alertingService = alertingService;
    }

    /**
     * Get performance dashboard data
     */
    @GetMapping("/performance/dashboard")
    public ResponseEntity<?> getPerformanceDashboard() {
        var dashboard = performanceMonitoringService.getPerformanceDashboard();
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Get system resource metrics
     */
    @GetMapping("/system/resources")
    public ResponseEntity<?> getSystemResourceMetrics() {
        var metrics = systemResourceMonitoringService.getSystemResourceMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get memory metrics
     */
    @GetMapping("/system/memory")
    public ResponseEntity<?> getMemoryMetrics() {
        var metrics = systemResourceMonitoringService.getMemoryMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get CPU metrics
     */
    @GetMapping("/system/cpu")
    public ResponseEntity<?> getCpuMetrics() {
        var metrics = systemResourceMonitoringService.getCpuMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get database connection metrics
     */
    @GetMapping("/system/database")
    public ResponseEntity<?> getDatabaseMetrics() {
        var metrics = systemResourceMonitoringService.getDatabaseMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get business metrics
     */
    @GetMapping("/business/metrics")
    public ResponseEntity<?> getBusinessMetrics() {
        var metrics = businessMetricMonitoringService.getBusinessMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get inventory business metrics
     */
    @GetMapping("/business/inventory")
    public ResponseEntity<?> getInventoryMetrics() {
        var metrics = businessMetricMonitoringService.getInventoryMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get order business metrics
     */
    @GetMapping("/business/orders")
    public ResponseEntity<?> getOrderMetrics() {
        var metrics = businessMetricMonitoringService.getOrderMetrics();
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get recent alerts
     */
    @GetMapping("/alerts/recent")
    public ResponseEntity<?> getRecentAlerts() {
        var alerts = alertingService.getRecentAlerts();
        return ResponseEntity.ok(alerts);
    }

    /**
     * Get alerts by severity
     */
    @GetMapping("/alerts/severity/{severity}")
    public ResponseEntity<?> getAlertsBySeverity(@PathVariable String severity) {
        try {
            AlertSeverity alertSeverity = AlertSeverity.valueOf(severity.toUpperCase());
            var alerts = alertingService.getAlertsBySeverity(alertSeverity);
            return ResponseEntity.ok(alerts);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid severity level: " + severity);
        }
    }

    /**
     * Get alert statistics
     */
    @GetMapping("/alerts/statistics")
    public ResponseEntity<?> getAlertStatistics() {
        var statistics = alertingService.getAlertStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Clear old alerts (admin only)
     */
    @DeleteMapping("/alerts/cleanup")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> clearOldAlerts() {
        alertingService.clearOldAlerts();
        return ResponseEntity.ok().body("Old alerts cleared successfully");
    }

    /**
     * Send test alert (admin only)
     */
    @PostMapping("/alerts/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendTestAlert(@RequestParam String message, 
                                         @RequestParam(defaultValue = "INFO") String severity) {
        try {
            AlertSeverity alertSeverity = AlertSeverity.valueOf(severity.toUpperCase());
            alertingService.sendAlert(AlertType.SYSTEM_STARTUP, message, alertSeverity);
            return ResponseEntity.ok().body("Test alert sent successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid severity level: " + severity);
        }
    }
}