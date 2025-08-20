package com.ecommerce.inventory.dto.mapper;

import com.ecommerce.inventory.dto.request.ProductCreateRequest;
import com.ecommerce.inventory.dto.request.ProductUpdateRequest;
import com.ecommerce.inventory.dto.response.ProductResponse;
import com.ecommerce.inventory.dto.response.ProductSummaryResponse;
import com.ecommerce.inventory.entity.Product;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for Product entity and DTOs
 */
@Mapper(
    config = MapperConfig.class,
    uses = {CategoryMapper.class, SupplierMapper.class, InventoryMapper.class}
)
public interface ProductMapper {

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "supplierId", source = "supplier.id")
    @Mapping(target = "supplierName", source = "supplier.name")
    @Mapping(target = "profitMargin", expression = "java(product.calculateProfitMargin())")
    ProductResponse toResponse(Product product);

    List<ProductResponse> toResponseList(List<Product> products);

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "supplierId", source = "supplier.id")
    @Mapping(target = "supplierName", source = "supplier.name")
    @Mapping(target = "currentStock", expression = "java(product.getCurrentStock())")
    @Mapping(target = "lowStock", expression = "java(product.isLowStock())")
    ProductSummaryResponse toSummaryResponse(Product product);

    List<ProductSummaryResponse> toSummaryResponseList(List<Product> products);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "slug", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "supplier", ignore = true)
    @Mapping(target = "inventory", ignore = true)
    @Mapping(target = "stockMovements", ignore = true)
    @Mapping(target = "orderItems", ignore = true)
    @Mapping(target = "active", constant = "true")
    Product toEntity(ProductCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "slug", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "supplier", ignore = true)
    @Mapping(target = "inventory", ignore = true)
    @Mapping(target = "stockMovements", ignore = true)
    @Mapping(target = "orderItems", ignore = true)
    void updateEntity(ProductUpdateRequest request, @MappingTarget Product product);

    @Named("toProductReference")
    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "supplierId", source = "supplier.id")
    @Mapping(target = "supplierName", source = "supplier.name")
    @Mapping(target = "profitMargin", ignore = true)
    ProductResponse toReferenceResponse(Product product);
}