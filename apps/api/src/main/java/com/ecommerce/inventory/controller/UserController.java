package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.UserCreateRequest;
import com.ecommerce.inventory.dto.request.UserUpdateRequest;
import com.ecommerce.inventory.dto.response.UserActivityResponse;
import com.ecommerce.inventory.dto.response.UserResponse;
import com.ecommerce.inventory.entity.Role;
import com.ecommerce.inventory.entity.UserActivity;
import com.ecommerce.inventory.service.UserActivityService;
import com.ecommerce.inventory.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * User Management Controller
 * Handles user CRUD operations and user management functionality
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management", description = "User management APIs")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserActivityService userActivityService;

    /**
     * Create a new user
     */
    @PostMapping
    @Operation(summary = "Create user", description = "Create a new user (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        UserResponse user = userService.createUser(request);
        
        // Log user creation activity
        userActivityService.logActivity(UserActivityService.ActivityActions.USER_CREATED, "USER", 
            user.getId().toString(), "Created new user: " + user.getEmail() + " with role: " + user.getRole());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    /**
     * Get user by ID
     */
    @GetMapping("/{userId}")
    @Operation(summary = "Get user by ID", description = "Get user information by ID")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long userId) {
        UserResponse user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }

    /**
     * Update user information
     */
    @PutMapping("/{userId}")
    @Operation(summary = "Update user", description = "Update user information")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long userId, 
                                                  @Valid @RequestBody UserUpdateRequest request) {
        UserResponse user = userService.updateUser(userId, request);
        
        // Log user update activity
        userActivityService.logActivity(UserActivityService.ActivityActions.USER_UPDATED, "USER", 
            userId.toString(), "Updated user information for: " + user.getEmail());
        
        return ResponseEntity.ok(user);
    }

    /**
     * Get all users with pagination
     */
    @GetMapping
    @Operation(summary = "Get all users", description = "Get all users with pagination")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Page<UserResponse>> getAllUsers(@PageableDefault(size = 20) Pageable pageable) {
        Page<UserResponse> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(users);
    }

    /**
     * Search users
     */
    @GetMapping("/search")
    @Operation(summary = "Search users", description = "Search users by name or email")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Page<UserResponse>> searchUsers(@RequestParam String q,
                                                         @PageableDefault(size = 20) Pageable pageable) {
        Page<UserResponse> users = userService.searchUsers(q, pageable);
        return ResponseEntity.ok(users);
    }

    /**
     * Get users by role
     */
    @GetMapping("/by-role/{role}")
    @Operation(summary = "Get users by role", description = "Get users by specific role")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<UserResponse>> getUsersByRole(@PathVariable String role) {
        Role userRole = Role.valueOf(role.toUpperCase());
        List<UserResponse> users = userService.getUsersByRole(userRole);
        return ResponseEntity.ok(users);
    }

    /**
     * Deactivate user
     */
    @PutMapping("/{userId}/deactivate")
    @Operation(summary = "Deactivate user", description = "Deactivate user account (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deactivateUser(@PathVariable Long userId) {
        userService.deactivateUser(userId);
        
        // Log user deactivation activity
        userActivityService.logActivity(UserActivityService.ActivityActions.USER_DEACTIVATED, "USER", 
            userId.toString(), "User account deactivated");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "User deactivated successfully");
        response.put("userId", userId.toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Activate user
     */
    @PutMapping("/{userId}/activate")
    @Operation(summary = "Activate user", description = "Activate user account (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> activateUser(@PathVariable Long userId) {
        userService.activateUser(userId);
        
        // Log user activation activity
        userActivityService.logActivity(UserActivityService.ActivityActions.USER_ACTIVATED, "USER", 
            userId.toString(), "User account activated");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "User activated successfully");
        response.put("userId", userId.toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Change user password
     */
    @PutMapping("/{userId}/change-password")
    @Operation(summary = "Change password", description = "Change user password")
    public ResponseEntity<Map<String, String>> changePassword(@PathVariable Long userId,
                                                             @RequestBody Map<String, String> request) {
        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");
        
        if (currentPassword == null || newPassword == null) {
            throw new IllegalArgumentException("Current password and new password are required");
        }
        
        userService.changePassword(userId, currentPassword, newPassword);
        
        // Log password change activity
        userActivityService.logActivity(UserActivityService.ActivityActions.PASSWORD_CHANGED, "USER", 
            userId.toString(), "User password changed successfully");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Unlock user account
     */
    @PutMapping("/{userId}/unlock")
    @Operation(summary = "Unlock user account", description = "Unlock user account (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> unlockUserAccount(@PathVariable Long userId) {
        userService.unlockUserAccount(userId);
        
        // Log account unlock activity
        userActivityService.logActivity(UserActivityService.ActivityActions.ACCOUNT_UNLOCKED, "USER", 
            userId.toString(), "User account unlocked by administrator");
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "User account unlocked successfully");
        response.put("userId", userId.toString());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get user statistics
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get user statistics", description = "Get user statistics (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserService.UserStatistics> getUserStatistics() {
        UserService.UserStatistics statistics = userService.getUserStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Get user activities
     */
    @GetMapping("/{userId}/activities")
    @Operation(summary = "Get user activities", description = "Get user activity history with pagination")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or @securityExpressions.isOwner(#userId)")
    public ResponseEntity<Page<UserActivityResponse>> getUserActivities(@PathVariable Long userId,
                                                                       @PageableDefault(size = 20) Pageable pageable) {
        Page<UserActivity> activities = userActivityService.getUserActivities(userId, pageable);
        Page<UserActivityResponse> response = activities.map(UserActivityResponse::new);
        return ResponseEntity.ok(response);
    }

    /**
     * Get recent user activities
     */
    @GetMapping("/{userId}/activities/recent")
    @Operation(summary = "Get recent user activities", description = "Get recent user activities (last 10)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or @securityExpressions.isOwner(#userId)")
    public ResponseEntity<List<UserActivityResponse>> getRecentUserActivities(@PathVariable Long userId) {
        List<UserActivity> activities = userActivityService.getRecentUserActivities(userId);
        List<UserActivityResponse> response = activities.stream()
                .map(UserActivityResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }

    /**
     * Get activities by action
     */
    @GetMapping("/activities/by-action/{action}")
    @Operation(summary = "Get activities by action", description = "Get activities filtered by action type (Admin/Manager only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Page<UserActivityResponse>> getActivitiesByAction(@PathVariable String action,
                                                                           @PageableDefault(size = 20) Pageable pageable) {
        Page<UserActivity> activities = userActivityService.getActivitiesByAction(action, pageable);
        Page<UserActivityResponse> response = activities.map(UserActivityResponse::new);
        return ResponseEntity.ok(response);
    }

    /**
     * Get activities by date range
     */
    @GetMapping("/activities/by-date-range")
    @Operation(summary = "Get activities by date range", description = "Get activities within date range (Admin/Manager only)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Page<UserActivityResponse>> getActivitiesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<UserActivity> activities = userActivityService.getActivitiesByDateRange(startDate, endDate, pageable);
        Page<UserActivityResponse> response = activities.map(UserActivityResponse::new);
        return ResponseEntity.ok(response);
    }

    /**
     * Get activity statistics
     */
    @GetMapping("/activities/statistics")
    @Operation(summary = "Get activity statistics", description = "Get activity statistics for date range (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getActivityStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        Map<String, Object> statistics = userActivityService.getActivityStatistics(startDate, endDate);
        return ResponseEntity.ok(statistics);
    }

    /**
     * Get failed login attempts by IP
     */
    @GetMapping("/activities/failed-logins")
    @Operation(summary = "Get failed login attempts", description = "Get failed login attempts by IP address (Admin only)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserActivityResponse>> getFailedLoginAttempts(
            @RequestParam String ipAddress,
            @RequestParam(defaultValue = "24") int hoursBack) {
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        List<UserActivity> activities = userActivityService.getFailedLoginAttemptsByIp(ipAddress, since);
        List<UserActivityResponse> response = activities.stream()
                .map(UserActivityResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }
}