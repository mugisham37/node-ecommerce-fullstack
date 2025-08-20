package com.ecommerce.inventory.repository;

import com.ecommerce.inventory.entity.User;
import com.ecommerce.inventory.entity.UserActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for UserActivity entity
 */
@Repository
public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {

    /**
     * Find activities by user with pagination
     */
    Page<UserActivity> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    /**
     * Find activities by user ID with pagination
     */
    Page<UserActivity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * Find activities by action
     */
    Page<UserActivity> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);

    /**
     * Find activities by date range
     */
    Page<UserActivity> findByCreatedAtBetweenOrderByCreatedAtDesc(
            LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    /**
     * Find activities by user and date range
     */
    Page<UserActivity> findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            Long userId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    /**
     * Find recent activities for a user
     */
    List<UserActivity> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Count activities by user and date range
     */
    @Query("SELECT COUNT(ua) FROM UserActivity ua WHERE ua.user.id = :userId AND ua.createdAt BETWEEN :startDate AND :endDate")
    long countByUserAndDateRange(@Param("userId") Long userId, 
                                @Param("startDate") LocalDateTime startDate, 
                                @Param("endDate") LocalDateTime endDate);

    /**
     * Find failed login attempts by IP address
     */
    @Query("SELECT ua FROM UserActivity ua WHERE ua.action = 'LOGIN_FAILED' AND ua.ipAddress = :ipAddress AND ua.createdAt > :since ORDER BY ua.createdAt DESC")
    List<UserActivity> findFailedLoginAttemptsByIp(@Param("ipAddress") String ipAddress, 
                                                  @Param("since") LocalDateTime since);

    /**
     * Find activities by resource type and ID
     */
    Page<UserActivity> findByResourceTypeAndResourceIdOrderByCreatedAtDesc(
            String resourceType, String resourceId, Pageable pageable);

    /**
     * Delete old activities (for cleanup)
     */
    void deleteByCreatedAtBefore(LocalDateTime cutoffDate);

    /**
     * Get activity statistics for dashboard
     */
    @Query("SELECT ua.action, COUNT(ua) FROM UserActivity ua WHERE ua.createdAt BETWEEN :startDate AND :endDate GROUP BY ua.action")
    List<Object[]> getActivityStatistics(@Param("startDate") LocalDateTime startDate, 
                                       @Param("endDate") LocalDateTime endDate);
}