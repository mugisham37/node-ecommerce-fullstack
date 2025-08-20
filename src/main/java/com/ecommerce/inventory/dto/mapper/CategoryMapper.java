package com.ecommerce.inventory.dto.mapper;

import com.ecommerce.inventory.dto.request.CategoryCreateRequest;
import com.ecommerce.inventory.dto.request.CategoryUpdateRequest;
import com.ecommerce.inventory.dto.response.CategoryResponse;
import com.ecommerce.inventory.entity.Category;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for Category entity and DTOs
 */
@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface CategoryMapper {

    @Mapping(target = "parentId", source = "parent.id")
    @Mapping(target = "parentName", source = "parent.name")
    @Mapping(target = "productCount", expression = "java(category.getProducts() != null ? category.getProducts().size() : 0)")
    CategoryResponse toResponse(Category category);

    List<CategoryResponse> toResponseList(List<Category> categories);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "slug", ignore = true)
    @Mapping(target = "parent", ignore = true)
    @Mapping(target = "children", ignore = true)
    @Mapping(target = "products", ignore = true)
    Category toEntity(CategoryCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "slug", ignore = true)
    @Mapping(target = "parent", ignore = true)
    @Mapping(target = "children", ignore = true)
    @Mapping(target = "products", ignore = true)
    void updateEntity(CategoryUpdateRequest request, @MappingTarget Category category);

    @Named("toCategorySummary")
    @Mapping(target = "parentId", source = "parent.id")
    @Mapping(target = "parentName", source = "parent.name")
    @Mapping(target = "productCount", ignore = true)
    CategoryResponse toSummaryResponse(Category category);
}