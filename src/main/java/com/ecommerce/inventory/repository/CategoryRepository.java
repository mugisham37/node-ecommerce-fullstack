package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.Category;
import com.ecommerce.inventory.schema.CategorySchema;
import com.ecommerce.inventory.schema.ProductSchema;
import org.jooq.*;
import org.jooq.impl.DSL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Repository for Category entity with hierarchical navigation methods
 * Implements advanced category management operations using JOOQ
 */
@Repository
@Transactional
public class CategoryRepository extends AbstractBaseRepository<Category, Long> {
    
    private static final Logger logger = LoggerFactory.getLogger(CategoryRepository.class);
    
    @Override
    protected Category recordToEntity(Record record) {
        if (record == null) return null;
        
        Category category = new Category();
        category.setId(record.get(CategorySchema.ID));
        category.setName(record.get(CategorySchema.NAME));
        category.setSlug(record.get(CategorySchema.SLUG));
        category.setDescription(record.get(CategorySchema.DESCRIPTION));
        category.setSortOrder(record.get(CategorySchema.SORT_ORDER));
        category.setActive(record.get(CategorySchema.ACTIVE));
        
        // Set audit fields
        category.setCreatedAt(record.get(CategorySchema.CREATED_AT));
        category.setUpdatedAt(record.get(CategorySchema.UPDATED_AT));
        
        return category;
    }
    
    @Override
    protected Record entityToRecord(Category entity) {
        return dsl.newRecord(CategorySchema.CATEGORIES)
            .set(CategorySchema.ID, entity.getId())
            .set(CategorySchema.NAME, entity.getName())
            .set(CategorySchema.SLUG, entity.getSlug())
            .set(CategorySchema.DESCRIPTION, entity.getDescription())
            .set(CategorySchema.PARENT_ID, entity.getParent() != null ? entity.getParent().getId() : null)
            .set(CategorySchema.SORT_ORDER, entity.getSortOrder())
            .set(CategorySchema.ACTIVE, entity.getActive())
            .set(CategorySchema.UPDATED_AT, LocalDateTime.now());
    }
    
    @Override
    protected Class<Category> getEntityClass() {
        return Category.class;
    }
    
    @Override
    public Table<Record> getTable() {
        return CategorySchema.CATEGORIES;
    }
    
    @Override
    public TableField<Record, Long> getIdField() {
        return CategorySchema.ID;
    }
    
    @Override
    protected Long getEntityId(Category entity) {
        return entity.getId();
    }
    
    @Override
    protected Condition getActiveCondition() {
        return CategorySchema.ACTIVE.eq(true);
    }
    
    // ========== HIERARCHICAL CATEGORY NAVIGATION ==========
    
    /**
     * Find all root categories (categories with no parent)
     */
    @Transactional(readOnly = true)
    public List<Category> findRootCategories() {
        logger.debug("Finding root categories");
        
        try {
            Result<Record> records = dsl.select()
                .from(CategorySchema.CATEGORIES)
                .where(CategorySchema.PARENT_ID.isNull()
                    .and(CategorySchema.ACTIVE.eq(true)))
                .orderBy(CategorySchema.SORT_ORDER.asc(), CategorySchema.NAME.asc())
                .fetch();
            
            List<Category> categories = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} root categories", categories.size());
            return categories;
        } catch (Exception e) {
            logger.error("Error finding root categories", e);
            throw new RuntimeException("Failed to find root categories", e);
        }
    }
    
    /**
     * Find direct children of a category
     */
    @Transactional(readOnly = true)
    public List<Category> findDirectChildren(Long parentId) {
        logger.debug("Finding direct children of category: {}", parentId);
        
        try {
            Result<Record> records = dsl.select()
                .from(CategorySchema.CATEGORIES)
                .where(CategorySchema.PARENT_ID.eq(parentId)
                    .and(CategorySchema.ACTIVE.eq(true)))
                .orderBy(CategorySchema.SORT_ORDER.asc(), CategorySchema.NAME.asc())
                .fetch();
            
            List<Category> categories = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} direct children for category {}", categories.size(), parentId);
            return categories;
        } catch (Exception e) {
            logger.error("Error finding direct children for category: {}", parentId, e);
            throw new RuntimeException("Failed to find direct children", e);
        }
    }
    
    /**
     * Find all descendants of a category recursively
     */
    @Transactional(readOnly = true)
    public List<Category> findAllDescendants(Long parentId) {
        logger.debug("Finding all descendants of category: {}", parentId);
        
        try {
            List<Category> allDescendants = new ArrayList<>();
            List<Category> directChildren = findDirectChildren(parentId);
            
            for (Category child : directChildren) {
                allDescendants.add(child);
                allDescendants.addAll(findAllDescendants(child.getId()));
            }
            
            logger.debug("Found {} total descendants for category {}", allDescendants.size(), parentId);
            return allDescendants;
        } catch (Exception e) {
            logger.error("Error finding all descendants for category: {}", parentId, e);
            throw new RuntimeException("Failed to find all descendants", e);
        }
    }
    
    /**
     * Find ancestors of a category (path from root to parent)
     */
    @Transactional(readOnly = true)
    public List<Category> findAncestors(Long categoryId) {
        logger.debug("Finding ancestors of category: {}", categoryId);
        
        try {
            List<Category> ancestors = new ArrayList<>();
            Optional<Category> currentCategory = findById(categoryId);
            
            while (currentCategory.isPresent() && currentCategory.get().getParent() != null) {
                Long parentId = currentCategory.get().getParent().getId();
                Optional<Category> parent = findById(parentId);
                if (parent.isPresent()) {
                    ancestors.add(0, parent.get()); // Add at beginning to maintain order
                    currentCategory = parent;
                } else {
                    break;
                }
            }
            
            logger.debug("Found {} ancestors for category {}", ancestors.size(), categoryId);
            return ancestors;
        } catch (Exception e) {
            logger.error("Error finding ancestors for category: {}", categoryId, e);
            throw new RuntimeException("Failed to find ancestors", e);
        }
    }
    
    /**
     * Find category hierarchy tree starting from root
     */
    @Transactional(readOnly = true)
    public List<CategoryHierarchy> findCategoryHierarchy() {
        logger.debug("Building complete category hierarchy");
        
        try {
            List<Category> rootCategories = findRootCategories();
            List<CategoryHierarchy> hierarchy = new ArrayList<>();
            
            for (Category root : rootCategories) {
                CategoryHierarchy rootHierarchy = new CategoryHierarchy(root);
                buildHierarchyRecursive(rootHierarchy);
                hierarchy.add(rootHierarchy);
            }
            
            logger.debug("Built hierarchy with {} root categories", hierarchy.size());
            return hierarchy;
        } catch (Exception e) {
            logger.error("Error building category hierarchy", e);
            throw new RuntimeException("Failed to build category hierarchy", e);
        }
    }
    
    /**
     * Find categories by depth level
     */
    @Transactional(readOnly = true)
    public List<Category> findByDepthLevel(int level) {
        logger.debug("Finding categories at depth level: {}", level);
        
        try {
            if (level == 0) {
                return findRootCategories();
            }
            
            // Use recursive CTE to find categories at specific depth
            String sql = """
                WITH RECURSIVE category_depth AS (
                    SELECT id, name, slug, description, parent_id, sort_order, active, 
                           created_at, updated_at, 0 as depth
                    FROM categories 
                    WHERE parent_id IS NULL AND active = true
                    
                    UNION ALL
                    
                    SELECT c.id, c.name, c.slug, c.description, c.parent_id, c.sort_order, c.active,
                           c.created_at, c.updated_at, cd.depth + 1
                    FROM categories c
                    INNER JOIN category_depth cd ON c.parent_id = cd.id
                    WHERE c.active = true
                )
                SELECT * FROM category_depth WHERE depth = ?
                ORDER BY sort_order, name
                """;
            
            Result<Record> records = dsl.fetch(sql, level);
            
            List<Category> categories = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} categories at depth level {}", categories.size(), level);
            return categories;
        } catch (Exception e) {
            logger.error("Error finding categories by depth level: {}", level, e);
            throw new RuntimeException("Failed to find categories by depth level", e);
        }
    }
    
    /**
     * Find leaf categories (categories with no children)
     */
    @Transactional(readOnly = true)
    public List<Category> findLeafCategories() {
        logger.debug("Finding leaf categories");
        
        try {
            Result<Record> records = dsl.select()
                .from(CategorySchema.CATEGORIES)
                .where(CategorySchema.ACTIVE.eq(true)
                    .and(CategorySchema.ID.notIn(
                        dsl.selectDistinct(CategorySchema.PARENT_ID)
                            .from(CategorySchema.CATEGORIES)
                            .where(CategorySchema.PARENT_ID.isNotNull()
                                .and(CategorySchema.ACTIVE.eq(true)))
                    )))
                .orderBy(CategorySchema.NAME.asc())
                .fetch();
            
            List<Category> categories = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} leaf categories", categories.size());
            return categories;
        } catch (Exception e) {
            logger.error("Error finding leaf categories", e);
            throw new RuntimeException("Failed to find leaf categories", e);
        }
    }
    
    /**
     * Find categories with product counts
     */
    @Transactional(readOnly = true)
    public List<CategoryWithProductCount> findCategoriesWithProductCounts() {
        logger.debug("Finding categories with product counts");
        
        try {
            Result<Record> records = dsl.select(
                    CategorySchema.ID,
                    CategorySchema.NAME,
                    CategorySchema.SLUG,
                    CategorySchema.DESCRIPTION,
                    CategorySchema.PARENT_ID,
                    CategorySchema.SORT_ORDER,
                    CategorySchema.ACTIVE,
                    CategorySchema.CREATED_AT,
                    CategorySchema.UPDATED_AT,
                    DSL.count(ProductSchema.ID).as("product_count")
                )
                .from(CategorySchema.CATEGORIES)
                .leftJoin(ProductSchema.PRODUCTS).on(CategorySchema.ID.eq(ProductSchema.CATEGORY_ID)
                    .and(ProductSchema.ACTIVE.eq(true)))
                .where(CategorySchema.ACTIVE.eq(true))
                .groupBy(CategorySchema.ID, CategorySchema.NAME, CategorySchema.SLUG, 
                        CategorySchema.DESCRIPTION, CategorySchema.PARENT_ID, 
                        CategorySchema.SORT_ORDER, CategorySchema.ACTIVE,
                        CategorySchema.CREATED_AT, CategorySchema.UPDATED_AT)
                .orderBy(CategorySchema.SORT_ORDER.asc(), CategorySchema.NAME.asc())
                .fetch();
            
            List<CategoryWithProductCount> categories = records.stream()
                .map(record -> {
                    Category category = recordToEntity(record);
                    Integer productCount = record.get("product_count", Integer.class);
                    return new CategoryWithProductCount(category, productCount != null ? productCount : 0);
                })
                .collect(Collectors.toList());
            
            logger.debug("Found {} categories with product counts", categories.size());
            return categories;
        } catch (Exception e) {
            logger.error("Error finding categories with product counts", e);
            throw new RuntimeException("Failed to find categories with product counts", e);
        }
    }
    
    /**
     * Find category by slug
     */
    @Transactional(readOnly = true)
    public Optional<Category> findBySlug(String slug) {
        logger.debug("Finding category by slug: {}", slug);
        
        try {
            Record record = dsl.select()
                .from(CategorySchema.CATEGORIES)
                .where(CategorySchema.SLUG.eq(slug)
                    .and(CategorySchema.ACTIVE.eq(true)))
                .fetchOne();
            
            if (record != null) {
                Category category = recordToEntity(record);
                logger.debug("Found category by slug: {}", slug);
                return Optional.of(category);
            } else {
                logger.debug("Category not found by slug: {}", slug);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding category by slug: {}", slug, e);
            throw new RuntimeException("Failed to find category by slug", e);
        }
    }
    
    /**
     * Check if slug exists
     */
    @Transactional(readOnly = true)
    public boolean existsBySlug(String slug) {
        logger.debug("Checking if category slug exists: {}", slug);
        
        try {
            Integer count = dsl.selectCount()
                .from(CategorySchema.CATEGORIES)
                .where(CategorySchema.SLUG.eq(slug))
                .fetchOne(0, Integer.class);
            
            boolean exists = count != null && count > 0;
            logger.debug("Category slug {} exists: {}", slug, exists);
            return exists;
        } catch (Exception e) {
            logger.error("Error checking category slug existence", e);
            throw new RuntimeException("Failed to check category slug existence", e);
        }
    }
    
    /**
     * Update category sort order
     */
    @Transactional
    public void updateSortOrder(Long categoryId, Integer sortOrder) {
        logger.debug("Updating sort order for category {}: {}", categoryId, sortOrder);
        
        try {
            int updatedRows = dsl.update(CategorySchema.CATEGORIES)
                .set(CategorySchema.SORT_ORDER, sortOrder)
                .set(CategorySchema.UPDATED_AT, LocalDateTime.now())
                .where(CategorySchema.ID.eq(categoryId))
                .execute();
            
            if (updatedRows == 0) {
                throw new RuntimeException("Category not found for sort order update: " + categoryId);
            }
            
            logger.debug("Successfully updated sort order for category: {}", categoryId);
        } catch (Exception e) {
            logger.error("Error updating category sort order", e);
            throw new RuntimeException("Failed to update category sort order", e);
        }
    }
    
    /**
     * Move category to new parent
     */
    @Transactional
    public void moveCategory(Long categoryId, Long newParentId) {
        logger.debug("Moving category {} to new parent: {}", categoryId, newParentId);
        
        try {
            // Validate that this move doesn't create circular reference
            if (newParentId != null && wouldCreateCircularReference(categoryId, newParentId)) {
                throw new IllegalArgumentException("Moving category would create circular reference");
            }
            
            int updatedRows = dsl.update(CategorySchema.CATEGORIES)
                .set(CategorySchema.PARENT_ID, newParentId)
                .set(CategorySchema.UPDATED_AT, LocalDateTime.now())
                .where(CategorySchema.ID.eq(categoryId))
                .execute();
            
            if (updatedRows == 0) {
                throw new RuntimeException("Category not found for move operation: " + categoryId);
            }
            
            logger.debug("Successfully moved category {} to parent: {}", categoryId, newParentId);
        } catch (Exception e) {
            logger.error("Error moving category", e);
            throw new RuntimeException("Failed to move category", e);
        }
    }
    
    // ========== HELPER METHODS ==========
    
    private void buildHierarchyRecursive(CategoryHierarchy parent) {
        List<Category> children = findDirectChildren(parent.getCategory().getId());
        for (Category child : children) {
            CategoryHierarchy childHierarchy = new CategoryHierarchy(child);
            parent.addChild(childHierarchy);
            buildHierarchyRecursive(childHierarchy);
        }
    }
    
    private boolean wouldCreateCircularReference(Long categoryId, Long potentialParentId) {
        if (potentialParentId == null || categoryId.equals(potentialParentId)) {
            return categoryId.equals(potentialParentId);
        }
        
        List<Category> descendants = findAllDescendants(categoryId);
        return descendants.stream().anyMatch(desc -> desc.getId().equals(potentialParentId));
    }
    
    // ========== HELPER CLASSES ==========
    
    /**
     * Category hierarchy representation
     */
    public static class CategoryHierarchy {
        private Category category;
        private List<CategoryHierarchy> children = new ArrayList<>();
        
        public CategoryHierarchy(Category category) {
            this.category = category;
        }
        
        public Category getCategory() { return category; }
        public List<CategoryHierarchy> getChildren() { return children; }
        
        public void addChild(CategoryHierarchy child) {
            children.add(child);
        }
        
        public boolean hasChildren() {
            return !children.isEmpty();
        }
        
        public int getDepth() {
            return category.getDepthLevel();
        }
    }
    
    /**
     * Category with product count
     */
    public static class CategoryWithProductCount {
        private Category category;
        private Integer productCount;
        
        public CategoryWithProductCount(Category category, Integer productCount) {
            this.category = category;
            this.productCount = productCount;
        }
        
        public Category getCategory() { return category; }
        public Integer getProductCount() { return productCount; }
    }
}