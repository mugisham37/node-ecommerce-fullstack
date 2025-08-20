package com.ecommerce.inventory.dto.mapper;

import com.ecommerce.inventory.dto.request.SupplierCreateRequest;
import com.ecommerce.inventory.dto.request.SupplierUpdateRequest;
import com.ecommerce.inventory.dto.response.SupplierResponse;
import com.ecommerce.inventory.dto.response.SupplierSummaryResponse;
import com.ecommerce.inventory.entity.Supplier;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for Supplier entity and DTOs
 */
@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface SupplierMapper {

    @Mapping(target = "productCount", expression = "java(supplier.getProducts() != null ? supplier.getProducts().size() : 0)")
    SupplierResponse toResponse(Supplier supplier);

    List<SupplierResponse> toResponseList(List<Supplier> suppliers);

    SupplierSummaryResponse toSummaryResponse(Supplier supplier);

    List<SupplierSummaryResponse> toSummaryResponseList(List<Supplier> suppliers);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "products", ignore = true)
    @Mapping(target = "status", constant = "ACTIVE")
    Supplier toEntity(SupplierCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "products", ignore = true)
    void updateEntity(SupplierUpdateRequest request, @MappingTarget Supplier supplier);
}