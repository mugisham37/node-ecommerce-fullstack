package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.response.LowStockAlert;
import com.ecommerce.inventory.entity.Order;
import com.ecommerce.inventory.entity.OrderStatus;
import com.ecommerce.inventory.entity.Product;
import com.ecommerce.inventory.entity.User;
import com.ecommerce.inventory.event.inventory.LowStockEvent;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.event.order.OrderStatusChangedEvent;
import com.ecommerce.inventory.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Event-driven notification and alerting service.
 * Handles various types of notifications triggered by domain events.
 */
@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private UserRepository userRepository;

    /**
     * Send low stock alert notifications to managers and admins
     */
    public CompletableFuture<Void> sendLowStockAlert(LowStockEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.info("Sending low stock alert for product ID: {}", event.getProductId());

                // Get managers and admins
                List<User> recipients = userRepository.findByRoleIn(List.of("ADMIN", "MANAGER"));

                String subject = String.format("Low Stock Alert - Product ID: %d", event.getProductId());
                String message = buildLowStockMessage(event);

                // Send notifications to all recipients
                for (User recipient : recipients) {
                    sendNotification(recipient, subject, message, NotificationType.LOW_STOCK_ALERT);
                }

                logger.info("Low stock alert sent to {} recipients for product ID: {}", 
                           recipients.size(), event.getProductId());

            } catch (Exception e) {
                logger.error("Failed to send low stock alert for product ID: {}", event.getProductId(), e);
                throw new RuntimeException("Low stock alert notification failed", e);
            }
        });
    }

    /**
     * Send order creation notification
     */
    public CompletableFuture<Void> sendOrderCreatedNotification(OrderCreatedEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.info("Sending order created notification for order: {}", event.getOrderNumber());

                // Send confirmation to customer
                if (event.getCustomerEmail() != null && !event.getCustomerEmail().isEmpty()) {
                    String customerSubject = String.format("Order Confirmation - %s", event.getOrderNumber());
                    String customerMessage = buildOrderConfirmationMessage(event);
                    
                    sendEmailNotification(event.getCustomerEmail(), customerSubject, customerMessage);
                }

                // Notify managers about new order
                List<User> managers = userRepository.findByRoleIn(List.of("ADMIN", "MANAGER"));
                String managerSubject = String.format("New Order Created - %s", event.getOrderNumber());
                String managerMessage = buildNewOrderNotificationMessage(event);

                for (User manager : managers) {
                    sendNotification(manager, managerSubject, managerMessage, NotificationType.ORDER_CREATED);
                }

                logger.info("Order created notifications sent for order: {}", event.getOrderNumber());

            } catch (Exception e) {
                logger.error("Failed to send order created notification for order: {}", event.getOrderNumber(), e);
                throw new RuntimeException("Order created notification failed", e);
            }
        });
    }

    /**
     * Send order status change notification
     */
    public CompletableFuture<Void> sendOrderStatusChangeNotification(OrderStatusChangedEvent event) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.info("Sending order status change notification for order: {} - {} to {}", 
                           event.getOrderId(), event.getPreviousStatus(), event.getNewStatus());

                // Notify customer about status change
                if (event.getCustomerEmail() != null && !event.getCustomerEmail().isEmpty()) {
                    String customerSubject = String.format("Order Status Update - %s", event.getOrderNumber());
                    String customerMessage = buildOrderStatusChangeMessage(event);
                    
                    sendEmailNotification(event.getCustomerEmail(), customerSubject, customerMessage);
                }

                // Notify internal users for critical status changes
                if (isCriticalStatusChange(event.getNewStatus())) {
                    List<User> recipients = userRepository.findByRoleIn(List.of("ADMIN", "MANAGER"));
                    String internalSubject = String.format("Order Status Alert - %s", event.getOrderNumber());
                    String internalMessage = buildInternalStatusChangeMessage(event);

                    for (User recipient : recipients) {
                        sendNotification(recipient, internalSubject, internalMessage, NotificationType.ORDER_STATUS_CHANGE);
                    }
                }

                logger.info("Order status change notifications sent for order: {}", event.getOrderId());

            } catch (Exception e) {
                logger.error("Failed to send order status change notification for order: {}", event.getOrderId(), e);
                throw new RuntimeException("Order status change notification failed", e);
            }
        });
    }

    /**
     * Send inventory adjustment alert
     */
    public CompletableFuture<Void> sendInventoryAdjustmentAlert(Long productId, String productName, 
                                                               Integer previousQuantity, Integer newQuantity, 
                                                               String reason, String adjustedBy) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.info("Sending inventory adjustment alert for product: {}", productName);

                List<User> recipients = userRepository.findByRoleIn(List.of("ADMIN", "MANAGER"));
                String subject = String.format("Inventory Adjustment Alert - %s", productName);
                String message = buildInventoryAdjustmentMessage(productId, productName, 
                                                               previousQuantity, newQuantity, reason, adjustedBy);

                for (User recipient : recipients) {
                    sendNotification(recipient, subject, message, NotificationType.INVENTORY_ADJUSTMENT);
                }

                logger.info("Inventory adjustment alert sent to {} recipients for product: {}", 
                           recipients.size(), productName);

            } catch (Exception e) {
                logger.error("Failed to send inventory adjustment alert for product: {}", productName, e);
                throw new RuntimeException("Inventory adjustment alert failed", e);
            }
        });
    }

    /**
     * Send daily inventory report
     */
    public CompletableFuture<Void> sendDailyInventoryReport(List<LowStockAlert> lowStockAlerts, 
                                                           Map<String, Object> inventorySummary) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.info("Sending daily inventory report with {} low stock alerts", lowStockAlerts.size());

                List<User> recipients = userRepository.findByRoleIn(List.of("ADMIN", "MANAGER"));
                String subject = String.format("Daily Inventory Report - %s", 
                                              LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
                String message = buildDailyInventoryReportMessage(lowStockAlerts, inventorySummary);

                for (User recipient : recipients) {
                    sendNotification(recipient, subject, message, NotificationType.DAILY_REPORT);
                }

                logger.info("Daily inventory report sent to {} recipients", recipients.size());

            } catch (Exception e) {
                logger.error("Failed to send daily inventory report", e);
                throw new RuntimeException("Daily inventory report failed", e);
            }
        });
    }

    /**
     * Send system alert notification
     */
    public CompletableFuture<Void> sendSystemAlert(String alertType, String message, String severity) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.warn("Sending system alert: {} - {}", alertType, severity);

                List<User> admins = userRepository.findByRole("ADMIN");
                String subject = String.format("System Alert - %s [%s]", alertType, severity);

                for (User admin : admins) {
                    sendNotification(admin, subject, message, NotificationType.SYSTEM_ALERT);
                }

                logger.info("System alert sent to {} administrators", admins.size());

            } catch (Exception e) {
                logger.error("Failed to send system alert: {}", alertType, e);
                throw new RuntimeException("System alert notification failed", e);
            }
        });
    }

    // Private helper methods

    private void sendNotification(User recipient, String subject, String message, NotificationType type) {
        try {
            // In a real implementation, this would integrate with email service, SMS, push notifications, etc.
            logger.info("Sending {} notification to user {} ({}): {}", 
                       type, recipient.getEmail(), recipient.getFirstName() + " " + recipient.getLastName(), subject);
            
            // Simulate notification sending
            sendEmailNotification(recipient.getEmail(), subject, message);
            
            // Could also send in-app notifications, SMS, etc. based on user preferences
            
        } catch (Exception e) {
            logger.error("Failed to send notification to user {}: {}", recipient.getEmail(), e.getMessage());
        }
    }

    private void sendEmailNotification(String email, String subject, String message) {
        // In a real implementation, this would integrate with an email service like SendGrid, AWS SES, etc.
        logger.info("EMAIL TO: {} | SUBJECT: {} | MESSAGE: {}", email, subject, message.substring(0, Math.min(100, message.length())) + "...");
    }

    private String buildLowStockMessage(LowStockEvent event) {
        return String.format("""
            Low Stock Alert
            
            Product ID: %d
            Current Stock: %d
            Reorder Level: %d
            
            Immediate action required to replenish inventory.
            
            Alert Time: %s
            """, 
            event.getProductId(), 
            event.getCurrentStock(), 
            event.getReorderLevel(),
            LocalDateTime.now().format(TIMESTAMP_FORMAT));
    }

    private String buildOrderConfirmationMessage(OrderCreatedEvent event) {
        return String.format("""
            Order Confirmation
            
            Dear %s,
            
            Thank you for your order!
            
            Order Number: %s
            Total Amount: $%.2f
            Items: %d
            
            We will process your order shortly and send you tracking information.
            
            Order Date: %s
            """,
            event.getCustomerName(),
            event.getOrderNumber(),
            event.getTotalAmount(),
            event.getTotalItemCount(),
            LocalDateTime.now().format(TIMESTAMP_FORMAT));
    }

    private String buildNewOrderNotificationMessage(OrderCreatedEvent event) {
        return String.format("""
            New Order Created
            
            Order Number: %s
            Customer: %s (%s)
            Total Amount: $%.2f
            Items: %d
            
            Please review and process the order.
            
            Order Date: %s
            """,
            event.getOrderNumber(),
            event.getCustomerName(),
            event.getCustomerEmail(),
            event.getTotalAmount(),
            event.getTotalItemCount(),
            LocalDateTime.now().format(TIMESTAMP_FORMAT));
    }

    private String buildOrderStatusChangeMessage(OrderStatusChangedEvent event) {
        return String.format("""
            Order Status Update
            
            Your order %s has been updated.
            
            Previous Status: %s
            New Status: %s
            
            %s
            
            Updated: %s
            """,
            event.getOrderNumber(),
            event.getPreviousStatus().getDescription(),
            event.getNewStatus().getDescription(),
            getStatusChangeDescription(event.getNewStatus()),
            LocalDateTime.now().format(TIMESTAMP_FORMAT));
    }

    private String buildInternalStatusChangeMessage(OrderStatusChangedEvent event) {
        return String.format("""
            Order Status Change Alert
            
            Order: %s
            Customer: %s
            Status: %s → %s
            Reason: %s
            
            Please review if action is required.
            
            Updated: %s
            """,
            event.getOrderNumber(),
            event.getCustomerName(),
            event.getPreviousStatus().getDescription(),
            event.getNewStatus().getDescription(),
            event.getReason() != null ? event.getReason() : "Not specified",
            LocalDateTime.now().format(TIMESTAMP_FORMAT));
    }

    private String buildInventoryAdjustmentMessage(Long productId, String productName, 
                                                  Integer previousQuantity, Integer newQuantity, 
                                                  String reason, String adjustedBy) {
        return String.format("""
            Inventory Adjustment Alert
            
            Product: %s (ID: %d)
            Previous Quantity: %d
            New Quantity: %d
            Change: %+d
            
            Reason: %s
            Adjusted By: %s
            
            Adjustment Time: %s
            """,
            productName,
            productId,
            previousQuantity,
            newQuantity,
            newQuantity - previousQuantity,
            reason,
            adjustedBy,
            LocalDateTime.now().format(TIMESTAMP_FORMAT));
    }

    private String buildDailyInventoryReportMessage(List<LowStockAlert> lowStockAlerts, 
                                                   Map<String, Object> inventorySummary) {
        StringBuilder message = new StringBuilder();
        message.append("Daily Inventory Report\n\n");
        message.append(String.format("Report Date: %s\n\n", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))));
        
        // Inventory summary
        message.append("Inventory Summary:\n");
        inventorySummary.forEach((key, value) -> 
            message.append(String.format("- %s: %s\n", key, value)));
        message.append("\n");
        
        // Low stock alerts
        if (!lowStockAlerts.isEmpty()) {
            message.append(String.format("Low Stock Alerts (%d items):\n", lowStockAlerts.size()));
            for (LowStockAlert alert : lowStockAlerts) {
                message.append(String.format("- %s (SKU: %s): %d units (Reorder: %d)\n",
                    alert.getProductName(), alert.getSku(), alert.getCurrentStock(), alert.getReorderLevel()));
            }
        } else {
            message.append("No low stock alerts today.\n");
        }
        
        return message.toString();
    }

    private boolean isCriticalStatusChange(OrderStatus status) {
        return status == OrderStatus.CANCELLED || status == OrderStatus.SHIPPED || status == OrderStatus.DELIVERED;
    }

    private String getStatusChangeDescription(OrderStatus status) {
        return switch (status) {
            case PENDING -> "Your order is pending confirmation.";
            case CONFIRMED -> "Your order has been confirmed and will be processed soon.";
            case PROCESSING -> "Your order is being processed.";
            case SHIPPED -> "Your order has been shipped and is on its way to you.";
            case DELIVERED -> "Your order has been delivered.";
            case CANCELLED -> "Your order has been cancelled.";
        };
    }

    /**
     * Notification types enum
     */
    public enum NotificationType {
        LOW_STOCK_ALERT,
        ORDER_CREATED,
        ORDER_STATUS_CHANGE,
        INVENTORY_ADJUSTMENT,
        DAILY_REPORT,
        SYSTEM_ALERT
    }
}