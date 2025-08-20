package com.ecommerce.inventory.entity;

/**
 * User roles enumeration for role-based access control
 */
public enum Role {
    ADMIN("Administrator - Full system access"),
    MANAGER("Manager - Inventory and order management access"),
    EMPLOYEE("Employee - Basic inventory viewing and order creation");

    private final String description;

    Role(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Check if this role has admin privileges
     */
    public boolean isAdmin() {
        return this == ADMIN;
    }

    /**
     * Check if this role has manager privileges
     */
    public boolean isManager() {
        return this == ADMIN || this == MANAGER;
    }

    /**
     * Check if this role has employee privileges
     */
    public boolean isEmployee() {
        return this == ADMIN || this == MANAGER || this == EMPLOYEE;
    }
}