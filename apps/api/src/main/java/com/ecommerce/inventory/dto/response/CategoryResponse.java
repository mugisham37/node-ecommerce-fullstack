package com.ecommerce.inventory.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for category information
 */
@Data
@Builder
public class CategoryResponse {
    
    private Long id;
    private String name;
    private String description;
    private String slug;
    private Long parentId;
    private String parentName;
    private List<CategoryResponse> children;
    private Integer productCount;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}