package com.ecommerce.inventory.dto.mapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Centralized entity mapper service with comprehensive mapping support
 */
@Component
public class EntityMapper {

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private SupplierMapper supplierMapper;

    @Autowired
    private InventoryMapper inventoryMapper;

    @Autowired
    private OrderItemMapper orderItemMapper;

    @Autowired
    private StockMovementMapper stockMovementMapper;

    @Autowired
    private ReportMapper reportMapper;

    // Product mappings
    public ProductMapper product() {
        return productMapper;
    }

    // User mappings
    public UserMapper user() {
        return userMapper;
    }

    // Order mappings
    public OrderMapper order() {
        return orderMapper;
    }

    // Order item mappings
    public OrderItemMapper orderItem() {
        return orderItemMapper;
    }

    // Category mappings
    public CategoryMapper category() {
        return categoryMapper;
    }

    // Supplier mappings
    public SupplierMapper supplier() {
        return supplierMapper;
    }

    // Inventory mappings
    public InventoryMapper inventory() {
        return inventoryMapper;
    }

    // Stock movement mappings
    public StockMovementMapper stockMovement() {
        return stockMovementMapper;
    }

    // Report mappings
    public ReportMapper report() {
        return reportMapper;
    }

    // Utility method to convert Page<Entity> to Page<DTO>
    public <T, R> Page<R> mapPage(Page<T> page, List<R> mappedContent) {
        return new PageImpl<>(mappedContent, page.getPageable(), page.getTotalElements());
    }

    // Utility method for safe mapping with null checks
    public <T, R> R safeMap(T source, java.util.function.Function<T, R> mapper) {
        return source != null ? mapper.apply(source) : null;
    }

    // Utility method for safe list mapping with null checks
    public <T, R> List<R> safeMapList(List<T> sourceList, java.util.function.Function<List<T>, List<R>> mapper) {
        return sourceList != null && !sourceList.isEmpty() ? mapper.apply(sourceList) : List.of();
    }
}