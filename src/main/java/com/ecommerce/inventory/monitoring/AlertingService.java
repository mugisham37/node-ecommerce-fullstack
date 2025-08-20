package com.ecommerce.inventory.monitoring;

import com.ecommerce.inventory.logging.StructuredLogger;
import com.ecommerce.inventory.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.List;
import java.util.ArrayList;

/**
 * Service for managing alerts and notifications for critical system events
 */
@Service
public class AlertingService {

    private static final StructuredLogger logger = StructuredLogger.getLogger(AlertingService.class);

    private final NotificationService notificationService;
    
    // Alert throttling to prevent spam
    private final Map<String, AlertThrottleInfo> alertThrottleMap = new ConcurrentHashMap<>();
    private static final long THROTTLE_WINDOW_MS = 300000; // 5 minutes
    private static final int MAX_ALERTS_PER_WINDOW = 3;

    // Alert history for dashboard
    private final List<Alert> recentAlerts = new ArrayList<>();
    private static final int MAX_RECENT_ALERTS = 100;

    @Autowired
    public AlertingService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Send an alert with throttling to prevent spam
     */
    @Async
    public void sendAlert(AlertType alertType, String message, AlertSeverity severity) {
        String alertKey = alertType.name() + ":" + message.hashCode();
        
        if (shouldThrottleAlert(alertKey)) {
            logger.debug("Alert throttled: {} - {}", alertType, message);
            return;
        }

        Alert alert = Alert.builder()
                .type(alertType)
                .severity(severity)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        // Log the alert
        logAlert(alert);

        // Store in recent alerts
        addToRecentAlerts(alert);

        // Send notifications based on severity
        sendNotifications(alert);

        // Update throttle info
        updateThrottleInfo(alertKey);
    }

    /**
     * Send critical alert that bypasses throttling
     */
    @Async
    public void sendCriticalAlert(AlertType alertType, String message) {
        Alert alert = Alert.builder()
                .type(alertType)
                .severity(AlertSeverity.CRITICAL)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        // Log the critical alert
        logger.error("CRITICAL ALERT: {} - {}", alertType, message);

        // Store in recent alerts
        addToRecentAlerts(alert);

        // Send immediate notifications
        sendNotifications(alert);
    }

    /**
     * Get recent alerts for dashboard
     */
    public List<Alert> getRecentAlerts() {
        synchronized (recentAlerts) {
            return new ArrayList<>(recentAlerts);
        }
    }

    /**
     * Get alerts by severity
     */
    public List<Alert> getAlertsBySeverity(AlertSeverity severity) {
        synchronized (recentAlerts) {
            return recentAlerts.stream()
                    .filter(alert -> alert.getSeverity() == severity)
                    .toList();
        }
    }

    /**
     * Get alert statistics
     */
    public AlertStatistics getAlertStatistics() {
        synchronized (recentAlerts) {
            long criticalCount = recentAlerts.stream()
                    .filter(alert -> alert.getSeverity() == AlertSeverity.CRITICAL)
                    .count();
            
            long warningCount = recentAlerts.stream()
                    .filter(alert -> alert.getSeverity() == AlertSeverity.WARNING)
                    .count();
            
            long infoCount = recentAlerts.stream()
                    .filter(alert -> alert.getSeverity() == AlertSeverity.INFO)
                    .count();

            return AlertStatistics.builder()
                    .totalAlerts(recentAlerts.size())
                    .criticalAlerts((int) criticalCount)
                    .warningAlerts((int) warningCount)
                    .infoAlerts((int) infoCount)
                    .timestamp(LocalDateTime.now())
                    .build();
        }
    }

    /**
     * Clear old alerts (cleanup task)
     */
    public void clearOldAlerts() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        
        synchronized (recentAlerts) {
            recentAlerts.removeIf(alert -> alert.getTimestamp().isBefore(cutoff));
        }

        // Clean up throttle map
        long currentTime = System.currentTimeMillis();
        alertThrottleMap.entrySet().removeIf(entry -> 
            currentTime - entry.getValue().getLastAlertTime() > THROTTLE_WINDOW_MS * 2
        );

        logger.debug("Cleaned up old alerts and throttle entries");
    }

    private boolean shouldThrottleAlert(String alertKey) {
        AlertThrottleInfo throttleInfo = alertThrottleMap.get(alertKey);
        long currentTime = System.currentTimeMillis();

        if (throttleInfo == null) {
            return false;
        }

        // Reset counter if window has passed
        if (currentTime - throttleInfo.getWindowStartTime() > THROTTLE_WINDOW_MS) {
            throttleInfo.reset(currentTime);
            return false;
        }

        return throttleInfo.getAlertCount() >= MAX_ALERTS_PER_WINDOW;
    }

    private void updateThrottleInfo(String alertKey) {
        long currentTime = System.currentTimeMillis();
        
        alertThrottleMap.compute(alertKey, (key, throttleInfo) -> {
            if (throttleInfo == null) {
                return new AlertThrottleInfo(currentTime);
            }
            
            // Reset if window has passed
            if (currentTime - throttleInfo.getWindowStartTime() > THROTTLE_WINDOW_MS) {
                throttleInfo.reset(currentTime);
            }
            
            throttleInfo.incrementCount();
            throttleInfo.setLastAlertTime(currentTime);
            return throttleInfo;
        });
    }

    private void logAlert(Alert alert) {
        switch (alert.getSeverity()) {
            case CRITICAL:
                logger.error("ALERT [{}]: {} - {}", alert.getSeverity(), alert.getType(), alert.getMessage());
                break;
            case WARNING:
                logger.warn("ALERT [{}]: {} - {}", alert.getSeverity(), alert.getType(), alert.getMessage());
                break;
            case INFO:
                logger.info("ALERT [{}]: {} - {}", alert.getSeverity(), alert.getType(), alert.getMessage());
                break;
        }
    }

    private void addToRecentAlerts(Alert alert) {
        synchronized (recentAlerts) {
            recentAlerts.add(0, alert); // Add to beginning
            
            // Keep only recent alerts
            if (recentAlerts.size() > MAX_RECENT_ALERTS) {
                recentAlerts.subList(MAX_RECENT_ALERTS, recentAlerts.size()).clear();
            }
        }
    }

    private void sendNotifications(Alert alert) {
        try {
            switch (alert.getSeverity()) {
                case CRITICAL:
                    // Send immediate notifications to all administrators
                    notificationService.sendCriticalAlert(alert.getMessage());
                    break;
                case WARNING:
                    // Send notifications to managers and administrators
                    notificationService.sendWarningAlert(alert.getMessage());
                    break;
                case INFO:
                    // Log only, no immediate notifications
                    break;
            }
        } catch (Exception e) {
            logger.error("Failed to send alert notification", e);
        }
    }

    // ========== INNER CLASSES ==========

    private static class AlertThrottleInfo {
        private long windowStartTime;
        private long lastAlertTime;
        private final AtomicInteger alertCount = new AtomicInteger(1);

        public AlertThrottleInfo(long currentTime) {
            this.windowStartTime = currentTime;
            this.lastAlertTime = currentTime;
        }

        public void reset(long currentTime) {
            this.windowStartTime = currentTime;
            this.alertCount.set(1);
        }

        public void incrementCount() {
            this.alertCount.incrementAndGet();
        }

        public long getWindowStartTime() { return windowStartTime; }
        public long getLastAlertTime() { return lastAlertTime; }
        public void setLastAlertTime(long lastAlertTime) { this.lastAlertTime = lastAlertTime; }
        public int getAlertCount() { return alertCount.get(); }
    }

    public static class Alert {
        private final AlertType type;
        private final AlertSeverity severity;
        private final String message;
        private final LocalDateTime timestamp;

        private Alert(Builder builder) {
            this.type = builder.type;
            this.severity = builder.severity;
            this.message = builder.message;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public AlertType getType() { return type; }
        public AlertSeverity getSeverity() { return severity; }
        public String getMessage() { return message; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private AlertType type;
            private AlertSeverity severity;
            private String message;
            private LocalDateTime timestamp;

            public Builder type(AlertType type) {
                this.type = type;
                return this;
            }

            public Builder severity(AlertSeverity severity) {
                this.severity = severity;
                return this;
            }

            public Builder message(String message) {
                this.message = message;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public Alert build() {
                return new Alert(this);
            }
        }
    }

    public static class AlertStatistics {
        private final int totalAlerts;
        private final int criticalAlerts;
        private final int warningAlerts;
        private final int infoAlerts;
        private final LocalDateTime timestamp;

        private AlertStatistics(Builder builder) {
            this.totalAlerts = builder.totalAlerts;
            this.criticalAlerts = builder.criticalAlerts;
            this.warningAlerts = builder.warningAlerts;
            this.infoAlerts = builder.infoAlerts;
            this.timestamp = builder.timestamp;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public int getTotalAlerts() { return totalAlerts; }
        public int getCriticalAlerts() { return criticalAlerts; }
        public int getWarningAlerts() { return warningAlerts; }
        public int getInfoAlerts() { return infoAlerts; }
        public LocalDateTime getTimestamp() { return timestamp; }

        public static class Builder {
            private int totalAlerts;
            private int criticalAlerts;
            private int warningAlerts;
            private int infoAlerts;
            private LocalDateTime timestamp;

            public Builder totalAlerts(int totalAlerts) {
                this.totalAlerts = totalAlerts;
                return this;
            }

            public Builder criticalAlerts(int criticalAlerts) {
                this.criticalAlerts = criticalAlerts;
                return this;
            }

            public Builder warningAlerts(int warningAlerts) {
                this.warningAlerts = warningAlerts;
                return this;
            }

            public Builder infoAlerts(int infoAlerts) {
                this.infoAlerts = infoAlerts;
                return this;
            }

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public AlertStatistics build() {
                return new AlertStatistics(this);
            }
        }
    }
}

/**
 * Enum for different types of alerts
 */
enum AlertType {
    SLOW_REQUEST,
    SLOW_DATABASE_QUERY,
    SLOW_CACHE_OPERATION,
    HIGH_MEMORY_USAGE,
    HIGH_CPU_USAGE,
    HIGH_ERROR_RATE,
    REQUEST_ERROR,
    DATABASE_CONNECTION_ERROR,
    CACHE_CONNECTION_ERROR,
    LOW_STOCK_CRITICAL,
    SYSTEM_STARTUP,
    SYSTEM_SHUTDOWN,
    SECURITY_BREACH,
    BUSINESS_RULE_VIOLATION
}

/**
 * Enum for alert severity levels
 */
enum AlertSeverity {
    INFO,
    WARNING,
    CRITICAL
}