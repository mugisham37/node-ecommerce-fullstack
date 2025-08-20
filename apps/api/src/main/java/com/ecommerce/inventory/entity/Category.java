package com.ecommerce.inventory.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Category entity representing hierarchical product categories
 */
@Entity
@Table(name = "categories", indexes = {
    @Index(name = "idx_categories_name", columnList = "name"),
    @Index(name = "idx_categories_slug", columnList = "slug"),
    @Index(name = "idx_categories_parent_id", columnList = "parent_id"),
    @Index(name = "idx_categories_sort_order", columnList = "sort_order"),
    @Index(name = "idx_categories_active", columnList = "active")
})
public class Category extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Category name is required")
    @Size(max = 100, message = "Category name must not exceed 100 characters")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Category slug is required")
    @Size(max = 100, message = "Category slug must not exceed 100 characters")
    @Column(unique = true, nullable = false)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Category> children = new ArrayList<>();

    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    private List<Product> products = new ArrayList<>();

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private Boolean active = true;

    // Constructors
    public Category() {}

    public Category(String name, String slug) {
        this.name = name;
        this.slug = slug;
        this.active = true;
        this.sortOrder = 0;
    }

    public Category(String name, String slug, Category parent) {
        this(name, slug);
        this.parent = parent;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Category getParent() {
        return parent;
    }

    public void setParent(Category parent) {
        this.parent = parent;
    }

    public List<Category> getChildren() {
        return children;
    }

    public void setChildren(List<Category> children) {
        this.children = children;
    }

    public List<Product> getProducts() {
        return products;
    }

    public void setProducts(List<Product> products) {
        this.products = products;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    // Business methods

    /**
     * Generate URL-friendly slug from category name
     */
    public static String generateSlugFromName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return null;
        }
        return name.toLowerCase()
                   .replaceAll("[^a-z0-9\\s-]", "")
                   .replaceAll("\\s+", "-")
                   .replaceAll("-+", "-")
                   .replaceAll("^-|-$", "");
    }

    /**
     * Check if this category is a root category (has no parent)
     */
    public boolean isRoot() {
        return parent == null;
    }

    /**
     * Check if this category is a leaf category (has no children)
     */
    public boolean isLeaf() {
        return children.isEmpty();
    }

    /**
     * Get the depth level of this category in the hierarchy
     */
    public int getDepthLevel() {
        int level = 0;
        Category current = this.parent;
        while (current != null) {
            level++;
            current = current.getParent();
        }
        return level;
    }

    /**
     * Get all ancestor categories from root to this category's parent
     */
    public List<Category> getAncestors() {
        List<Category> ancestors = new ArrayList<>();
        Category current = this.parent;
        while (current != null) {
            ancestors.add(0, current); // Add at beginning to maintain order from root
            current = current.getParent();
        }
        return ancestors;
    }

    /**
     * Get all descendant categories recursively
     */
    public List<Category> getAllDescendants() {
        List<Category> descendants = new ArrayList<>();
        for (Category child : children) {
            descendants.add(child);
            descendants.addAll(child.getAllDescendants());
        }
        return descendants;
    }

    /**
     * Get the full path from root to this category
     */
    public String getFullPath() {
        List<Category> ancestors = getAncestors();
        StringBuilder path = new StringBuilder();
        
        for (Category ancestor : ancestors) {
            path.append(ancestor.getName()).append(" > ");
        }
        path.append(this.name);
        
        return path.toString();
    }

    /**
     * Get the full slug path from root to this category
     */
    public String getFullSlugPath() {
        List<Category> ancestors = getAncestors();
        StringBuilder path = new StringBuilder();
        
        for (Category ancestor : ancestors) {
            path.append(ancestor.getSlug()).append("/");
        }
        path.append(this.slug);
        
        return path.toString();
    }

    /**
     * Add a child category
     */
    public void addChild(Category child) {
        if (child != null) {
            children.add(child);
            child.setParent(this);
        }
    }

    /**
     * Remove a child category
     */
    public void removeChild(Category child) {
        if (child != null) {
            children.remove(child);
            child.setParent(null);
        }
    }

    /**
     * Get count of active products in this category
     */
    public long getActiveProductCount() {
        return products.stream()
                      .filter(product -> product.getActive())
                      .count();
    }

    /**
     * Get count of active products in this category and all descendants
     */
    public long getTotalActiveProductCount() {
        long count = getActiveProductCount();
        for (Category child : children) {
            count += child.getTotalActiveProductCount();
        }
        return count;
    }

    /**
     * Check if this category can be deleted (no products and no children)
     */
    public boolean canBeDeleted() {
        return products.isEmpty() && children.isEmpty();
    }

    /**
     * Activate the category
     */
    public void activate() {
        this.active = true;
    }

    /**
     * Deactivate the category (soft delete)
     */
    public void deactivate() {
        this.active = false;
        // Optionally deactivate all children
        for (Category child : children) {
            child.deactivate();
        }
    }

    /**
     * Validate that setting this parent doesn't create a circular reference
     */
    public boolean wouldCreateCircularReference(Category potentialParent) {
        if (potentialParent == null) {
            return false;
        }
        
        // Check if potentialParent is this category itself
        if (potentialParent.equals(this)) {
            return true;
        }
        
        // Check if potentialParent is a descendant of this category
        return getAllDescendants().contains(potentialParent);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Category category = (Category) o;
        return Objects.equals(id, category.id) && Objects.equals(slug, category.slug);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, slug);
    }

    @Override
    public String toString() {
        return "Category{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", slug='" + slug + '\'' +
                ", parentId=" + (parent != null ? parent.getId() : null) +
                ", active=" + active +
                ", sortOrder=" + sortOrder +
                '}';
    }
}