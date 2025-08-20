package com.ecommerce.inventory.dto.mapper;

import com.ecommerce.inventory.dto.response.StockMovementResponse;
import com.ecommerce.inventory.entity.StockMovement;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for StockMovement entity and DTOs
 */
@Mapper(
    config = MapperConfig.class,
    uses = {ProductMapper.class, UserMapper.class}
)
public interface StockMovementMapper {

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    @Mapping(target = "productSku", source = "product.sku")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userName", source = "user.fullName")
    StockMovementResponse toResponse(StockMovement stockMovement);

    List<StockMovementResponse> toResponseList(List<StockMovement> stockMovements);

    @Named("toSummaryResponse")
    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    @Mapping(target = "productSku", source = "product.sku")
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "userName", ignore = true)
    StockMovementResponse toSummaryResponse(StockMovement stockMovement);
}