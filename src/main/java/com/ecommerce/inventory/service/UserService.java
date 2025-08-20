package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.UserCreateRequest;
import com.ecommerce.inventory.dto.request.UserUpdateRequest;
import com.ecommerce.inventory.dto.response.UserResponse;
import com.ecommerce.inventory.entity.Role;
import com.ecommerce.inventory.entity.User;
import com.ecommerce.inventory.exception.ResourceNotFoundException;
import com.ecommerce.inventory.exception.UserAlreadyExistsException;
import com.ecommerce.inventory.repository.UserRepository;
import com.ecommerce.inventory.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * User Service for managing user operations
 * Handles user creation, authentication, role management, and user lifecycle
 */
@Service
@Transactional
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CacheService cacheService;

    /**
     * Create a new user with cache warming
     */
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "users", allEntries = true)
    public UserResponse createUser(UserCreateRequest request) {
        logger.info("Creating new user with email: {}", request.getEmail());

        // Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("User with email " + request.getEmail() + " already exists");
        }

        // Create new user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(Role.valueOf(request.getRole().toUpperCase()));
        user.setActive(true);

        User savedUser = userRepository.save(user);
        logger.info("Successfully created user with ID: {}", savedUser.getId());

        return convertToUserResponse(savedUser);
    }

    /**
     * Update user information with cache invalidation
     */
    @PreAuthorize("hasRole('ADMIN') or @securityExpressions.isOwner(#userId)")
    @Caching(evict = {
        @CacheEvict(value = "users", key = "'user:' + #userId"),
        @CacheEvict(value = "users", key = "'email:' + @userRepository.findById(#userId).orElse(new com.ecommerce.inventory.entity.User()).getEmail()"),
        @CacheEvict(value = "users", allEntries = true)
    })
    public UserResponse updateUser(Long userId, UserUpdateRequest request) {
        logger.info("Updating user with ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        // Update user fields
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new UserAlreadyExistsException("User with email " + request.getEmail() + " already exists");
            }
            user.setEmail(request.getEmail());
        }

        // Only admins can change roles
        if (request.getRole() != null) {
            // This will be checked by @PreAuthorize, but adding explicit check for clarity
            user.setRole(Role.valueOf(request.getRole().toUpperCase()));
        }

        User updatedUser = userRepository.save(user);
        logger.info("Successfully updated user with ID: {}", updatedUser.getId());

        return convertToUserResponse(updatedUser);
    }

    /**
     * Change user password
     */
    @PreAuthorize("hasRole('ADMIN') or @securityExpressions.isOwner(#userId)")
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        logger.info("Changing password for user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        // Verify current password (skip for admin)
        UserPrincipal currentUser = getCurrentUser();
        if (!currentUser.getRole().equals("ADMIN")) {
            if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                throw new IllegalArgumentException("Current password is incorrect");
            }
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        logger.info("Successfully changed password for user ID: {}", userId);
    }

    /**
     * Get user by ID with caching
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or @securityExpressions.isOwner(#userId)")
    @Cacheable(value = "users", key = "'user:' + #userId")
    public UserResponse getUserById(Long userId) {
        User user = userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        return convertToUserResponse(user);
    }

    /**
     * Get all users with pagination and caching
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Cacheable(value = "users", key = "'all-users:' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        Page<User> users = userRepository.findByActiveTrue(pageable);
        return users.map(this::convertToUserResponse);
    }

    /**
     * Search users by name or email
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public Page<UserResponse> searchUsers(String searchTerm, Pageable pageable) {
        Page<User> users = userRepository.searchActiveUsers(searchTerm, pageable);
        return users.map(this::convertToUserResponse);
    }

    /**
     * Get users by role
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public List<UserResponse> getUsersByRole(Role role) {
        List<User> users = userRepository.findByRoleAndActiveTrue(role);
        return users.stream()
                .map(this::convertToUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Deactivate user (soft delete)
     */
    @PreAuthorize("hasRole('ADMIN')")
    public void deactivateUser(Long userId) {
        logger.info("Deactivating user with ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        user.setActive(false);
        userRepository.save(user);

        logger.info("Successfully deactivated user with ID: {}", userId);
    }

    /**
     * Activate user
     */
    @PreAuthorize("hasRole('ADMIN')")
    public void activateUser(Long userId) {
        logger.info("Activating user with ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        user.setActive(true);
        user.resetFailedLoginAttempts(); // Reset any login attempts when activating
        userRepository.save(user);

        logger.info("Successfully activated user with ID: {}", userId);
    }

    /**
     * Handle successful login
     */
    public void handleSuccessfulLogin(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        user.updateLastLogin();
        userRepository.save(user);

        logger.info("Updated last login for user: {}", email);
    }

    /**
     * Handle failed login attempt
     */
    public void handleFailedLogin(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.incrementFailedLoginAttempts();
            userRepository.save(user);
            
            if (user.isAccountLocked()) {
                logger.warn("Account locked for user: {} due to failed login attempts", email);
            }
        });
    }

    /**
     * Check if user account is locked
     */
    public boolean isAccountLocked(String email) {
        return userRepository.findByEmail(email)
                .map(User::isAccountLocked)
                .orElse(false);
    }

    /**
     * Unlock user account
     */
    @PreAuthorize("hasRole('ADMIN')")
    public void unlockUserAccount(Long userId) {
        logger.info("Unlocking account for user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        user.resetFailedLoginAttempts();
        userRepository.save(user);

        logger.info("Successfully unlocked account for user ID: {}", userId);
    }

    /**
     * Get user statistics
     */
    @PreAuthorize("hasRole('ADMIN')")
    public UserStatistics getUserStatistics() {
        long totalUsers = userRepository.countByActiveTrue();
        long adminCount = userRepository.countByRoleAndActiveTrue(Role.ADMIN);
        long managerCount = userRepository.countByRoleAndActiveTrue(Role.MANAGER);
        long employeeCount = userRepository.countByRoleAndActiveTrue(Role.EMPLOYEE);
        
        List<User> lockedUsers = userRepository.findLockedUsers(LocalDateTime.now());

        return new UserStatistics(totalUsers, adminCount, managerCount, employeeCount, lockedUsers.size());
    }

    /**
     * Convert User entity to UserResponse DTO
     */
    private UserResponse convertToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .active(user.getActive())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    /**
     * Get current authenticated user
     */
    private UserPrincipal getCurrentUser() {
        // This would typically get the current user from SecurityContext
        // For now, returning null - this will be implemented when SecurityContext is available
        return null;
    }

    /**
     * User statistics inner class
     */
    public static class UserStatistics {
        private final long totalUsers;
        private final long adminCount;
        private final long managerCount;
        private final long employeeCount;
        private final long lockedUsers;

        public UserStatistics(long totalUsers, long adminCount, long managerCount, long employeeCount, long lockedUsers) {
            this.totalUsers = totalUsers;
            this.adminCount = adminCount;
            this.managerCount = managerCount;
            this.employeeCount = employeeCount;
            this.lockedUsers = lockedUsers;
        }

        // Getters
        public long getTotalUsers() { return totalUsers; }
        public long getAdminCount() { return adminCount; }
        public long getManagerCount() { return managerCount; }
        public long getEmployeeCount() { return employeeCount; }
        public long getLockedUsers() { return lockedUsers; }
    }
}