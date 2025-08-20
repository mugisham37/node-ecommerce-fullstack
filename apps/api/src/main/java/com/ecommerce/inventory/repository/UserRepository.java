package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.Role;
import com.ecommerce.inventory.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entity operations
 * Provides data access methods for user management
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find user by email and active status
     */
    Optional<User> findByEmailAndActiveTrue(String email);

    /**
     * Find user by ID and active status
     */
    Optional<User> findByIdAndActiveTrue(Long id);

    /**
     * Find user by email (including inactive users)
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if email exists
     */
    boolean existsByEmail(String email);

    /**
     * Find all active users
     */
    List<User> findByActiveTrue();

    /**
     * Find users by role
     */
    List<User> findByRoleAndActiveTrue(Role role);

    /**
     * Find users by role with pagination
     */
    Page<User> findByRoleAndActiveTrue(Role role, Pageable pageable);

    /**
     * Find active users with pagination
     */
    Page<User> findByActiveTrue(Pageable pageable);

    /**
     * Search users by name or email
     */
    @Query("SELECT u FROM User u WHERE u.active = true AND " +
           "(LOWER(u.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<User> searchActiveUsers(@Param("searchTerm") String searchTerm, Pageable pageable);

    /**
     * Find users with failed login attempts
     */
    @Query("SELECT u FROM User u WHERE u.failedLoginAttempts >= :attempts AND u.active = true")
    List<User> findUsersWithFailedLoginAttempts(@Param("attempts") Integer attempts);

    /**
     * Find locked users
     */
    @Query("SELECT u FROM User u WHERE u.accountLockedUntil IS NOT NULL AND u.accountLockedUntil > :now")
    List<User> findLockedUsers(@Param("now") LocalDateTime now);

    /**
     * Update user last login time
     */
    @Modifying
    @Query("UPDATE User u SET u.lastLogin = :loginTime WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") Long userId, @Param("loginTime") LocalDateTime loginTime);

    /**
     * Reset failed login attempts
     */
    @Modifying
    @Query("UPDATE User u SET u.failedLoginAttempts = 0, u.accountLockedUntil = null WHERE u.id = :userId")
    void resetFailedLoginAttempts(@Param("userId") Long userId);

    /**
     * Increment failed login attempts
     */
    @Modifying
    @Query("UPDATE User u SET u.failedLoginAttempts = u.failedLoginAttempts + 1 WHERE u.id = :userId")
    void incrementFailedLoginAttempts(@Param("userId") Long userId);

    /**
     * Lock user account
     */
    @Modifying
    @Query("UPDATE User u SET u.accountLockedUntil = :lockUntil WHERE u.id = :userId")
    void lockUserAccount(@Param("userId") Long userId, @Param("lockUntil") LocalDateTime lockUntil);

    /**
     * Deactivate user (soft delete)
     */
    @Modifying
    @Query("UPDATE User u SET u.active = false WHERE u.id = :userId")
    void deactivateUser(@Param("userId") Long userId);

    /**
     * Activate user
     */
    @Modifying
    @Query("UPDATE User u SET u.active = true WHERE u.id = :userId")
    void activateUser(@Param("userId") Long userId);

    /**
     * Count users by role
     */
    long countByRoleAndActiveTrue(Role role);

    /**
     * Count total active users
     */
    long countByActiveTrue();

    /**
     * Count active users since a specific time for metrics
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.active = true AND u.lastLogin >= :since")
    int countActiveUsers(@Param("since") LocalDateTime since);
}