package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.CategoryCreateRequest;
import com.ecommerce.inventory.dto.request.CategoryUpdateRequest;
import com.ecommerce.inventory.dto.response.CategoryResponse;
import com.ecommerce.inventory.entity.Category;
import com.ecommerce.inventory.exception.ResourceNotFoundException;
import com.ecommerce.inventory.repository.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Category Service for managing category operations
 * Handles hierarchical category management and business logic
 */
@Service
@Transactional
public class CategoryService {

    private static final Logger logger = LoggerFactory.getLogger(CategoryService.class);

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CacheService cacheService;

    /**
     * Create a new category
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = "categories", allEntries = true)
    public CategoryResponse createCategory(CategoryCreateRequest request) {
        logger.info("Creating new category: {}", request.getName());

        Category category = new Category();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);

        // Set parent if provided
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found with ID: " + request.getParentId()));
            category.setParent(parent);
        }

        Category savedCategory = categoryRepository.save(category);
        logger.info("Successfully created category with ID: {}", savedCategory.getId());

        return convertToCategoryResponse(savedCategory);
    }

    /**
     * Update category information
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = "categories", allEntries = true)
    public CategoryResponse updateCategory(Long categoryId, CategoryUpdateRequest request) {
        logger.info("Updating category with ID: {}", categoryId);

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        // Update fields if provided
        if (request.getName() != null) {
            category.setName(request.getName());
        }
        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }
        if (request.getSortOrder() != null) {
            category.setSortOrder(request.getSortOrder());
        }

        // Update parent if provided
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found with ID: " + request.getParentId()));
            category.setParent(parent);
        }

        Category updatedCategory = categoryRepository.save(category);
        logger.info("Successfully updated category with ID: {}", updatedCategory.getId());

        return convertToCategoryResponse(updatedCategory);
    }

    /**
     * Get category by ID
     */
    @Cacheable(value = "categories", key = "'category:' + #categoryId")
    public CategoryResponse getCategoryById(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        return convertToCategoryResponse(category);
    }

    /**
     * Get all categories with pagination
     */
    @Cacheable(value = "categories", key = "'all-categories:' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<CategoryResponse> getAllCategories(Pageable pageable) {
        Page<Category> categories = categoryRepository.findAll(pageable);
        return categories.map(this::convertToCategoryResponse);
    }

    /**
     * Get root categories (categories without parent)
     */
    @Cacheable(value = "categories", key = "'root-categories'")
    public List<CategoryResponse> getRootCategories() {
        List<Category> rootCategories = categoryRepository.findByParentIsNullOrderBySortOrder();
        return rootCategories.stream()
                .map(this::convertToCategoryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get category hierarchy
     */
    @Cacheable(value = "categories", key = "'category-hierarchy'")
    public List<CategoryResponse> getCategoryHierarchy() {
        List<Category> rootCategories = categoryRepository.findByParentIsNullOrderBySortOrder();
        return rootCategories.stream()
                .map(this::convertToCategoryResponseWithChildren)
                .collect(Collectors.toList());
    }

    /**
     * Get child categories
     */
    @Cacheable(value = "categories", key = "'children:' + #categoryId")
    public List<CategoryResponse> getChildCategories(Long categoryId) {
        Category parent = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        List<Category> children = categoryRepository.findByParentOrderBySortOrder(parent);
        return children.stream()
                .map(this::convertToCategoryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get category ancestors (breadcrumb path)
     */
    public List<CategoryResponse> getCategoryAncestors(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        return category.getAncestors().stream()
                .map(this::convertToCategoryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all descendants of a category
     */
    public List<CategoryResponse> getCategoryDescendants(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        return category.getAllDescendants().stream()
                .map(this::convertToCategoryResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search categories by name
     */
    public Page<CategoryResponse> searchCategories(String searchTerm, Pageable pageable) {
        Page<Category> categories = categoryRepository.searchByName(searchTerm, pageable);
        return categories.map(this::convertToCategoryResponse);
    }

    /**
     * Move category to new parent
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = "categories", allEntries = true)
    public void moveCategory(Long categoryId, Long newParentId) {
        logger.info("Moving category {} to parent {}", categoryId, newParentId);

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        if (newParentId != null) {
            Category newParent = categoryRepository.findById(newParentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found with ID: " + newParentId));
            
            // Prevent circular references
            if (isDescendant(newParent, category)) {
                throw new IllegalArgumentException("Cannot move category to its own descendant");
            }
            
            category.setParent(newParent);
        } else {
            category.setParent(null);
        }

        categoryRepository.save(category);
        logger.info("Successfully moved category {}", categoryId);
    }

    /**
     * Update category sort order
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = "categories", allEntries = true)
    public void updateCategorySortOrder(Long categoryId, Integer sortOrder) {
        logger.info("Updating sort order for category {} to {}", categoryId, sortOrder);

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        category.setSortOrder(sortOrder);
        categoryRepository.save(category);

        logger.info("Successfully updated sort order for category {}", categoryId);
    }

    /**
     * Delete category
     */
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "categories", allEntries = true)
    public void deleteCategory(Long categoryId) {
        logger.info("Deleting category with ID: {}", categoryId);

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + categoryId));

        // Check if category has products
        if (category.getProducts() != null && !category.getProducts().isEmpty()) {
            throw new IllegalStateException("Cannot delete category with associated products");
        }

        // Check if category has children
        if (category.getChildren() != null && !category.getChildren().isEmpty()) {
            throw new IllegalStateException("Cannot delete category with child categories");
        }

        categoryRepository.delete(category);
        logger.info("Successfully deleted category with ID: {}", categoryId);
    }

    /**
     * Bulk create categories
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = "categories", allEntries = true)
    public List<CategoryResponse> bulkCreateCategories(List<CategoryCreateRequest> requests) {
        logger.info("Bulk creating {} categories", requests.size());

        List<CategoryResponse> responses = requests.stream()
                .map(this::createCategory)
                .collect(Collectors.toList());

        logger.info("Successfully bulk created {} categories", responses.size());
        return responses;
    }

    /**
     * Bulk update categories
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @CacheEvict(value = "categories", allEntries = true)
    public List<CategoryResponse> bulkUpdateCategories(List<CategoryUpdateRequest> requests) {
        logger.info("Bulk updating {} categories", requests.size());

        List<CategoryResponse> responses = requests.stream()
                .map(request -> updateCategory(request.getId(), request))
                .collect(Collectors.toList());

        logger.info("Successfully bulk updated {} categories", responses.size());
        return responses;
    }

    /**
     * Bulk delete categories
     */
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "categories", allEntries = true)
    public int bulkDeleteCategories(List<Long> categoryIds) {
        logger.info("Bulk deleting {} categories", categoryIds.size());

        int deletedCount = 0;
        for (Long categoryId : categoryIds) {
            try {
                deleteCategory(categoryId);
                deletedCount++;
            } catch (Exception e) {
                logger.warn("Failed to delete category {}: {}", categoryId, e.getMessage());
            }
        }

        logger.info("Successfully bulk deleted {} out of {} categories", deletedCount, categoryIds.size());
        return deletedCount;
    }

    /**
     * Get category statistics
     */
    public Map<String, Object> getCategoryStatistics() {
        Map<String, Object> statistics = new HashMap<>();
        
        long totalCategories = categoryRepository.count();
        long rootCategories = categoryRepository.countByParentIsNull();
        
        statistics.put("totalCategories", totalCategories);
        statistics.put("rootCategories", rootCategories);
        statistics.put("childCategories", totalCategories - rootCategories);
        
        return statistics;
    }

    /**
     * Check if a category is a descendant of another category
     */
    private boolean isDescendant(Category potentialDescendant, Category ancestor) {
        Category current = potentialDescendant.getParent();
        while (current != null) {
            if (current.getId().equals(ancestor.getId())) {
                return true;
            }
            current = current.getParent();
        }
        return false;
    }

    /**
     * Convert Category entity to CategoryResponse DTO
     */
    private CategoryResponse convertToCategoryResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .sortOrder(category.getSortOrder())
                .productCount(category.getProducts() != null ? category.getProducts().size() : 0)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    /**
     * Convert Category entity to CategoryResponse DTO with children
     */
    private CategoryResponse convertToCategoryResponseWithChildren(Category category) {
        CategoryResponse response = convertToCategoryResponse(category);
        
        if (category.getChildren() != null && !category.getChildren().isEmpty()) {
            List<CategoryResponse> children = category.getChildren().stream()
                    .map(this::convertToCategoryResponseWithChildren)
                    .collect(Collectors.toList());
            response.setChildren(children);
        }
        
        return response;
    }
}