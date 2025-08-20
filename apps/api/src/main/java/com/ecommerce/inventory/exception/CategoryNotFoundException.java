package com.ecommerce.inventory.exception;

/**
 * Exception thrown when a requested category is not found in the system.
 */
public class CategoryNotFoundException extends BusinessException {
    
    private final Long categoryId;
    private final String categorySlug;

    public CategoryNotFoundException(Long categoryId) {
        super(String.format("Category with ID %d not found", categoryId), 
              "CATEGORY_NOT_FOUND", "CATEGORY_MANAGEMENT");
        this.categoryId = categoryId;
        this.categorySlug = null;
        addContext("categoryId", categoryId);
    }

    public CategoryNotFoundException(String categorySlug) {
        super(String.format("Category with slug '%s' not found", categorySlug), 
              "CATEGORY_NOT_FOUND", "CATEGORY_MANAGEMENT");
        this.categoryId = null;
        this.categorySlug = categorySlug;
        addContext("categorySlug", categorySlug);
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public String getCategorySlug() {
        return categorySlug;
    }
}