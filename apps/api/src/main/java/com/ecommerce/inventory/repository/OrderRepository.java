package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.Order;
import com.ecommerce.inventory.entity.OrderStatus;
import com.ecommerce.inventory.schema.OrderSchema;
import com.ecommerce.inventory.schema.OrderItemSchema;
import com.ecommerce.inventory.schema.ProductSchema;
import com.ecommerce.inventory.schema.UserSchema;
import org.jooq.*;
import org.jooq.impl.DSL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Repository for Order entity with status filtering and analytics queries
 * Implements advanced order management operations using JOOQ
 */
@Repository
@Transactional
public class OrderRepository extends AbstractBaseRepository<Order, Long> {
    
    private static final Logger logger = LoggerFactory.getLogger(OrderRepository.class);
    
    @Override
    protected Order recordToEntity(Record record) {
        if (record == null) return null;
        
        Order order = new Order();
        order.setId(record.get(OrderSchema.ID));
        order.setOrderNumber(record.get(OrderSchema.ORDER_NUMBER));
        order.setCustomerName(record.get(OrderSchema.CUSTOMER_NAME));
        order.setCustomerEmail(record.get(OrderSchema.CUSTOMER_EMAIL));
        order.setCustomerPhone(record.get(OrderSchema.CUSTOMER_PHONE));
        order.setShippingAddress(record.get(OrderSchema.SHIPPING_ADDRESS));
        order.setBillingAddress(record.get(OrderSchema.BILLING_ADDRESS));
        
        String statusStr = record.get(OrderSchema.STATUS);
        if (statusStr != null) {
            order.setStatus(OrderStatus.valueOf(statusStr));
        }
        
        order.setSubtotal(record.get(OrderSchema.SUBTOTAL));
        order.setTaxAmount(record.get(OrderSchema.TAX_AMOUNT));
        order.setShippingCost(record.get(OrderSchema.SHIPPING_COST));
        order.setTotalAmount(record.get(OrderSchema.TOTAL_AMOUNT));
        
        // Set audit fields
        order.setCreatedAt(record.get(OrderSchema.CREATED_AT));
        order.setUpdatedAt(record.get(OrderSchema.UPDATED_AT));
        
        return order;
    }
    
    @Override
    protected Record entityToRecord(Order entity) {
        return dsl.newRecord(OrderSchema.ORDERS)
            .set(OrderSchema.ID, entity.getId())
            .set(OrderSchema.ORDER_NUMBER, entity.getOrderNumber())
            .set(OrderSchema.CUSTOMER_NAME, entity.getCustomerName())
            .set(OrderSchema.CUSTOMER_EMAIL, entity.getCustomerEmail())
            .set(OrderSchema.CUSTOMER_PHONE, entity.getCustomerPhone())
            .set(OrderSchema.SHIPPING_ADDRESS, entity.getShippingAddress())
            .set(OrderSchema.BILLING_ADDRESS, entity.getBillingAddress())
            .set(OrderSchema.STATUS, entity.getStatus() != null ? entity.getStatus().name() : OrderStatus.PENDING.name())
            .set(OrderSchema.SUBTOTAL, entity.getSubtotal())
            .set(OrderSchema.TAX_AMOUNT, entity.getTaxAmount())
            .set(OrderSchema.SHIPPING_COST, entity.getShippingCost())
            .set(OrderSchema.TOTAL_AMOUNT, entity.getTotalAmount())
            .set(OrderSchema.CREATED_BY, entity.getCreatedBy() != null ? entity.getCreatedBy().getId() : null)
            .set(OrderSchema.UPDATED_AT, LocalDateTime.now());
    }
    
    @Override
    protected Class<Order> getEntityClass() {
        return Order.class;
    }
    
    @Override
    public Table<Record> getTable() {
        return OrderSchema.ORDERS;
    }
    
    @Override
    public TableField<Record, Long> getIdField() {
        return OrderSchema.ID;
    }
    
    @Override
    protected Long getEntityId(Order entity) {
        return entity.getId();
    }
    
    // ========== ORDER STATUS FILTERING ==========
    
    /**
     * Find orders by status
     */
    @Transactional(readOnly = true)
    public List<Order> findByStatus(OrderStatus status) {
        logger.debug("Finding orders by status: {}", status);
        
        try {
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.STATUS.eq(status.name()))
                .orderBy(OrderSchema.CREATED_AT.desc())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} orders with status {}", orders.size(), status);
            return orders;
        } catch (Exception e) {
            logger.error("Error finding orders by status: {}", status, e);
            throw new RuntimeException("Failed to find orders by status", e);
        }
    }
    
    /**
     * Find orders by status with pagination
     */
    @Transactional(readOnly = true)
    public Page<Order> findByStatus(OrderStatus status, Pageable pageable) {
        logger.debug("Finding orders by status with pagination: {}", status);
        
        try {
            Condition condition = OrderSchema.STATUS.eq(status.name());
            
            Integer totalCount = dsl.selectCount()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .orderBy(OrderSchema.CREATED_AT.desc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(orders, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding orders by status with pagination", e);
            throw new RuntimeException("Failed to find orders by status with pagination", e);
        }
    }
    
    /**
     * Find orders by multiple statuses
     */
    @Transactional(readOnly = true)
    public List<Order> findByStatusIn(List<OrderStatus> statuses) {
        logger.debug("Finding orders by statuses: {}", statuses);
        
        if (statuses == null || statuses.isEmpty()) {
            return List.of();
        }
        
        try {
            List<String> statusNames = statuses.stream()
                .map(OrderStatus::name)
                .collect(Collectors.toList());
            
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.STATUS.in(statusNames))
                .orderBy(OrderSchema.CREATED_AT.desc())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} orders with statuses {}", orders.size(), statuses);
            return orders;
        } catch (Exception e) {
            logger.error("Error finding orders by statuses", e);
            throw new RuntimeException("Failed to find orders by statuses", e);
        }
    }

    /**
     * Find order by order number
     */
    @Transactional(readOnly = true)
    public Optional<Order> findByOrderNumber(String orderNumber) {
        logger.debug("Finding order by order number: {}", orderNumber);
        
        try {
            Record record = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.ORDER_NUMBER.eq(orderNumber))
                .fetchOne();
            
            if (record != null) {
                Order order = recordToEntity(record);
                logger.debug("Found order with order number: {}", orderNumber);
                return Optional.of(order);
            } else {
                logger.debug("Order not found with order number: {}", orderNumber);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding order by order number: {}", orderNumber, e);
            throw new RuntimeException("Failed to find order by order number", e);
        }
    }

    /**
     * Find orders by customer email containing (case insensitive)
     */
    @Transactional(readOnly = true)
    public Page<Order> findByCustomerEmailContainingIgnoreCase(String customerEmail, Pageable pageable) {
        logger.debug("Finding orders by customer email containing: {}", customerEmail);
        
        try {
            Condition condition = OrderSchema.CUSTOMER_EMAIL.likeIgnoreCase("%" + customerEmail + "%");
            
            Integer totalCount = dsl.selectCount()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .orderBy(OrderSchema.CREATED_AT.desc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(orders, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding orders by customer email", e);
            throw new RuntimeException("Failed to find orders by customer email", e);
        }
    }

    /**
     * Find orders by status and customer email containing (case insensitive)
     */
    @Transactional(readOnly = true)
    public Page<Order> findByStatusAndCustomerEmailContainingIgnoreCase(OrderStatus status, String customerEmail, Pageable pageable) {
        logger.debug("Finding orders by status {} and customer email containing: {}", status, customerEmail);
        
        try {
            Condition condition = OrderSchema.STATUS.eq(status.name())
                .and(OrderSchema.CUSTOMER_EMAIL.likeIgnoreCase("%" + customerEmail + "%"));
            
            Integer totalCount = dsl.selectCount()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .orderBy(OrderSchema.CREATED_AT.desc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(orders, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding orders by status and customer email", e);
            throw new RuntimeException("Failed to find orders by status and customer email", e);
        }
    }

    /**
     * Find orders by customer email ordered by created date descending
     */
    @Transactional(readOnly = true)
    public Page<Order> findByCustomerEmailOrderByCreatedAtDesc(String customerEmail, Pageable pageable) {
        logger.debug("Finding orders by customer email ordered by created date: {}", customerEmail);
        
        try {
            Condition condition = OrderSchema.CUSTOMER_EMAIL.eq(customerEmail);
            
            Integer totalCount = dsl.selectCount()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .fetchOne(0, Integer.class);
            
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .orderBy(OrderSchema.CREATED_AT.desc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(orders, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding orders by customer email ordered by created date", e);
            throw new RuntimeException("Failed to find orders by customer email ordered by created date", e);
        }
    }

    /**
     * Find recent orders with limit
     */
    @Transactional(readOnly = true)
    public List<Order> findRecentOrders(int limit) {
        logger.debug("Finding {} recent orders", limit);
        
        try {
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .orderBy(OrderSchema.CREATED_AT.desc())
                .limit(limit)
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} recent orders", orders.size());
            return orders;
        } catch (Exception e) {
            logger.error("Error finding recent orders", e);
            throw new RuntimeException("Failed to find recent orders", e);
        }
    }

    /**
     * Check if product has pending orders
     */
    @Transactional(readOnly = true)
    public boolean hasProductInPendingOrders(Long productId) {
        logger.debug("Checking if product {} has pending orders", productId);
        
        try {
            Integer count = dsl.selectCount()
                .from(OrderSchema.ORDERS)
                .join(OrderItemSchema.ORDER_ITEMS).on(OrderSchema.ID.eq(OrderItemSchema.ORDER_ID))
                .where(OrderItemSchema.PRODUCT_ID.eq(productId)
                    .and(OrderSchema.STATUS.in("PENDING", "CONFIRMED", "PROCESSING")))
                .fetchOne(0, Integer.class);
            
            boolean hasPendingOrders = count != null && count > 0;
            logger.debug("Product {} has pending orders: {}", productId, hasPendingOrders);
            return hasPendingOrders;
        } catch (Exception e) {
            logger.error("Error checking if product has pending orders: {}", productId, e);
            throw new RuntimeException("Failed to check if product has pending orders", e);
        }
    }
    
    /**
     * Find active orders (non-final statuses)
     */
    @Transactional(readOnly = true)
    public List<Order> findActiveOrders() {
        logger.debug("Finding active orders");
        
        List<OrderStatus> activeStatuses = List.of(
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED
        );
        
        return findByStatusIn(activeStatuses);
    }
    
    /**
     * Find orders by customer email
     */
    @Transactional(readOnly = true)
    public List<Order> findByCustomerEmail(String customerEmail) {
        logger.debug("Finding orders by customer email: {}", customerEmail);
        
        try {
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.CUSTOMER_EMAIL.eq(customerEmail))
                .orderBy(OrderSchema.CREATED_AT.desc())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} orders for customer email: {}", orders.size(), customerEmail);
            return orders;
        } catch (Exception e) {
            logger.error("Error finding orders by customer email", e);
            throw new RuntimeException("Failed to find orders by customer email", e);
        }
    }
    
    /**
     * Find order by order number
     */
    @Transactional(readOnly = true)
    public Optional<Order> findByOrderNumber(String orderNumber) {
        logger.debug("Finding order by order number: {}", orderNumber);
        
        try {
            Record record = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.ORDER_NUMBER.eq(orderNumber))
                .fetchOne();
            
            if (record != null) {
                Order order = recordToEntity(record);
                logger.debug("Found order by order number: {}", orderNumber);
                return Optional.of(order);
            } else {
                logger.debug("Order not found by order number: {}", orderNumber);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding order by order number: {}", orderNumber, e);
            throw new RuntimeException("Failed to find order by order number", e);
        }
    }
    
    /**
     * Find orders by date range
     */
    @Transactional(readOnly = true)
    public List<Order> findByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Finding orders by date range: {} to {}", startDate, endDate);
        
        try {
            Condition condition = DSL.trueCondition();
            
            if (startDate != null) {
                condition = condition.and(OrderSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                condition = condition.and(OrderSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(condition)
                .orderBy(OrderSchema.CREATED_AT.desc())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} orders in date range", orders.size());
            return orders;
        } catch (Exception e) {
            logger.error("Error finding orders by date range", e);
            throw new RuntimeException("Failed to find orders by date range", e);
        }
    }
    
    // ========== ORDER ANALYTICS QUERIES ==========
    
    /**
     * Get order analytics for a date range
     */
    @Transactional(readOnly = true)
    public OrderAnalytics getOrderAnalytics(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting order analytics for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(OrderSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(OrderSchema.CREATED_AT.le(endDate));
            }
            
            Record analyticsRecord = dsl.select(
                    DSL.count().as("total_orders"),
                    DSL.sum(OrderSchema.TOTAL_AMOUNT).as("total_revenue"),
                    DSL.avg(OrderSchema.TOTAL_AMOUNT).as("average_order_value"),
                    DSL.sum(DSL.case_()
                        .when(OrderSchema.STATUS.eq(OrderStatus.DELIVERED.name()), OrderSchema.TOTAL_AMOUNT)
                        .else_(BigDecimal.ZERO)).as("delivered_revenue"),
                    DSL.countDistinct(OrderSchema.CUSTOMER_EMAIL).as("unique_customers")
                )
                .from(OrderSchema.ORDERS)
                .where(dateCondition)
                .fetchOne();
            
            // Get status breakdown
            Result<Record> statusBreakdown = dsl.select(
                    OrderSchema.STATUS,
                    DSL.count().as("count"),
                    DSL.sum(OrderSchema.TOTAL_AMOUNT).as("revenue")
                )
                .from(OrderSchema.ORDERS)
                .where(dateCondition)
                .groupBy(OrderSchema.STATUS)
                .fetch();
            
            OrderAnalytics analytics = new OrderAnalytics();
            if (analyticsRecord != null) {
                analytics.setTotalOrders(analyticsRecord.get("total_orders", Integer.class));
                analytics.setTotalRevenue(analyticsRecord.get("total_revenue", BigDecimal.class));
                analytics.setAverageOrderValue(analyticsRecord.get("average_order_value", BigDecimal.class));
                analytics.setDeliveredRevenue(analyticsRecord.get("delivered_revenue", BigDecimal.class));
                analytics.setUniqueCustomers(analyticsRecord.get("unique_customers", Integer.class));
            }
            
            // Set status breakdown
            for (Record statusRecord : statusBreakdown) {
                String status = statusRecord.get(OrderSchema.STATUS);
                Integer count = statusRecord.get("count", Integer.class);
                BigDecimal revenue = statusRecord.get("revenue", BigDecimal.class);
                analytics.addStatusBreakdown(status, count, revenue);
            }
            
            logger.debug("Generated order analytics: {}", analytics);
            return analytics;
        } catch (Exception e) {
            logger.error("Error getting order analytics", e);
            throw new RuntimeException("Failed to get order analytics", e);
        }
    }
    
    /**
     * Get daily order summary for a date range
     */
    @Transactional(readOnly = true)
    public List<DailyOrderSummary> getDailyOrderSummary(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting daily order summary for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(OrderSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(OrderSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    DSL.date(OrderSchema.CREATED_AT).as("order_date"),
                    DSL.count().as("order_count"),
                    DSL.sum(OrderSchema.TOTAL_AMOUNT).as("total_revenue"),
                    DSL.avg(OrderSchema.TOTAL_AMOUNT).as("average_order_value"),
                    DSL.countDistinct(OrderSchema.CUSTOMER_EMAIL).as("unique_customers")
                )
                .from(OrderSchema.ORDERS)
                .where(dateCondition)
                .groupBy(DSL.date(OrderSchema.CREATED_AT))
                .orderBy(DSL.date(OrderSchema.CREATED_AT).desc())
                .fetch();
            
            List<DailyOrderSummary> summaries = records.stream()
                .map(record -> {
                    DailyOrderSummary summary = new DailyOrderSummary();
                    summary.setDate(record.get("order_date", java.sql.Date.class).toLocalDate());
                    summary.setOrderCount(record.get("order_count", Integer.class));
                    summary.setTotalRevenue(record.get("total_revenue", BigDecimal.class));
                    summary.setAverageOrderValue(record.get("average_order_value", BigDecimal.class));
                    summary.setUniqueCustomers(record.get("unique_customers", Integer.class));
                    return summary;
                })
                .collect(Collectors.toList());
            
            logger.debug("Generated {} daily order summaries", summaries.size());
            return summaries;
        } catch (Exception e) {
            logger.error("Error getting daily order summary", e);
            throw new RuntimeException("Failed to get daily order summary", e);
        }
    }
    
    /**
     * Get top customers by order value
     */
    @Transactional(readOnly = true)
    public List<CustomerOrderSummary> getTopCustomers(int limit) {
        logger.debug("Getting top {} customers by order value", limit);
        
        try {
            Result<Record> records = dsl.select(
                    OrderSchema.CUSTOMER_EMAIL,
                    OrderSchema.CUSTOMER_NAME,
                    DSL.count().as("order_count"),
                    DSL.sum(OrderSchema.TOTAL_AMOUNT).as("total_spent"),
                    DSL.avg(OrderSchema.TOTAL_AMOUNT).as("average_order_value"),
                    DSL.max(OrderSchema.CREATED_AT).as("last_order_date")
                )
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.CUSTOMER_EMAIL.isNotNull())
                .groupBy(OrderSchema.CUSTOMER_EMAIL, OrderSchema.CUSTOMER_NAME)
                .orderBy(DSL.sum(OrderSchema.TOTAL_AMOUNT).desc())
                .limit(limit)
                .fetch();
            
            List<CustomerOrderSummary> customers = records.stream()
                .map(record -> {
                    CustomerOrderSummary customer = new CustomerOrderSummary();
                    customer.setCustomerEmail(record.get(OrderSchema.CUSTOMER_EMAIL));
                    customer.setCustomerName(record.get(OrderSchema.CUSTOMER_NAME));
                    customer.setOrderCount(record.get("order_count", Integer.class));
                    customer.setTotalSpent(record.get("total_spent", BigDecimal.class));
                    customer.setAverageOrderValue(record.get("average_order_value", BigDecimal.class));
                    customer.setLastOrderDate(record.get("last_order_date", LocalDateTime.class));
                    return customer;
                })
                .collect(Collectors.toList());
            
            logger.debug("Found {} top customers", customers.size());
            return customers;
        } catch (Exception e) {
            logger.error("Error getting top customers", e);
            throw new RuntimeException("Failed to get top customers", e);
        }
    }
    
    /**
     * Update order status
     */
    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus status) {
        logger.debug("Updating order status for ID {}: {}", orderId, status);
        
        try {
            int updatedRows = dsl.update(OrderSchema.ORDERS)
                .set(OrderSchema.STATUS, status.name())
                .set(OrderSchema.UPDATED_AT, LocalDateTime.now())
                .where(OrderSchema.ID.eq(orderId))
                .execute();
            
            if (updatedRows == 0) {
                throw new RuntimeException("Order not found for status update: " + orderId);
            }
            
            logger.debug("Successfully updated status for order ID: {}", orderId);
        } catch (Exception e) {
            logger.error("Error updating order status", e);
            throw new RuntimeException("Failed to update order status", e);
        }
    }
    
    /**
     * Check if order number exists
     */
    @Transactional(readOnly = true)
    public boolean existsByOrderNumber(String orderNumber) {
        logger.debug("Checking if order number exists: {}", orderNumber);
        
        try {
            Integer count = dsl.selectCount()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.ORDER_NUMBER.eq(orderNumber))
                .fetchOne(0, Integer.class);
            
            boolean exists = count != null && count > 0;
            logger.debug("Order number {} exists: {}", orderNumber, exists);
            return exists;
        } catch (Exception e) {
            logger.error("Error checking order number existence", e);
            throw new RuntimeException("Failed to check order number existence", e);
        }
    }
    
    // ========== COMPLEX JOINS FOR ORDER FULFILLMENT AND INVENTORY ANALYSIS ==========
    
    /**
     * Get order fulfillment status with inventory details
     */
    @Transactional(readOnly = true)
    public List<OrderFulfillmentStatus> getOrderFulfillmentStatus(List<OrderStatus> statuses) {
        logger.debug("Getting order fulfillment status for statuses: {}", statuses);
        
        try {
            List<String> statusNames = statuses != null ? 
                statuses.stream().map(OrderStatus::name).collect(java.util.stream.Collectors.toList()) :
                List.of();
            
            Condition statusCondition = statusNames.isEmpty() ? 
                DSL.trueCondition() : 
                OrderSchema.STATUS.in(statusNames);
            
            Result<Record> records = dsl.select(
                    OrderSchema.ID.as("order_id"),
                    OrderSchema.ORDER_NUMBER,
                    OrderSchema.STATUS,
                    OrderSchema.CUSTOMER_NAME,
                    OrderSchema.TOTAL_AMOUNT,
                    OrderSchema.CREATED_AT,
                    DSL.count(OrderItemSchema.ID).as("total_items"),
                    DSL.sum(OrderItemSchema.QUANTITY).as("total_quantity"),
                    DSL.sum(DSL.case_()
                        .when(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND
                            .minus(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED)
                            .ge(OrderItemSchema.QUANTITY), OrderItemSchema.QUANTITY)
                        .else_(0)).as("available_quantity"),
                    DSL.countDistinct(DSL.case_()
                        .when(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND
                            .minus(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED)
                            .lt(OrderItemSchema.QUANTITY), OrderItemSchema.PRODUCT_ID)
                        .else_(DSL.inline((Long) null))).as("out_of_stock_items")
                )
                .from(OrderSchema.ORDERS)
                .leftJoin(OrderItemSchema.ORDER_ITEMS).on(OrderSchema.ID.eq(OrderItemSchema.ORDER_ID))
                .leftJoin(ProductSchema.PRODUCTS).on(OrderItemSchema.PRODUCT_ID.eq(ProductSchema.ID))
                .leftJoin(com.ecommerce.inventory.schema.InventorySchema.INVENTORY)
                    .on(ProductSchema.ID.eq(com.ecommerce.inventory.schema.InventorySchema.PRODUCT_ID))
                .where(statusCondition)
                .groupBy(OrderSchema.ID, OrderSchema.ORDER_NUMBER, OrderSchema.STATUS, 
                        OrderSchema.CUSTOMER_NAME, OrderSchema.TOTAL_AMOUNT, OrderSchema.CREATED_AT)
                .orderBy(OrderSchema.CREATED_AT.desc())
                .fetch();
            
            List<OrderFulfillmentStatus> fulfillmentStatuses = records.stream()
                .map(record -> {
                    OrderFulfillmentStatus status = new OrderFulfillmentStatus();
                    status.setOrderId(record.get("order_id", Long.class));
                    status.setOrderNumber(record.get(OrderSchema.ORDER_NUMBER));
                    status.setStatus(OrderStatus.valueOf(record.get(OrderSchema.STATUS)));
                    status.setCustomerName(record.get(OrderSchema.CUSTOMER_NAME));
                    status.setTotalAmount(record.get(OrderSchema.TOTAL_AMOUNT));
                    status.setCreatedAt(record.get(OrderSchema.CREATED_AT));
                    status.setTotalItems(record.get("total_items", Integer.class));
                    status.setTotalQuantity(record.get("total_quantity", Integer.class));
                    status.setAvailableQuantity(record.get("available_quantity", Integer.class));
                    status.setOutOfStockItems(record.get("out_of_stock_items", Integer.class));
                    return status;
                })
                .collect(java.util.stream.Collectors.toList());
            
            logger.debug("Generated fulfillment status for {} orders", fulfillmentStatuses.size());
            return fulfillmentStatuses;
        } catch (Exception e) {
            logger.error("Error getting order fulfillment status", e);
            throw new RuntimeException("Failed to get order fulfillment status", e);
        }
    }
    
    /**
     * Get orders with inventory allocation details
     */
    @Transactional(readOnly = true)
    public List<OrderInventoryAllocation> getOrdersWithInventoryAllocation(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting orders with inventory allocation for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(OrderSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(OrderSchema.CREATED_AT.le(endDate));
            }
            
            Result<Record> records = dsl.select(
                    OrderSchema.ID.as("order_id"),
                    OrderSchema.ORDER_NUMBER,
                    OrderSchema.STATUS,
                    OrderItemSchema.PRODUCT_ID,
                    ProductSchema.NAME.as("product_name"),
                    ProductSchema.SKU.as("product_sku"),
                    OrderItemSchema.QUANTITY.as("ordered_quantity"),
                    com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND,
                    com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED,
                    com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND
                        .minus(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED).as("available_quantity"),
                    com.ecommerce.inventory.schema.InventorySchema.WAREHOUSE_LOCATION,
                    DSL.case_()
                        .when(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND
                            .minus(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED)
                            .ge(OrderItemSchema.QUANTITY), "AVAILABLE")
                        .when(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND
                            .minus(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED)
                            .gt(0), "PARTIAL")
                        .else_("OUT_OF_STOCK").as("allocation_status")
                )
                .from(OrderSchema.ORDERS)
                .join(OrderItemSchema.ORDER_ITEMS).on(OrderSchema.ID.eq(OrderItemSchema.ORDER_ID))
                .join(ProductSchema.PRODUCTS).on(OrderItemSchema.PRODUCT_ID.eq(ProductSchema.ID))
                .leftJoin(com.ecommerce.inventory.schema.InventorySchema.INVENTORY)
                    .on(ProductSchema.ID.eq(com.ecommerce.inventory.schema.InventorySchema.PRODUCT_ID))
                .where(dateCondition)
                .orderBy(OrderSchema.CREATED_AT.desc(), OrderSchema.ORDER_NUMBER.asc(), ProductSchema.NAME.asc())
                .fetch();
            
            List<OrderInventoryAllocation> allocations = records.stream()
                .map(record -> {
                    OrderInventoryAllocation allocation = new OrderInventoryAllocation();
                    allocation.setOrderId(record.get("order_id", Long.class));
                    allocation.setOrderNumber(record.get(OrderSchema.ORDER_NUMBER));
                    allocation.setStatus(OrderStatus.valueOf(record.get(OrderSchema.STATUS)));
                    allocation.setProductId(record.get(OrderItemSchema.PRODUCT_ID));
                    allocation.setProductName(record.get("product_name", String.class));
                    allocation.setProductSku(record.get("product_sku", String.class));
                    allocation.setOrderedQuantity(record.get("ordered_quantity", Integer.class));
                    allocation.setQuantityOnHand(record.get(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND));
                    allocation.setQuantityAllocated(record.get(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED));
                    allocation.setAvailableQuantity(record.get("available_quantity", Integer.class));
                    allocation.setWarehouseLocation(record.get(com.ecommerce.inventory.schema.InventorySchema.WAREHOUSE_LOCATION));
                    allocation.setAllocationStatus(record.get("allocation_status", String.class));
                    return allocation;
                })
                .collect(java.util.stream.Collectors.toList());
            
            logger.debug("Generated inventory allocation details for {} order items", allocations.size());
            return allocations;
        } catch (Exception e) {
            logger.error("Error getting orders with inventory allocation", e);
            throw new RuntimeException("Failed to get orders with inventory allocation", e);
        }
    }
    
    /**
     * Get order performance metrics with inventory impact
     */
    @Transactional(readOnly = true)
    public OrderPerformanceMetrics getOrderPerformanceMetrics(LocalDateTime startDate, LocalDateTime endDate) {
        logger.debug("Getting order performance metrics for date range: {} to {}", startDate, endDate);
        
        try {
            Condition dateCondition = DSL.trueCondition();
            if (startDate != null) {
                dateCondition = dateCondition.and(OrderSchema.CREATED_AT.ge(startDate));
            }
            if (endDate != null) {
                dateCondition = dateCondition.and(OrderSchema.CREATED_AT.le(endDate));
            }
            
            Record metricsRecord = dsl.select(
                    DSL.count().as("total_orders"),
                    DSL.sum(OrderSchema.TOTAL_AMOUNT).as("total_revenue"),
                    DSL.avg(OrderSchema.TOTAL_AMOUNT).as("average_order_value"),
                    DSL.sum(OrderItemSchema.QUANTITY).as("total_items_ordered"),
                    DSL.countDistinct(OrderItemSchema.PRODUCT_ID).as("unique_products_ordered"),
                    DSL.count(DSL.case_()
                        .when(OrderSchema.STATUS.eq(OrderStatus.DELIVERED.name()), 1)
                        .else_(DSL.inline((Integer) null))).as("delivered_orders"),
                    DSL.count(DSL.case_()
                        .when(OrderSchema.STATUS.eq(OrderStatus.CANCELLED.name()), 1)
                        .else_(DSL.inline((Integer) null))).as("cancelled_orders"),
                    DSL.countDistinct(DSL.case_()
                        .when(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND
                            .minus(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED)
                            .lt(OrderItemSchema.QUANTITY), OrderSchema.ID)
                        .else_(DSL.inline((Long) null))).as("orders_with_stock_issues"),
                    DSL.sum(DSL.case_()
                        .when(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ON_HAND
                            .minus(com.ecommerce.inventory.schema.InventorySchema.QUANTITY_ALLOCATED)
                            .lt(OrderItemSchema.QUANTITY), OrderItemSchema.QUANTITY)
                        .else_(0)).as("backordered_quantity")
                )
                .from(OrderSchema.ORDERS)
                .leftJoin(OrderItemSchema.ORDER_ITEMS).on(OrderSchema.ID.eq(OrderItemSchema.ORDER_ID))
                .leftJoin(ProductSchema.PRODUCTS).on(OrderItemSchema.PRODUCT_ID.eq(ProductSchema.ID))
                .leftJoin(com.ecommerce.inventory.schema.InventorySchema.INVENTORY)
                    .on(ProductSchema.ID.eq(com.ecommerce.inventory.schema.InventorySchema.PRODUCT_ID))
                .where(dateCondition)
                .fetchOne();
            
            OrderPerformanceMetrics metrics = new OrderPerformanceMetrics();
            if (metricsRecord != null) {
                metrics.setTotalOrders(metricsRecord.get("total_orders", Integer.class));
                metrics.setTotalRevenue(metricsRecord.get("total_revenue", BigDecimal.class));
                metrics.setAverageOrderValue(metricsRecord.get("average_order_value", BigDecimal.class));
                metrics.setTotalItemsOrdered(metricsRecord.get("total_items_ordered", Integer.class));
                metrics.setUniqueProductsOrdered(metricsRecord.get("unique_products_ordered", Integer.class));
                metrics.setDeliveredOrders(metricsRecord.get("delivered_orders", Integer.class));
                metrics.setCancelledOrders(metricsRecord.get("cancelled_orders", Integer.class));
                metrics.setOrdersWithStockIssues(metricsRecord.get("orders_with_stock_issues", Integer.class));
                metrics.setBackorderedQuantity(metricsRecord.get("backordered_quantity", Integer.class));
            }
            
            logger.debug("Generated order performance metrics: {}", metrics);
            return metrics;
        } catch (Exception e) {
            logger.error("Error getting order performance metrics", e);
            throw new RuntimeException("Failed to get order performance metrics", e);
        }
    }
    
    // ========== HELPER CLASSES ==========
    
    /**
     * Order analytics summary
     */
    public static class OrderAnalytics {
        private Integer totalOrders = 0;
        private BigDecimal totalRevenue = BigDecimal.ZERO;
        private BigDecimal averageOrderValue = BigDecimal.ZERO;
        private BigDecimal deliveredRevenue = BigDecimal.ZERO;
        private Integer uniqueCustomers = 0;
        private java.util.Map<String, StatusBreakdown> statusBreakdown = new java.util.HashMap<>();
        
        // Getters and setters
        public Integer getTotalOrders() { return totalOrders; }
        public void setTotalOrders(Integer totalOrders) { this.totalOrders = totalOrders; }
        
        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }
        
        public BigDecimal getAverageOrderValue() { return averageOrderValue; }
        public void setAverageOrderValue(BigDecimal averageOrderValue) { this.averageOrderValue = averageOrderValue; }
        
        public BigDecimal getDeliveredRevenue() { return deliveredRevenue; }
        public void setDeliveredRevenue(BigDecimal deliveredRevenue) { this.deliveredRevenue = deliveredRevenue; }
        
        public Integer getUniqueCustomers() { return uniqueCustomers; }
        public void setUniqueCustomers(Integer uniqueCustomers) { this.uniqueCustomers = uniqueCustomers; }
        
        public java.util.Map<String, StatusBreakdown> getStatusBreakdown() { return statusBreakdown; }
        
        public void addStatusBreakdown(String status, Integer count, BigDecimal revenue) {
            statusBreakdown.put(status, new StatusBreakdown(count, revenue));
        }
        
        public static class StatusBreakdown {
            private Integer count;
            private BigDecimal revenue;
            
            public StatusBreakdown(Integer count, BigDecimal revenue) {
                this.count = count;
                this.revenue = revenue;
            }
            
            public Integer getCount() { return count; }
            public BigDecimal getRevenue() { return revenue; }
        }
    }
    
    /**
     * Daily order summary
     */
    public static class DailyOrderSummary {
        private java.time.LocalDate date;
        private Integer orderCount;
        private BigDecimal totalRevenue;
        private BigDecimal averageOrderValue;
        private Integer uniqueCustomers;
        
        // Getters and setters
        public java.time.LocalDate getDate() { return date; }
        public void setDate(java.time.LocalDate date) { this.date = date; }
        
        public Integer getOrderCount() { return orderCount; }
        public void setOrderCount(Integer orderCount) { this.orderCount = orderCount; }
        
        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }
        
        public BigDecimal getAverageOrderValue() { return averageOrderValue; }
        public void setAverageOrderValue(BigDecimal averageOrderValue) { this.averageOrderValue = averageOrderValue; }
        
        public Integer getUniqueCustomers() { return uniqueCustomers; }
        public void setUniqueCustomers(Integer uniqueCustomers) { this.uniqueCustomers = uniqueCustomers; }
    }
    
    /**
     * Customer order summary
     */
    public static class CustomerOrderSummary {
        private String customerEmail;
        private String customerName;
        private Integer orderCount;
        private BigDecimal totalSpent;
        private BigDecimal averageOrderValue;
        private LocalDateTime lastOrderDate;
        
        // Getters and setters
        public String getCustomerEmail() { return customerEmail; }
        public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
        
        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        
        public Integer getOrderCount() { return orderCount; }
        public void setOrderCount(Integer orderCount) { this.orderCount = orderCount; }
        
        public BigDecimal getTotalSpent() { return totalSpent; }
        public void setTotalSpent(BigDecimal totalSpent) { this.totalSpent = totalSpent; }
        
        public BigDecimal getAverageOrderValue() { return averageOrderValue; }
        public void setAverageOrderValue(BigDecimal averageOrderValue) { this.averageOrderValue = averageOrderValue; }
        
        public LocalDateTime getLastOrderDate() { return lastOrderDate; }
        public void setLastOrderDate(LocalDateTime lastOrderDate) { this.lastOrderDate = lastOrderDate; }
    }
    
    /**
     * Order fulfillment status with inventory details
     */
    public static class OrderFulfillmentStatus {
        private Long orderId;
        private String orderNumber;
        private OrderStatus status;
        private String customerName;
        private BigDecimal totalAmount;
        private LocalDateTime createdAt;
        private Integer totalItems;
        private Integer totalQuantity;
        private Integer availableQuantity;
        private Integer outOfStockItems;
        
        // Getters and setters
        public Long getOrderId() { return orderId; }
        public void setOrderId(Long orderId) { this.orderId = orderId; }
        
        public String getOrderNumber() { return orderNumber; }
        public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
        
        public OrderStatus getStatus() { return status; }
        public void setStatus(OrderStatus status) { this.status = status; }
        
        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        
        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
        
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
        
        public Integer getTotalItems() { return totalItems; }
        public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }
        
        public Integer getTotalQuantity() { return totalQuantity; }
        public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }
        
        public Integer getAvailableQuantity() { return availableQuantity; }
        public void setAvailableQuantity(Integer availableQuantity) { this.availableQuantity = availableQuantity; }
        
        public Integer getOutOfStockItems() { return outOfStockItems; }
        public void setOutOfStockItems(Integer outOfStockItems) { this.outOfStockItems = outOfStockItems; }
        
        public boolean canBeFulfilled() {
            return outOfStockItems != null && outOfStockItems == 0;
        }
        
        public double getFulfillmentRate() {
            if (totalQuantity == null || totalQuantity == 0) return 0.0;
            return (double) (availableQuantity != null ? availableQuantity : 0) / totalQuantity * 100.0;
        }
    }
    
    /**
     * Order inventory allocation details
     */
    public static class OrderInventoryAllocation {
        private Long orderId;
        private String orderNumber;
        private OrderStatus status;
        private Long productId;
        private String productName;
        private String productSku;
        private Integer orderedQuantity;
        private Integer quantityOnHand;
        private Integer quantityAllocated;
        private Integer availableQuantity;
        private String warehouseLocation;
        private String allocationStatus;
        
        // Getters and setters
        public Long getOrderId() { return orderId; }
        public void setOrderId(Long orderId) { this.orderId = orderId; }
        
        public String getOrderNumber() { return orderNumber; }
        public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
        
        public OrderStatus getStatus() { return status; }
        public void setStatus(OrderStatus status) { this.status = status; }
        
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        
        public String getProductSku() { return productSku; }
        public void setProductSku(String productSku) { this.productSku = productSku; }
        
        public Integer getOrderedQuantity() { return orderedQuantity; }
        public void setOrderedQuantity(Integer orderedQuantity) { this.orderedQuantity = orderedQuantity; }
        
        public Integer getQuantityOnHand() { return quantityOnHand; }
        public void setQuantityOnHand(Integer quantityOnHand) { this.quantityOnHand = quantityOnHand; }
        
        public Integer getQuantityAllocated() { return quantityAllocated; }
        public void setQuantityAllocated(Integer quantityAllocated) { this.quantityAllocated = quantityAllocated; }
        
        public Integer getAvailableQuantity() { return availableQuantity; }
        public void setAvailableQuantity(Integer availableQuantity) { this.availableQuantity = availableQuantity; }
        
        public String getWarehouseLocation() { return warehouseLocation; }
        public void setWarehouseLocation(String warehouseLocation) { this.warehouseLocation = warehouseLocation; }
        
        public String getAllocationStatus() { return allocationStatus; }
        public void setAllocationStatus(String allocationStatus) { this.allocationStatus = allocationStatus; }
        
        public Integer getShortfallQuantity() {
            if (orderedQuantity == null || availableQuantity == null) return 0;
            return Math.max(0, orderedQuantity - availableQuantity);
        }
        
        public boolean isFullyAvailable() {
            return "AVAILABLE".equals(allocationStatus);
        }
        
        public boolean isPartiallyAvailable() {
            return "PARTIAL".equals(allocationStatus);
        }
        
        public boolean isOutOfStock() {
            return "OUT_OF_STOCK".equals(allocationStatus);
        }
    }
    
    /**
     * Order performance metrics with inventory impact
     */
    public static class OrderPerformanceMetrics {
        private Integer totalOrders;
        private BigDecimal totalRevenue;
        private BigDecimal averageOrderValue;
        private Integer totalItemsOrdered;
        private Integer uniqueProductsOrdered;
        private Integer deliveredOrders;
        private Integer cancelledOrders;
        private Integer ordersWithStockIssues;
        private Integer backorderedQuantity;
        
        // Getters and setters
        public Integer getTotalOrders() { return totalOrders; }
        public void setTotalOrders(Integer totalOrders) { this.totalOrders = totalOrders; }
        
        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }
        
        public BigDecimal getAverageOrderValue() { return averageOrderValue; }
        public void setAverageOrderValue(BigDecimal averageOrderValue) { this.averageOrderValue = averageOrderValue; }
        
        public Integer getTotalItemsOrdered() { return totalItemsOrdered; }
        public void setTotalItemsOrdered(Integer totalItemsOrdered) { this.totalItemsOrdered = totalItemsOrdered; }
        
        public Integer getUniqueProductsOrdered() { return uniqueProductsOrdered; }
        public void setUniqueProductsOrdered(Integer uniqueProductsOrdered) { this.uniqueProductsOrdered = uniqueProductsOrdered; }
        
        public Integer getDeliveredOrders() { return deliveredOrders; }
        public void setDeliveredOrders(Integer deliveredOrders) { this.deliveredOrders = deliveredOrders; }
        
        public Integer getCancelledOrders() { return cancelledOrders; }
        public void setCancelledOrders(Integer cancelledOrders) { this.cancelledOrders = cancelledOrders; }
        
        public Integer getOrdersWithStockIssues() { return ordersWithStockIssues; }
        public void setOrdersWithStockIssues(Integer ordersWithStockIssues) { this.ordersWithStockIssues = ordersWithStockIssues; }
        
        public Integer getBackorderedQuantity() { return backorderedQuantity; }
        public void setBackorderedQuantity(Integer backorderedQuantity) { this.backorderedQuantity = backorderedQuantity; }
        
        public double getDeliveryRate() {
            if (totalOrders == null || totalOrders == 0) return 0.0;
            return (double) (deliveredOrders != null ? deliveredOrders : 0) / totalOrders * 100.0;
        }
        
        public double getCancellationRate() {
            if (totalOrders == null || totalOrders == 0) return 0.0;
            return (double) (cancelledOrders != null ? cancelledOrders : 0) / totalOrders * 100.0;
        }
        
        public double getStockIssueRate() {
            if (totalOrders == null || totalOrders == 0) return 0.0;
            return (double) (ordersWithStockIssues != null ? ordersWithStockIssues : 0) / totalOrders * 100.0;
        }
        
        public double getAverageItemsPerOrder() {
            if (totalOrders == null || totalOrders == 0) return 0.0;
            return (double) (totalItemsOrdered != null ? totalItemsOrdered : 0) / totalOrders;
        }
    }

    // ========== METRICS SUPPORT METHODS ==========

    /**
     * Count pending orders for metrics
     */
    @Transactional(readOnly = true)
    public int countPendingOrders() {
        logger.debug("Counting pending orders");
        
        try {
            Integer count = dsl.selectCount()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.STATUS.eq(OrderStatus.PENDING.name()))
                .fetchOne(0, Integer.class);
            
            logger.debug("Found {} pending orders", count);
            return count != null ? count : 0;
        } catch (Exception e) {
            logger.error("Error counting pending orders", e);
            throw new RuntimeException("Failed to count pending orders", e);
        }
    }

    /**
     * Find pending orders for health checks
     */
    @Transactional(readOnly = true)
    public List<Order> findPendingOrders() {
        logger.debug("Finding pending orders");
        
        try {
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.STATUS.eq(OrderStatus.PENDING.name()))
                .orderBy(OrderSchema.CREATED_AT.asc())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} pending orders", orders.size());
            return orders;
        } catch (Exception e) {
            logger.error("Error finding pending orders", e);
            throw new RuntimeException("Failed to find pending orders", e);
        }
    }

    /**
     * Find old pending orders (older than specified hours)
     */
    @Transactional(readOnly = true)
    public List<Order> findOldPendingOrders(int hoursOld) {
        logger.debug("Finding pending orders older than {} hours", hoursOld);
        
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusHours(hoursOld);
            
            Result<Record> records = dsl.select()
                .from(OrderSchema.ORDERS)
                .where(OrderSchema.STATUS.eq(OrderStatus.PENDING.name())
                    .and(OrderSchema.CREATED_AT.lt(cutoffTime)))
                .orderBy(OrderSchema.CREATED_AT.asc())
                .fetch();
            
            List<Order> orders = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} old pending orders", orders.size());
            return orders;
        } catch (Exception e) {
            logger.error("Error finding old pending orders", e);
            throw new RuntimeException("Failed to find old pending orders", e);
        }
    }
}