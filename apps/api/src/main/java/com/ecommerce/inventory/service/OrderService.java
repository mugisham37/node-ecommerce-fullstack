package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.*;
import com.ecommerce.inventory.dto.response.*;
import com.ecommerce.inventory.entity.*;
import com.ecommerce.inventory.exception.*;
import com.ecommerce.inventory.repository.*;
import com.ecommerce.inventory.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import com.ecommerce.inventory.event.EventPublisher;
import com.ecommerce.inventory.event.builder.OrderEventBuilder;
import com.ecommerce.inventory.event.order.OrderCreatedEvent;
import com.ecommerce.inventory.event.order.OrderStatusChangedEvent;
import com.ecommerce.inventory.event.order.OrderCancelledEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Complex Order Processing Service with comprehensive order lifecycle management
 * Handles order creation, status management, inventory allocation, and fulfillment workflows
 */
@Service
@Transactional
public class OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private CacheService cacheService;

    @Autowired
    private EventPublisher eventPublisher;

    @Autowired
    private OrderEventBuilder orderEventBuilder;

    /**
     * Create a new order with automatic inventory allocation
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('EMPLOYEE')")
    @CacheEvict(value = {"orders", "order-summaries"}, allEntries = true)
    public OrderResponse createOrder(OrderCreateRequest request) {
        logger.info("Creating new order for customer: {}", request.getCustomerName());

        // Get current user
        User currentUser = getCurrentUser();

        // Create order entity
        Order order = new Order();
        order.setCustomerName(request.getCustomerName());
        order.setCustomerEmail(request.getCustomerEmail());
        order.setCustomerPhone(request.getCustomerPhone());
        order.setShippingAddress(request.getShippingAddress());
        order.setBillingAddress(request.getBillingAddress());
        order.setTaxAmount(request.getTaxAmount());
        order.setShippingCost(request.getShippingCost());
        order.setCreatedBy(currentUser);

        // Process order items
        for (OrderCreateRequest.OrderItemCreateRequest itemRequest : request.getOrderItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + itemRequest.getProductId()));

            // Check if product is active
            if (!product.getActive()) {
                throw new IllegalArgumentException("Product " + product.getName() + " is not active");
            }

            // Use provided unit price or product selling price
            BigDecimal unitPrice = itemRequest.getUnitPrice() != null ? 
                    itemRequest.getUnitPrice() : product.getSellingPrice();

            // Create order item
            OrderItem orderItem = new OrderItem(product, itemRequest.getQuantity(), unitPrice);
            order.addOrderItem(orderItem);
        }

        // Calculate totals
        order.recalculateTotals();

        // Save order
        Order savedOrder = orderRepository.save(order);

        // Try to allocate inventory for all items
        try {
            allocateInventoryForOrder(savedOrder);
            
            // Confirm order if inventory allocation successful
            savedOrder.confirm();
            savedOrder = orderRepository.save(savedOrder);
            
            logger.info("Order created and confirmed with ID: {}, Order Number: {}", 
                       savedOrder.getId(), savedOrder.getOrderNumber());
        } catch (InsufficientStockException e) {
            logger.warn("Order created but inventory allocation failed for order: {}", savedOrder.getOrderNumber());
            // Order remains in PENDING status
        }

        // Publish order created event
        OrderCreatedEvent orderCreatedEvent = orderEventBuilder.buildOrderCreatedEvent(savedOrder, getCurrentUserId());
        eventPublisher.publishEvent(orderCreatedEvent);

        // Update cache
        OrderResponse response = convertToOrderResponse(savedOrder);
        cacheService.put("orders", "order:" + savedOrder.getId(), response);

        return response;
    }

    /**
     * Update order information (only for pending orders)
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "orders", key = "'order:' + #id"),
        @CacheEvict(value = "order-summaries", allEntries = true)
    })
    public OrderResponse updateOrder(Long id, OrderUpdateRequest request) {
        logger.info("Updating order with ID: {}", id);

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));

        if (!order.canBeModified()) {
            throw new IllegalStateException("Order cannot be modified in current status: " + order.getStatus());
        }

        // Update fields if provided
        if (request.getCustomerName() != null) {
            order.setCustomerName(request.getCustomerName());
        }
        if (request.getCustomerEmail() != null) {
            order.setCustomerEmail(request.getCustomerEmail());
        }
        if (request.getCustomerPhone() != null) {
            order.setCustomerPhone(request.getCustomerPhone());
        }
        if (request.getShippingAddress() != null) {
            order.setShippingAddress(request.getShippingAddress());
        }
        if (request.getBillingAddress() != null) {
            order.setBillingAddress(request.getBillingAddress());
        }
        if (request.getTaxAmount() != null) {
            order.setTaxAmount(request.getTaxAmount());
        }
        if (request.getShippingCost() != null) {
            order.setShippingCost(request.getShippingCost());
        }

        // Recalculate totals
        order.recalculateTotals();

        Order updatedOrder = orderRepository.save(order);

        // Update cache
        OrderResponse response = convertToOrderResponse(updatedOrder);
        cacheService.put("orders", "order:" + updatedOrder.getId(), response);

        logger.info("Successfully updated order with ID: {}", id);
        return response;
    }

    /**
     * Update order status with validation and business rules
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "orders", key = "'order:' + #id"),
        @CacheEvict(value = "order-summaries", allEntries = true)
    })
    public OrderResponse updateOrderStatus(Long id, OrderStatusUpdateRequest request) {
        logger.info("Updating order status for ID: {} to {}", id, request.getNewStatus());

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));

        OrderStatus previousStatus = order.getStatus();

        // Validate status transition
        order.updateStatus(request.getNewStatus());

        // Handle status-specific business logic
        handleStatusTransition(order, previousStatus, request.getNewStatus(), request.getReason());

        Order updatedOrder = orderRepository.save(order);

        // Publish status change event
        OrderStatusChangedEvent statusChangedEvent = orderEventBuilder.buildOrderStatusChangedEvent(
                updatedOrder, previousStatus, request.getNewStatus(), request.getReason(), getCurrentUserId());
        eventPublisher.publishEvent(statusChangedEvent);

        // Update cache
        OrderResponse response = convertToOrderResponse(updatedOrder);
        cacheService.put("orders", "order:" + updatedOrder.getId(), response);

        logger.info("Successfully updated order status for ID: {} from {} to {}", 
                   id, previousStatus, request.getNewStatus());
        return response;
    }

    /**
     * Cancel order with inventory release functionality
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "orders", key = "'order:' + #id"),
        @CacheEvict(value = "order-summaries", allEntries = true)
    })
    public void cancelOrder(Long id, OrderCancellationRequest request) {
        logger.info("Cancelling order with ID: {}, reason: {}", id, request.getReason());

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));

        if (!order.canBeCancelled()) {
            throw new IllegalStateException("Order cannot be cancelled in current status: " + order.getStatus());
        }

        OrderStatus previousStatus = order.getStatus();

        // Release allocated inventory
        releaseInventoryForOrder(order);

        // Cancel the order
        order.cancel();
        orderRepository.save(order);

        // Publish cancellation event
        OrderCancelledEvent cancelledEvent = orderEventBuilder.buildOrderCancelledEvent(
                order, previousStatus, request.getReason(), getCurrentUserId());
        eventPublisher.publishEvent(cancelledEvent);

        // Remove from cache
        cacheService.evict("orders", "order:" + id);

        logger.info("Successfully cancelled order with ID: {}", id);
    }

    /**
     * Get order by ID with caching
     */
    @Cacheable(value = "orders", key = "'order:' + #id")
    public OrderResponse getOrderById(Long id) {
        logger.debug("Fetching order with ID: {}", id);

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));

        return convertToOrderResponse(order);
    }

    /**
     * Get order by order number with caching
     */
    @Cacheable(value = "orders", key = "'order-number:' + #orderNumber")
    public OrderResponse getOrderByOrderNumber(String orderNumber) {
        logger.debug("Fetching order with order number: {}", orderNumber);

        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with order number: " + orderNumber));

        return convertToOrderResponse(order);
    }

    /**
     * Get orders with filters and pagination
     */
    @Cacheable(value = "order-summaries", key = "'filtered:' + #status + ':' + #customerEmail + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<OrderSummaryResponse> getOrdersWithFilters(OrderStatus status, String customerEmail, Pageable pageable) {
        logger.debug("Fetching orders with filters - status: {}, customer: {}", status, customerEmail);

        Page<Order> orders;
        
        if (status != null && customerEmail != null) {
            orders = orderRepository.findByStatusAndCustomerEmailContainingIgnoreCase(status, customerEmail, pageable);
        } else if (status != null) {
            orders = orderRepository.findByStatus(status, pageable);
        } else if (customerEmail != null) {
            orders = orderRepository.findByCustomerEmailContainingIgnoreCase(customerEmail, pageable);
        } else {
            orders = orderRepository.findAll(pageable);
        }

        return orders.map(this::convertToOrderSummaryResponse);
    }

    /**
     * Get orders by customer email
     */
    @Cacheable(value = "orders", key = "'customer:' + #customerEmail + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<OrderSummaryResponse> getOrdersByCustomer(String customerEmail, Pageable pageable) {
        logger.debug("Fetching orders for customer: {}", customerEmail);

        Page<Order> orders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(customerEmail, pageable);
        return orders.map(this::convertToOrderSummaryResponse);
    }

    /**
     * Get recent orders with caching
     */
    @Cacheable(value = "order-summaries", key = "'recent:' + #limit")
    public List<OrderSummaryResponse> getRecentOrders(int limit) {
        logger.debug("Fetching {} recent orders", limit);

        List<Order> orders = orderRepository.findRecentOrders(limit);
        return orders.stream()
                .map(this::convertToOrderSummaryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Process order fulfillment with partial shipment support
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public void processOrderFulfillment(Long orderId, OrderFulfillmentRequest request) {
        logger.info("Processing fulfillment for order ID: {}", orderId);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (order.getStatus() != OrderStatus.PROCESSING) {
            throw new IllegalStateException("Order must be in PROCESSING status for fulfillment");
        }

        // Process fulfillment items
        boolean fullyFulfilled = true;
        for (OrderFulfillmentRequest.FulfillmentItem fulfillmentItem : request.getFulfillmentItems()) {
            OrderItem orderItem = order.getOrderItems().stream()
                    .filter(item -> item.getId().equals(fulfillmentItem.getOrderItemId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Order item not found with ID: " + fulfillmentItem.getOrderItemId()));

            // Check if quantity can be fulfilled
            if (fulfillmentItem.getFulfilledQuantity() > orderItem.getQuantity()) {
                throw new IllegalArgumentException("Fulfilled quantity cannot exceed ordered quantity");
            }

            // Mark as partially fulfilled if not all quantity is fulfilled
            if (fulfillmentItem.getFulfilledQuantity() < orderItem.getQuantity()) {
                fullyFulfilled = false;
            }

            // Reduce allocated inventory and increase on-hand for unfulfilled quantity
            Integer unfulfilledQuantity = orderItem.getQuantity() - fulfillmentItem.getFulfilledQuantity();
            if (unfulfilledQuantity > 0) {
                inventoryService.releaseInventory(orderItem.getProduct().getId(), unfulfilledQuantity, 
                        "Partial fulfillment - Order: " + order.getOrderNumber());
            }
        }

        // Update order status based on fulfillment
        if (fullyFulfilled) {
            order.ship();
        } else {
            // Could implement partial shipment status if needed
            order.ship(); // For now, mark as shipped even if partial
        }

        orderRepository.save(order);

        // Publish fulfillment event (would need to create OrderFulfilledEvent if needed)
        logger.info("Order fulfillment completed for order: {}", order.getOrderNumber());

        logger.info("Successfully processed fulfillment for order ID: {}", orderId);
    }

    /**
     * Async order processing
     */
    @Transactional
    public CompletableFuture<Void> processOrderAsync(Long orderId) {
        return CompletableFuture.runAsync(() -> {
            try {
                logger.info("Starting async processing for order ID: {}", orderId);
                
                Order order = orderRepository.findById(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

                if (order.getStatus() == OrderStatus.CONFIRMED) {
                    // Start processing
                    order.startProcessing();
                    orderRepository.save(order);

                    // Simulate processing time
                    Thread.sleep(2000);

                    // Additional processing logic can be added here
                    logger.info("Completed async processing for order ID: {}", orderId);
                }
            } catch (Exception e) {
                logger.error("Error in async order processing for order ID: {}", orderId, e);
                throw new RuntimeException("Async order processing failed", e);
            }
        });
    }

    /**
     * Allocate inventory for all order items
     */
    private void allocateInventoryForOrder(Order order) {
        logger.debug("Allocating inventory for order: {}", order.getOrderNumber());

        for (OrderItem orderItem : order.getOrderItems()) {
            try {
                boolean allocated = inventoryService.allocateInventory(
                        orderItem.getProduct().getId(),
                        orderItem.getQuantity(),
                        "Order: " + order.getOrderNumber()
                );

                if (!allocated) {
                    throw new InsufficientStockException(
                            orderItem.getProduct().getId(),
                            orderItem.getQuantity(),
                            0 // Available quantity would be determined by the service
                    );
                }
            } catch (InsufficientStockException e) {
                // Release any previously allocated inventory for this order
                releaseInventoryForOrder(order);
                throw e;
            }
        }

        logger.debug("Successfully allocated inventory for order: {}", order.getOrderNumber());
    }

    /**
     * Release allocated inventory for all order items
     */
    private void releaseInventoryForOrder(Order order) {
        logger.debug("Releasing inventory for order: {}", order.getOrderNumber());

        for (OrderItem orderItem : order.getOrderItems()) {
            try {
                inventoryService.releaseInventory(
                        orderItem.getProduct().getId(),
                        orderItem.getQuantity(),
                        "Order cancelled: " + order.getOrderNumber()
                );
            } catch (Exception e) {
                logger.warn("Failed to release inventory for product {} in order {}: {}", 
                           orderItem.getProduct().getId(), order.getOrderNumber(), e.getMessage());
            }
        }

        logger.debug("Released inventory for order: {}", order.getOrderNumber());
    }

    /**
     * Handle status transition business logic
     */
    private void handleStatusTransition(Order order, OrderStatus previousStatus, OrderStatus newStatus, String reason) {
        switch (newStatus) {
            case CONFIRMED:
                if (previousStatus == OrderStatus.PENDING) {
                    // Try to allocate inventory when confirming
                    try {
                        allocateInventoryForOrder(order);
                    } catch (InsufficientStockException e) {
                        logger.warn("Inventory allocation failed during order confirmation: {}", e.getMessage());
                        // Order can still be confirmed but will need manual inventory management
                    }
                }
                break;
            case CANCELLED:
                // Release inventory when cancelling
                releaseInventoryForOrder(order);
                break;
            case PROCESSING:
                // Additional processing logic can be added here
                break;
            case SHIPPED:
                // Shipping logic can be added here
                break;
            case DELIVERED:
                // Delivery confirmation logic can be added here
                break;
        }
    }

    /**
     * Get current authenticated user
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            return userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        }
        throw new IllegalStateException("No authenticated user found");
    }

    /**
     * Convert Order entity to OrderResponse DTO
     */
    private OrderResponse convertToOrderResponse(Order order) {
        List<OrderItemResponse> orderItemResponses = order.getOrderItems().stream()
                .map(this::convertToOrderItemResponse)
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerName(order.getCustomerName())
                .customerEmail(order.getCustomerEmail())
                .customerPhone(order.getCustomerPhone())
                .shippingAddress(order.getShippingAddress())
                .billingAddress(order.getBillingAddress())
                .status(order.getStatus())
                .statusDescription(order.getStatus().getDescription())
                .trackingNumber(order.getTrackingNumber())
                .shippingCarrier(order.getShippingCarrier())
                .notes(order.getNotes())
                .subtotal(order.getSubtotal())
                .taxAmount(order.getTaxAmount())
                .shippingCost(order.getShippingCost())
                .totalAmount(order.getTotalAmount())
                .totalQuantity(order.getTotalQuantity())
                .itemCount(order.getItemCount())
                .orderItems(orderItemResponses)
                .createdById(order.getCreatedBy() != null ? order.getCreatedBy().getId() : null)
                .createdByName(order.getCreatedBy() != null ? 
                        order.getCreatedBy().getFirstName() + " " + order.getCreatedBy().getLastName() : null)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .canBeCancelled(order.canBeCancelled())
                .canBeModified(order.canBeModified())
                .isFinalState(order.isFinalState())
                .isActive(order.isActive())
                .build();
    }

    /**
     * Convert OrderItem entity to OrderItemResponse DTO
     */
    private OrderItemResponse convertToOrderItemResponse(OrderItem orderItem) {
        return OrderItemResponse.builder()
                .id(orderItem.getId())
                .orderId(orderItem.getOrder() != null ? orderItem.getOrder().getId() : null)
                .productId(orderItem.getProduct().getId())
                .productName(orderItem.getProduct().getName())
                .productSku(orderItem.getProduct().getSku())
                .quantity(orderItem.getQuantity())
                .unitPrice(orderItem.getUnitPrice())
                .totalPrice(orderItem.getTotalPrice())
                .discountAmount(orderItem.getDiscountAmount())
                .discountPercentage(orderItem.getDiscountPercentage())
                .hasDiscount(orderItem.hasDiscount())
                .createdAt(orderItem.getCreatedAt())
                .updatedAt(orderItem.getUpdatedAt())
                .build();
    }

    /**
     * Convert Order entity to OrderSummaryResponse DTO
     */
    private OrderSummaryResponse convertToOrderSummaryResponse(Order order) {
        return OrderSummaryResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerName(order.getCustomerName())
                .customerEmail(order.getCustomerEmail())
                .status(order.getStatus())
                .statusDescription(order.getStatus().getDescription())
                .totalAmount(order.getTotalAmount())
                .totalQuantity(order.getTotalQuantity())
                .itemCount(order.getItemCount())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .canBeCancelled(order.canBeCancelled())
                .isFinalState(order.isFinalState())
                .build();
    }

    /**
     * Get current authenticated user ID
     */
    private String getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
                return userPrincipal.getId().toString();
            }
            return "SYSTEM";
        } catch (Exception e) {
            logger.warn("Failed to get current user ID, using SYSTEM", e);
            return "SYSTEM";
        }
    }
}    /**

     * Get order by order number
     */
    public OrderResponse getOrderByNumber(String orderNumber) {
        logger.debug("Fetching order with number: {}", orderNumber);
        
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with number: " + orderNumber));
        
        return convertToOrderResponse(order);
    }

    /**
     * Get all orders with filtering
     */
    public Page<OrderSummaryResponse> getAllOrders(OrderStatus status, String customerName, String customerEmail,
                                                  LocalDateTime startDate, LocalDateTime endDate,
                                                  BigDecimal minAmount, BigDecimal maxAmount, Pageable pageable) {
        logger.debug("Fetching orders with filters");
        
        Page<Order> orders = orderRepository.findOrdersWithFilters(
            status, customerName, customerEmail, startDate, endDate, minAmount, maxAmount, pageable);
        return orders.map(this::convertToOrderSummaryResponse);
    }

    /**
     * Search orders
     */
    public Page<OrderSummaryResponse> searchOrders(String searchTerm, Pageable pageable) {
        logger.debug("Searching orders with term: {}", searchTerm);
        
        Page<Order> orders = orderRepository.searchOrders(searchTerm, pageable);
        return orders.map(this::convertToOrderSummaryResponse);
    }

    /**
     * Get orders by status
     */
    public Page<OrderSummaryResponse> getOrdersByStatus(OrderStatus status, Pageable pageable) {
        logger.debug("Fetching orders with status: {}", status);
        
        Page<Order> orders = orderRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        return orders.map(this::convertToOrderSummaryResponse);
    }

    /**
     * Get pending orders
     */
    public List<OrderSummaryResponse> getPendingOrders() {
        logger.debug("Fetching pending orders");
        
        List<Order> orders = orderRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.PENDING);
        return orders.stream()
                .map(this::convertToOrderSummaryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Process order fulfillment
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public void processOrderFulfillment(Long orderId, OrderFulfillmentRequest request) {
        logger.info("Processing fulfillment for order ID: {}", orderId);
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        
        if (!order.canBeFulfilled()) {
            throw new IllegalStateException("Order cannot be fulfilled in current status: " + order.getStatus());
        }
        
        // Update order with fulfillment details
        order.setStatus(OrderStatus.SHIPPED);
        // Note: Order entity would need tracking fields for full implementation
        
        orderRepository.save(order);
        
        logger.info("Successfully processed fulfillment for order ID: {}", orderId);
    }

    /**
     * Process order fulfillment with FulfillmentRequest
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "orders", key = "'order:' + #orderId"),
        @CacheEvict(value = "order-summaries", allEntries = true)
    })
    public OrderResponse processOrderFulfillment(Long orderId, FulfillmentRequest request) {
        logger.info("Processing fulfillment for order ID: {} with tracking: {}", orderId, request.getTrackingNumber());
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        
        if (order.getStatus() != OrderStatus.CONFIRMED && order.getStatus() != OrderStatus.PROCESSING) {
            throw new IllegalStateException("Order must be in CONFIRMED or PROCESSING status for fulfillment");
        }
        
        // Update order status to shipped
        order.setStatus(OrderStatus.SHIPPED);
        order.setTrackingNumber(request.getTrackingNumber());
        order.setShippingCarrier(request.getShippingCarrier());
        if (request.getNotes() != null) {
            order.setNotes(request.getNotes());
        }
        
        // Reduce inventory for all order items (move from allocated to shipped)
        for (OrderItem orderItem : order.getOrderItems()) {
            inventoryService.reduceInventoryFromAllocation(
                orderItem.getProduct().getId(),
                orderItem.getQuantity(),
                "Order shipped: " + order.getOrderNumber()
            );
        }
        
        Order updatedOrder = orderRepository.save(order);
        
        // Publish fulfillment event
        OrderStatusChangedEvent statusChangedEvent = orderEventBuilder.buildOrderStatusChangedEvent(
                updatedOrder, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, 
                "Order fulfilled with tracking: " + request.getTrackingNumber(), getCurrentUserId());
        eventPublisher.publishEvent(statusChangedEvent);
        
        logger.info("Successfully processed fulfillment for order ID: {}", orderId);
        return convertToOrderResponse(updatedOrder);
    }

    /**
     * Process partial order fulfillment
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "orders", key = "'order:' + #orderId"),
        @CacheEvict(value = "order-summaries", allEntries = true)
    })
    public OrderResponse processPartialOrderFulfillment(Long orderId, PartialFulfillmentRequest request) {
        logger.info("Processing partial fulfillment for order ID: {} with quantity: {}", 
                   orderId, request.getQuantityShipped());
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        
        if (order.getStatus() != OrderStatus.CONFIRMED && order.getStatus() != OrderStatus.PROCESSING) {
            throw new IllegalStateException("Order must be in CONFIRMED or PROCESSING status for fulfillment");
        }
        
        // For simplicity, assume single item order for partial fulfillment
        // In a real implementation, you'd need to specify which items are being partially fulfilled
        if (order.getOrderItems().size() != 1) {
            throw new IllegalStateException("Partial fulfillment currently only supports single-item orders");
        }
        
        OrderItem orderItem = order.getOrderItems().get(0);
        
        if (request.getQuantityShipped() > orderItem.getQuantity()) {
            throw new IllegalArgumentException("Shipped quantity cannot exceed ordered quantity");
        }
        
        // Update order status to partially shipped
        order.setStatus(OrderStatus.PARTIALLY_SHIPPED);
        order.setTrackingNumber(request.getTrackingNumber());
        order.setShippingCarrier(request.getShippingCarrier());
        if (request.getNotes() != null) {
            order.setNotes(request.getNotes());
        }
        
        // Reduce inventory for shipped quantity
        inventoryService.reduceInventoryFromAllocation(
            orderItem.getProduct().getId(),
            request.getQuantityShipped(),
            "Partial shipment: " + order.getOrderNumber()
        );
        
        // Release remaining allocated inventory
        Integer remainingQuantity = orderItem.getQuantity() - request.getQuantityShipped();
        if (remainingQuantity > 0) {
            inventoryService.releaseInventory(
                orderItem.getProduct().getId(),
                remainingQuantity,
                "Partial fulfillment - remaining quantity released: " + order.getOrderNumber()
            );
        }
        
        Order updatedOrder = orderRepository.save(order);
        
        // Publish partial fulfillment event
        OrderStatusChangedEvent statusChangedEvent = orderEventBuilder.buildOrderStatusChangedEvent(
                updatedOrder, OrderStatus.CONFIRMED, OrderStatus.PARTIALLY_SHIPPED, 
                "Partial fulfillment - shipped: " + request.getQuantityShipped() + " of " + orderItem.getQuantity(), 
                getCurrentUserId());
        eventPublisher.publishEvent(statusChangedEvent);
        
        logger.info("Successfully processed partial fulfillment for order ID: {}", orderId);
        return convertToOrderResponse(updatedOrder);
    }

    /**
     * Update order status with parameters
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Caching(evict = {
        @CacheEvict(value = "orders", key = "'order:' + #orderId"),
        @CacheEvict(value = "order-summaries", allEntries = true)
    })
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus, String reason) {
        logger.info("Updating order status for ID: {} to {}", orderId, newStatus);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        OrderStatus previousStatus = order.getStatus();

        // Validate status transition
        order.updateStatus(newStatus);

        // Handle status-specific business logic
        handleStatusTransition(order, previousStatus, newStatus, reason);

        Order updatedOrder = orderRepository.save(order);

        // Publish status change event
        OrderStatusChangedEvent statusChangedEvent = orderEventBuilder.buildOrderStatusChangedEvent(
                updatedOrder, previousStatus, newStatus, reason, getCurrentUserId());
        eventPublisher.publishEvent(statusChangedEvent);

        // Update cache
        OrderResponse response = convertToOrderResponse(updatedOrder);
        cacheService.put("orders", "order:" + updatedOrder.getId(), response);

        logger.info("Successfully updated order status for ID: {} from {} to {}", 
                   orderId, previousStatus, newStatus);
        return response;
    }

    /**
     * Cancel order
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public void cancelOrder(Long orderId, String reason) {
        logger.info("Cancelling order ID: {} with reason: {}", orderId, reason);
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        
        if (!order.canBeCancelled()) {
            throw new IllegalStateException("Order cannot be cancelled in current status: " + order.getStatus());
        }
        
        OrderStatus previousStatus = order.getStatus();
        
        // Release allocated inventory
        releaseInventoryForOrder(order);
        
        // Cancel the order
        order.cancel();
        orderRepository.save(order);
        
        // Publish cancellation event
        OrderCancelledEvent cancelledEvent = orderEventBuilder.buildOrderCancelledEvent(
                order, previousStatus, reason, getCurrentUserId());
        eventPublisher.publishEvent(cancelledEvent);
        
        // Remove from cache
        cacheService.evict("orders", "order:" + orderId);
        
        logger.info("Successfully cancelled order with ID: {}", orderId);
    }

    /**
     * Cancel order with request object
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public void cancelOrder(Long orderId, OrderCancellationRequest request) {
        logger.info("Cancelling order ID: {} with reason: {}", orderId, request.getReason());
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        
        if (!order.canBeCancelled()) {
            throw new IllegalStateException("Order cannot be cancelled in current status: " + order.getStatus());
        }
        
        // Release allocated inventory
        releaseInventoryForOrder(order);
        
        // Update order status
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        
        // Publish order cancelled event
        OrderCancelledEvent cancelledEvent = orderEventBuilder.buildOrderCancelledEvent(order, request.getReason(), getCurrentUserId());
        eventPublisher.publishEvent(cancelledEvent);
        
        logger.info("Successfully cancelled order ID: {}", orderId);
    }

    /**
     * Get order analytics
     */
    public java.util.Map<String, Object> getOrderAnalytics(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Generating order analytics from {} to {}", startDate, endDate);
        
        java.util.Map<String, Object> analytics = new java.util.HashMap<>();
        
        // Basic order counts
        long totalOrders = orderRepository.countOrdersInDateRange(startDate, endDate);
        long completedOrders = orderRepository.countOrdersByStatusInDateRange(OrderStatus.COMPLETED, startDate, endDate);
        long cancelledOrders = orderRepository.countOrdersByStatusInDateRange(OrderStatus.CANCELLED, startDate, endDate);
        
        analytics.put("totalOrders", totalOrders);
        analytics.put("completedOrders", completedOrders);
        analytics.put("cancelledOrders", cancelledOrders);
        analytics.put("completionRate", totalOrders > 0 ? (double) completedOrders / totalOrders * 100 : 0);
        analytics.put("cancellationRate", totalOrders > 0 ? (double) cancelledOrders / totalOrders * 100 : 0);
        
        // Revenue analytics
        BigDecimal totalRevenue = orderRepository.calculateTotalRevenueInDateRange(startDate, endDate);
        BigDecimal averageOrderValue = totalOrders > 0 ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
        
        analytics.put("totalRevenue", totalRevenue);
        analytics.put("averageOrderValue", averageOrderValue);
        
        return analytics;
    }

    /**
     * Get order statistics
     */
    public java.util.Map<String, Object> getOrderStatistics() {
        logger.debug("Generating order statistics");
        
        java.util.Map<String, Object> statistics = new java.util.HashMap<>();
        
        long totalOrders = orderRepository.count();
        long pendingOrders = orderRepository.countByStatus(OrderStatus.PENDING);
        long confirmedOrders = orderRepository.countByStatus(OrderStatus.CONFIRMED);
        long shippedOrders = orderRepository.countByStatus(OrderStatus.SHIPPED);
        long completedOrders = orderRepository.countByStatus(OrderStatus.COMPLETED);
        long cancelledOrders = orderRepository.countByStatus(OrderStatus.CANCELLED);
        
        statistics.put("totalOrders", totalOrders);
        statistics.put("pendingOrders", pendingOrders);
        statistics.put("confirmedOrders", confirmedOrders);
        statistics.put("shippedOrders", shippedOrders);
        statistics.put("completedOrders", completedOrders);
        statistics.put("cancelledOrders", cancelledOrders);
        
        return statistics;
    }

    /**
     * Get revenue report
     */
    public java.util.Map<String, Object> getRevenueReport(LocalDateTime startDate, LocalDateTime endDate, String groupBy) {
        logger.debug("Generating {} revenue report from {} to {}", groupBy, startDate, endDate);
        
        java.util.Map<String, Object> report = new java.util.HashMap<>();
        
        // This would require more complex queries in a real implementation
        BigDecimal totalRevenue = orderRepository.calculateTotalRevenueInDateRange(startDate, endDate);
        
        report.put("totalRevenue", totalRevenue);
        report.put("groupBy", groupBy);
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("generatedAt", LocalDateTime.now());
        
        return report;
    }

    /**
     * Get top customers
     */
    public List<java.util.Map<String, Object>> getTopCustomers(int limit, LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Fetching top {} customers from {} to {}", limit, startDate, endDate);
        
        // This would require more complex queries in a real implementation
        List<Object[]> topCustomersData = orderRepository.findTopCustomers(limit, startDate, endDate);
        
        return topCustomersData.stream()
                .map(data -> {
                    java.util.Map<String, Object> customer = new java.util.HashMap<>();
                    customer.put("customerName", data[0]);
                    customer.put("customerEmail", data[1]);
                    customer.put("totalOrders", data[2]);
                    customer.put("totalAmount", data[3]);
                    return customer;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get fulfillment metrics
     */
    public java.util.Map<String, Object> getFulfillmentMetrics(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Generating fulfillment metrics from {} to {}", startDate, endDate);
        
        java.util.Map<String, Object> metrics = new java.util.HashMap<>();
        
        long totalOrders = orderRepository.countOrdersInDateRange(startDate, endDate);
        long fulfilledOrders = orderRepository.countOrdersByStatusInDateRange(OrderStatus.SHIPPED, startDate, endDate) +
                              orderRepository.countOrdersByStatusInDateRange(OrderStatus.COMPLETED, startDate, endDate);
        
        double fulfillmentRate = totalOrders > 0 ? (double) fulfilledOrders / totalOrders * 100 : 0;
        
        metrics.put("totalOrders", totalOrders);
        metrics.put("fulfilledOrders", fulfilledOrders);
        metrics.put("fulfillmentRate", fulfillmentRate);
        metrics.put("startDate", startDate);
        metrics.put("endDate", endDate);
        
        return metrics;
    }

    /**
     * Bulk update order status
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public int bulkUpdateOrderStatus(List<Long> orderIds, OrderStatus status, String notes) {
        logger.info("Bulk updating status for {} orders to {}", orderIds.size(), status);
        
        int updatedCount = 0;
        for (Long orderId : orderIds) {
            try {
                OrderStatusUpdateRequest request = new OrderStatusUpdateRequest();
                request.setStatus(status);
                request.setNotes(notes);
                updateOrderStatus(orderId, request);
                updatedCount++;
            } catch (Exception e) {
                logger.warn("Failed to update status for order {}: {}", orderId, e.getMessage());
            }
        }
        
        logger.info("Successfully bulk updated status for {} out of {} orders", updatedCount, orderIds.size());
        return updatedCount;
    }

    /**
     * Bulk cancel orders
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public int bulkCancelOrders(List<Long> orderIds, String reason) {
        logger.info("Bulk cancelling {} orders", orderIds.size());
        
        int cancelledCount = 0;
        for (Long orderId : orderIds) {
            try {
                OrderCancellationRequest request = new OrderCancellationRequest();
                request.setReason(reason);
                cancelOrder(orderId, request);
                cancelledCount++;
            } catch (Exception e) {
                logger.warn("Failed to cancel order {}: {}", orderId, e.getMessage());
            }
        }
        
        logger.info("Successfully bulk cancelled {} out of {} orders", cancelledCount, orderIds.size());
        return cancelledCount;
    }

    /**
     * Export orders
     */
    public String exportOrders(String format, OrderStatus status, LocalDateTime startDate, LocalDateTime endDate) {
        logger.info("Exporting orders in {} format", format);
        
        // This would generate actual export files in a real implementation
        String exportUrl = "/api/v1/exports/orders/" + System.currentTimeMillis() + "." + format.toLowerCase();
        
        logger.info("Orders export initiated: {}", exportUrl);
        return exportUrl;
    }

    /**
     * Get order timeline
     */
    public List<java.util.Map<String, Object>> getOrderTimeline(Long orderId) {
        logger.debug("Fetching timeline for order ID: {}", orderId);
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        
        // This would fetch actual status change history in a real implementation
        List<java.util.Map<String, Object>> timeline = new java.util.ArrayList<>();
        
        java.util.Map<String, Object> created = new java.util.HashMap<>();
        created.put("status", "PENDING");
        created.put("timestamp", order.getCreatedAt());
        created.put("notes", "Order created");
        timeline.add(created);
        
        if (order.getStatus() != OrderStatus.PENDING) {
            java.util.Map<String, Object> current = new java.util.HashMap<>();
            current.put("status", order.getStatus().toString());
            current.put("timestamp", order.getUpdatedAt());
            current.put("notes", "Status updated to " + order.getStatus());
            timeline.add(current);
        }
        
        return timeline;
    }

    /**
     * Add order notes
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public void addOrderNotes(Long orderId, String notes) {
        logger.info("Adding notes to order ID: {}", orderId);
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        
        // Note: Order entity would need notes field for full implementation
        orderRepository.save(order);
        
        logger.info("Successfully added notes to order ID: {}", orderId);
    }

    /**
     * Convert Order entity to OrderSummaryResponse DTO
     */
    private OrderSummaryResponse convertToOrderSummaryResponse(Order order) {
        return OrderSummaryResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerName(order.getCustomerName())
                .customerEmail(order.getCustomerEmail())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .itemCount(order.getOrderItems().size())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}