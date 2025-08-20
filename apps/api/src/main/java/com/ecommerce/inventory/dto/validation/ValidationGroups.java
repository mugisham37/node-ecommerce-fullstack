package com.ecommerce.inventory.dto.validation;

/**
 * Validation groups for different scenarios
 */
public class ValidationGroups {

    /**
     * Validation group for create operations
     */
    public interface Create {}

    /**
     * Validation group for update operations
     */
    public interface Update {}

    /**
     * Validation group for admin operations
     */
    public interface Admin {}

    /**
     * Validation group for user operations
     */
    public interface User {}

    /**
     * Validation group for search operations
     */
    public interface Search {}

    /**
     * Validation group for bulk operations
     */
    public interface Bulk {}

    /**
     * Validation group for import operations
     */
    public interface Import {}

    /**
     * Validation group for export operations
     */
    public interface Export {}
}