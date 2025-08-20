package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Security Test Controller
 * Demonstrates method-level security with @PreAuthorize and @PostAuthorize
 */
@RestController
@RequestMapping("/api/v1/security-test")
public class SecurityTestController {

    /**
     * Public endpoint - no authentication required
     */
    @GetMapping("/public")
    public ResponseEntity<Map<String, Object>> publicEndpoint() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "This is a public endpoint");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Authenticated endpoint - requires any authenticated user
     */
    @GetMapping("/authenticated")
    public ResponseEntity<Map<String, Object>> authenticatedEndpoint() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal user = (UserPrincipal) auth.getPrincipal();
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Hello authenticated user!");
        response.put("user", user.getEmail());
        response.put("role", user.getRole());
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Admin only endpoint
     */
    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> adminOnlyEndpoint() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "This endpoint is for admins only");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Manager or Admin endpoint
     */
    @GetMapping("/manager-or-admin")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> managerOrAdminEndpoint() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "This endpoint is for managers and admins");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Custom security expression endpoint
     */
    @GetMapping("/custom-expression")
    @PreAuthorize("@securityExpressions.isManagerOrAdmin()")
    public ResponseEntity<Map<String, Object>> customExpressionEndpoint() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "This endpoint uses custom security expressions");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * User-specific endpoint - user can only access their own data
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("@securityExpressions.isOwnerOrAdmin(#userId)")
    public ResponseEntity<Map<String, Object>> userSpecificEndpoint(@PathVariable Long userId) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "User-specific data for user ID: " + userId);
        response.put("userId", userId);
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Role-based endpoint with multiple roles
     */
    @GetMapping("/multi-role")
    @PreAuthorize("@securityExpressions.hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<Map<String, Object>> multiRoleEndpoint() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal user = (UserPrincipal) auth.getPrincipal();
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "This endpoint accepts multiple roles");
        response.put("userRole", user.getRole());
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Current user info endpoint
     */
    @GetMapping("/current-user")
    public ResponseEntity<Map<String, Object>> currentUserEndpoint() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal user = (UserPrincipal) auth.getPrincipal();
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("role", user.getRole());
        response.put("active", user.isEnabled());
        response.put("authorities", user.getAuthorities());
        return ResponseEntity.ok(response);
    }
}