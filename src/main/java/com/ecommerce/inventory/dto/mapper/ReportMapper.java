package com.ecommerce.inventory.dto.mapper;

import com.ecommerce.inventory.dto.response.InventoryMovementReport;
import com.ecommerce.inventory.dto.response.OrderAnalyticsReport;
import com.ecommerce.inventory.entity.StockMovement;
import org.mapstruct.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * MapStruct mapper for report DTOs
 */
@Mapper(config = MapperConfig.class)
public interface ReportMapper {

    @Mapping(target = "reportGeneratedAt", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "totalMovements", expression = "java(movements.size())")
    @Mapping(target = "totalProductsAffected", expression = "java(countUniqueProducts(movements))")
    InventoryMovementReport toInventoryMovementReport(
        LocalDateTime fromDate,
        LocalDateTime toDate,
        List<StockMovement> movements,
        @Context StockMovementMapper stockMovementMapper
    );

    @Mapping(target = "reportGeneratedAt", expression = "java(java.time.LocalDateTime.now())")
    OrderAnalyticsReport toOrderAnalyticsReport(
        LocalDateTime fromDate,
        LocalDateTime toDate,
        Integer totalOrders,
        java.math.BigDecimal totalRevenue,
        java.math.BigDecimal averageOrderValue
    );

    default Integer countUniqueProducts(List<StockMovement> movements) {
        if (movements == null) return 0;
        return (int) movements.stream()
            .map(movement -> movement.getProduct().getId())
            .distinct()
            .count();
    }
}