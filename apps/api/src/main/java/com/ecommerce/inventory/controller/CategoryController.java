package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.CategoryCreateRequest;
import com.ecommerce.inventory.dto.request.CategoryUpdateRequest;
import com.ecommerce.inventory.dto.response.CategoryResponse;
import com.ecommerce.inventory.service.CategoryService;
import com.ecommerce.inventory.service.UserActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Category Management Controller
 * Handles hierarchical category management operations
 */
@RestController
@RequestMapping("/api/v1/categories")
@Tag(name = "Category Management", description = "Category management APIs")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private UserActivityService userActivityService;

    /**
     * Create a new category
     */
    @PostMapping
    @Operation(summary = "Create category", description = "Create a new category (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryCreateRequest request) {
        CategoryResponse category = categoryService.createCategory(request);
        
        // Log category creation activity
        userActivityService.logActivity("CATEGORY_CREATED", "CATEGORY", 
            category.getId().toString(), "Created new category: " + category.getName());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(category);
    }

    /**
     * Get category by ID
     */
    @GetMapping("/{categoryId}")
    @Operation(summary = "Get category by ID", description = "Get category information by ID")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable Long categoryId) {
        CategoryResponse category = categoryService.getCategoryById(categoryId);
        return ResponseEntity.ok(category);
    }

    /**
     * Update category information
     */
    @PutMapping("/{categoryId}")
    @Operation(summary = "Update category", description = "Update category information (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CategoryResponse> updateCategory(@PathVariable Long categoryId, 
                                                          @Valid @RequestBody CategoryUpdateRequest request) {
        CategoryResponse category = categoryService.updateCategory(categoryId, request);
        
        // Log category update activity
        userActivityService.logActivity("CATEGORY_UPDATED", "CATEGORY", 
            categoryId.toString(), "Updated category: " + category.getName());
        
        return ResponseEntity.ok(category);
    }

    /**
     * Get all categories with pagination
     */
    @GetMapping
    @Operation(summary = "Get all categories", description = "Get all categories with pagination")
    public ResponseEntity<Page<CategoryResponse>> getAllCategories(@PageableDefault(size = 20) Pageable pageable) {
        Page<CategoryResponse> categories = categoryService.getAllCategories(pageable);
        return ResponseEntity.ok(categories);
    }

    /**
     * Get root categories (categories without parent)
     */
    @GetMapping("/root")
    @Operation(summary = "Get root categories", description = "Get categories without parent (top-level categories)")
    public ResponseEntity<List<CategoryResponse>> getRootCategories() {
        List<CategoryResponse> categories = categoryService.getRootCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * Get category hierarchy
     */
    @GetMapping("/hierarchy")
    @Operation(summary = "Get category hierarchy", description = "Get complete category hierarchy tree")
    public ResponseEntity<List<CategoryResponse>> getCategoryHierarchy() {
        List<CategoryResponse> hierarchy = categoryService.getCategoryHierarchy();
        return ResponseEntity.ok(hierarchy);
    }

    /**
     * Get child categories
     */
    @GetMapping("/{categoryId}/children")
    @Operation(summary = "Get child categories", description = "Get direct child categories of a parent category")
    public ResponseEntity<List<CategoryResponse>> getChildCategories(@PathVariable Long categoryId) {
        List<CategoryResponse> children = categoryService.getChildCategories(categoryId);
        return ResponseEntity.ok(children);
    }

    /**
     * Get category ancestors (breadcrumb path)
     */
    @GetMapping("/{categoryId}/ancestors")
    @Operation(summary = "Get category ancestors", description = "Get ancestor categories (breadcrumb path)")
    public ResponseEntity<List<CategoryResponse>> getCategoryAncestors(@PathVariable Long categoryId) {
        List<CategoryResponse> ancestors = categoryService.getCategoryAncestors(categoryId);
        return ResponseEntity.ok(ancestors);
    }

    /**
     * Get all descendants of a category
     */
    @GetMapping("/{categoryId}/descendants")
    @Operation(summary = "Get category descendants", description = "Get all descendant categories")
    public ResponseEntity<List<CategoryResponse>> getCategoryDescendants(@PathVariable Long categoryId) {
        List<CategoryResponse> descendants = categoryService.getCategoryDescendants(categoryId);
        return ResponseEntity.ok(descendants);
    }

    /**
     * Search categories
     */
    @GetMapping("/search")
    @Operation(summary = "Search categories", description = "Search categories by name")
    public ResponseEntity<Page<CategoryResponse>> searchCategories(
            @RequestParam String q,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<CategoryResponse> categories = categoryService.searchCategories(q, pageable);
        return ResponseEntity.ok(categories);
    }

    /**
     * Move category to new parent
     */
    @PutMapping("/{categoryId}/move")
    @Operation(summary = "Move category", description = "Move category to a new parent (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> moveCategory(
            @PathVariable Long categoryId,
            @RequestBody Map<String, Long> request) {
        
        Long newParentId = request.get("parentId");
        categoryService.moveCategory(categoryId, newParentId);
        
        // Log category move activity
        String details = newParentId != null ? 
            "Moved category to parent ID: " + newParentId : 
            "Moved category to root level";
        userActivityService.logActivity("CATEGORY_MOVED", "CATEGORY", 
            categoryId.toString(), details);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Category moved successfully");
        response.put("categoryId", categoryId.toString());
        response.put("newParentId", newParentId != null ? newParentId.toString() : "null");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Update category sort order
     */
    @PutMapping("/{categoryId}/sort-order")
    @Operation(summary = "Update category sort order", description = "Update category sort order (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, String>> updateCategorySortOrder(
            @PathVariable Long categoryId,
            @RequestBody Map<String, Integer> request) {
        
        Integer sortOrder = request.get("sortOrder");
        if (sortOrder == null) {
            throw new IllegalArgumentException("Sort order is required");
        }
        
        categoryService.updateCategorySortOrder(categoryId, sortOrder);
        
        // Log sort order update activity
        userActivityService.logActivity("CATEGORY_SORT_ORDER_UPDATED", "CATEGORY", 
            categoryId.toString(), "Updated sort order to: " + sortOrder);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Category sort order updated successfully");
        response.put("categoryId", categoryId.toString());
        response.put("sortOrder", sortOrder.toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Delete category
     */
    @DeleteMapping("/{categoryId}")
    @Operation(summary = "Delete category", description = "Delete category (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable Long categoryId) {
        categoryService.deleteCategory(categoryId);
        
        // Log category deletion activity
        userActivityService.logActivity("CATEGORY_DELETED", "CATEGORY", 
            categoryId.toString(), "Category deleted");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Category deleted successfully");
        response.put("categoryId", categoryId.toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk create categories
     */
    @PostMapping("/bulk")
    @Operation(summary = "Bulk create categories", description = "Create multiple categories (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkCreateCategories(
            @Valid @RequestBody List<CategoryCreateRequest> requests) {
        
        List<CategoryResponse> categories = categoryService.bulkCreateCategories(requests);
        
        // Log bulk creation activity
        userActivityService.logActivity("CATEGORIES_BULK_CREATED", "CATEGORY", 
            "bulk", "Bulk created " + categories.size() + " categories");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Categories created successfully");
        response.put("createdCount", categories.size());
        response.put("categories", categories);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk update categories
     */
    @PutMapping("/bulk")
    @Operation(summary = "Bulk update categories", description = "Update multiple categories (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkUpdateCategories(
            @Valid @RequestBody List<CategoryUpdateRequest> requests) {
        
        List<CategoryResponse> categories = categoryService.bulkUpdateCategories(requests);
        
        // Log bulk update activity
        userActivityService.logActivity("CATEGORIES_BULK_UPDATED", "CATEGORY", 
            "bulk", "Bulk updated " + categories.size() + " categories");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Categories updated successfully");
        response.put("updatedCount", categories.size());
        response.put("categories", categories);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk delete categories
     */
    @DeleteMapping("/bulk")
    @Operation(summary = "Bulk delete categories", description = "Delete multiple categories (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> bulkDeleteCategories(@RequestBody List<Long> categoryIds) {
        int deletedCount = categoryService.bulkDeleteCategories(categoryIds);
        
        // Log bulk deletion activity
        userActivityService.logActivity("CATEGORIES_BULK_DELETED", "CATEGORY", 
            "bulk", "Bulk deleted " + deletedCount + " categories");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Categories deleted successfully");
        response.put("deletedCount", deletedCount);
        response.put("categoryIds", categoryIds);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get category statistics
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get category statistics", description = "Get category statistics (Manager/Admin only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getCategoryStatistics() {
        Map<String, Object> statistics = categoryService.getCategoryStatistics();
        return ResponseEntity.ok(statistics);
    }
}