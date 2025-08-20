package com.ecommerce.inventory.service;

import com.ecommerce.inventory.entity.User;
import com.ecommerce.inventory.entity.UserActivity;
import com.ecommerce.inventory.repository.UserActivityRepository;
import com.ecommerce.inventory.repository.UserRepository;
import com.ecommerce.inventory.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for managing user activity tracking and audit logging
 */
@Service
@Transactional
public class UserActivityService {

    private static final Logger logger = LoggerFactory.getLogger(UserActivityService.class);

    @Autowired
    private UserActivityRepository userActivityRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Log user activity asynchronously
     */
    @Async
    public void logActivity(String action, String resourceType, String resourceId, String details) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
                User user = userRepository.findById(userPrincipal.getId()).orElse(null);
                
                if (user != null) {
                    logActivity(user, action, resourceType, resourceId, details, UserActivity.ActivityStatus.SUCCESS);
                }
            }
        } catch (Exception e) {
            logger.error("Error logging user activity", e);
        }
    }

    /**
     * Log user activity with specific user
     */
    @Async
    public void logActivity(User user, String action, String resourceType, String resourceId, String details, UserActivity.ActivityStatus status) {
        try {
            UserActivity activity = new UserActivity(user, action, resourceType, resourceId);
            activity.setDetails(details);
            activity.setStatus(status);

            // Get request information if available
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                activity.setIpAddress(getClientIpAddress(request));
                activity.setUserAgent(request.getHeader("User-Agent"));
                activity.setSessionId(request.getSession().getId());
            }

            userActivityRepository.save(activity);
            logger.debug("Logged activity: {} for user: {}", action, user.getEmail());
        } catch (Exception e) {
            logger.error("Error saving user activity", e);
        }
    }

    /**
     * Log failed activity
     */
    @Async
    public void logFailedActivity(String action, String resourceType, String resourceId, String errorMessage) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
                User user = userRepository.findById(userPrincipal.getId()).orElse(null);
                
                if (user != null) {
                    UserActivity activity = new UserActivity(user, action, resourceType, resourceId);
                    activity.setStatus(UserActivity.ActivityStatus.FAILED);
                    activity.setErrorMessage(errorMessage);

                    // Get request information if available
                    ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                    if (attributes != null) {
                        HttpServletRequest request = attributes.getRequest();
                        activity.setIpAddress(getClientIpAddress(request));
                        activity.setUserAgent(request.getHeader("User-Agent"));
                        activity.setSessionId(request.getSession().getId());
                    }

                    userActivityRepository.save(activity);
                }
            }
        } catch (Exception e) {
            logger.error("Error logging failed user activity", e);
        }
    }

    /**
     * Log login activity
     */
    public void logLoginActivity(User user, boolean success, String ipAddress, String userAgent) {
        try {
            UserActivity activity = new UserActivity(user, success ? "LOGIN_SUCCESS" : "LOGIN_FAILED", "USER", user.getId().toString());
            activity.setStatus(success ? UserActivity.ActivityStatus.SUCCESS : UserActivity.ActivityStatus.FAILED);
            activity.setIpAddress(ipAddress);
            activity.setUserAgent(userAgent);
            
            if (!success) {
                activity.setErrorMessage("Invalid credentials");
            }

            userActivityRepository.save(activity);
            logger.debug("Logged login activity for user: {}, success: {}", user.getEmail(), success);
        } catch (Exception e) {
            logger.error("Error logging login activity", e);
        }
    }

    /**
     * Get user activities with pagination
     */
    public Page<UserActivity> getUserActivities(Long userId, Pageable pageable) {
        return userActivityRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * Get activities by action
     */
    public Page<UserActivity> getActivitiesByAction(String action, Pageable pageable) {
        return userActivityRepository.findByActionOrderByCreatedAtDesc(action, pageable);
    }

    /**
     * Get activities by date range
     */
    public Page<UserActivity> getActivitiesByDateRange(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        return userActivityRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startDate, endDate, pageable);
    }

    /**
     * Get recent activities for a user
     */
    public List<UserActivity> getRecentUserActivities(Long userId) {
        return userActivityRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get activity statistics
     */
    public Map<String, Object> getActivityStatistics(LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> statistics = userActivityRepository.getActivityStatistics(startDate, endDate);
        
        Map<String, Object> result = new HashMap<>();
        Map<String, Long> actionCounts = new HashMap<>();
        
        for (Object[] stat : statistics) {
            String action = (String) stat[0];
            Long count = (Long) stat[1];
            actionCounts.put(action, count);
        }
        
        result.put("actionCounts", actionCounts);
        result.put("totalActivities", actionCounts.values().stream().mapToLong(Long::longValue).sum());
        result.put("startDate", startDate);
        result.put("endDate", endDate);
        
        return result;
    }

    /**
     * Get failed login attempts by IP
     */
    public List<UserActivity> getFailedLoginAttemptsByIp(String ipAddress, LocalDateTime since) {
        return userActivityRepository.findFailedLoginAttemptsByIp(ipAddress, since);
    }

    /**
     * Clean up old activities
     */
    @Async
    public void cleanupOldActivities(int daysToKeep) {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);
            userActivityRepository.deleteByCreatedAtBefore(cutoffDate);
            logger.info("Cleaned up user activities older than {} days", daysToKeep);
        } catch (Exception e) {
            logger.error("Error cleaning up old activities", e);
        }
    }

    /**
     * Get client IP address from request
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }

    /**
     * Activity constants for consistent logging
     */
    public static class ActivityActions {
        public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
        public static final String LOGIN_FAILED = "LOGIN_FAILED";
        public static final String LOGOUT = "LOGOUT";
        public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
        public static final String PROFILE_UPDATED = "PROFILE_UPDATED";
        public static final String USER_CREATED = "USER_CREATED";
        public static final String USER_UPDATED = "USER_UPDATED";
        public static final String USER_DEACTIVATED = "USER_DEACTIVATED";
        public static final String USER_ACTIVATED = "USER_ACTIVATED";
        public static final String ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED";
        public static final String TOKEN_REFRESHED = "TOKEN_REFRESHED";
    }
}