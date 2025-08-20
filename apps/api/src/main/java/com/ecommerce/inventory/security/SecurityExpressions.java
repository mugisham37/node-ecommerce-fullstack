package com.ecommerce.inventory.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Custom security expressions for method-level security
 * Provides reusable security expressions for @PreAuthorize and @PostAuthorize
 */
@Component("securityExpressions")
public class SecurityExpressions {

    /**
     * Check if current user is admin
     */
    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal user = (UserPrincipal) auth.getPrincipal();
            return "ADMIN".equals(user.getRole());
        }
        return false;
    }

    /**
     * Check if current user is manager or admin
     */
    public boolean isManagerOrAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal user = (UserPrincipal) auth.getPrincipal();
            return "ADMIN".equals(user.getRole()) || "MANAGER".equals(user.getRole());
        }
        return false;
    }

    /**
     * Check if current user owns the resource (by user ID)
     */
    public boolean isOwner(Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal user = (UserPrincipal) auth.getPrincipal();
            return user.getId().equals(userId);
        }
        return false;
    }

    /**
     * Check if current user is owner or admin
     */
    public boolean isOwnerOrAdmin(Long userId) {
        return isOwner(userId) || isAdmin();
    }

    /**
     * Check if current user is owner, manager, or admin
     */
    public boolean isOwnerOrManagerOrAdmin(Long userId) {
        return isOwner(userId) || isManagerOrAdmin();
    }

    /**
     * Check if current user has specific role
     */
    public boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal user = (UserPrincipal) auth.getPrincipal();
            return role.equals(user.getRole());
        }
        return false;
    }

    /**
     * Check if current user has any of the specified roles
     */
    public boolean hasAnyRole(String... roles) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal user = (UserPrincipal) auth.getPrincipal();
            for (String role : roles) {
                if (role.equals(user.getRole())) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get current user ID
     */
    public Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal user = (UserPrincipal) auth.getPrincipal();
            return user.getId();
        }
        return null;
    }

    /**
     * Get current user principal
     */
    public UserPrincipal getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) auth.getPrincipal();
        }
        return null;
    }
}