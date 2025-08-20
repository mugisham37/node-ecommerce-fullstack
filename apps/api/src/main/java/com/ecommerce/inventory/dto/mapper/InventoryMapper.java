package com.ecommerce.inventory.dto.mapper;

import com.ecommerce.inventory.dto.request.InventoryAdjustmentRequest;
import com.ecommerce.inventory.dto.response.InventoryResponse;
import com.ecommerce.inventory.dto.response.StockMovementResponse;
import com.ecommerce.inventory.entity.Inventory;
import com.ecommerce.inventory.entity.StockMovement;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for Inventory entity and DTOs
 */
@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    uses = {ProductMapper.class}
)
public interface InventoryMapper {

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    @Mapping(target = "productSku", source = "product.sku")
    @Mapping(target = "quantityAvailable", expression = "java(inventory.getQuantityAvailable())")
    @Mapping(target = "isLowStock", expression = "java(inventory.getProduct() != null && inventory.getProduct().isLowStock())")
    InventoryResponse toResponse(Inventory inventory);

    List<InventoryResponse> toResponseList(List<Inventory> inventories);

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    @Mapping(target = "productSku", source = "product.sku")
    @Mapping(target = "createdByName", source = "createdBy.firstName")
    StockMovementResponse toStockMovementResponse(StockMovement stockMovement);

    List<StockMovementResponse> toStockMovementResponseList(List<StockMovement> stockMovements);
}