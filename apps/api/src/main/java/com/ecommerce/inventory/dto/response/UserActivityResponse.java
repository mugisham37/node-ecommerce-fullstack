package com.ecommerce.inventory.dto.response;

import com.ecommerce.inventory.entity.UserActivity;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

/**
 * Response DTO for UserActivity
 */
public class UserActivityResponse {

    private Long id;
    private Long userId;
    private String userEmail;
    private String userFullName;
    private String action;
    private String resourceType;
    private String resourceId;
    private String ipAddress;
    private String userAgent;
    private String details;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    
    private String sessionId;
    private UserActivity.ActivityStatus status;
    private String errorMessage;

    // Constructors
    public UserActivityResponse() {}

    public UserActivityResponse(UserActivity activity) {
        this.id = activity.getId();
        this.userId = activity.getUser().getId();
        this.userEmail = activity.getUser().getEmail();
        this.userFullName = activity.getUser().getFullName();
        this.action = activity.getAction();
        this.resourceType = activity.getResourceType();
        this.resourceId = activity.getResourceId();
        this.ipAddress = activity.getIpAddress();
        this.userAgent = activity.getUserAgent();
        this.details = activity.getDetails();
        this.createdAt = activity.getCreatedAt();
        this.sessionId = activity.getSessionId();
        this.status = activity.getStatus();
        this.errorMessage = activity.getErrorMessage();
    }

    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UserActivityResponse response = new UserActivityResponse();

        public Builder id(Long id) {
            response.id = id;
            return this;
        }

        public Builder userId(Long userId) {
            response.userId = userId;
            return this;
        }

        public Builder userEmail(String userEmail) {
            response.userEmail = userEmail;
            return this;
        }

        public Builder userFullName(String userFullName) {
            response.userFullName = userFullName;
            return this;
        }

        public Builder action(String action) {
            response.action = action;
            return this;
        }

        public Builder resourceType(String resourceType) {
            response.resourceType = resourceType;
            return this;
        }

        public Builder resourceId(String resourceId) {
            response.resourceId = resourceId;
            return this;
        }

        public Builder ipAddress(String ipAddress) {
            response.ipAddress = ipAddress;
            return this;
        }

        public Builder userAgent(String userAgent) {
            response.userAgent = userAgent;
            return this;
        }

        public Builder details(String details) {
            response.details = details;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            response.createdAt = createdAt;
            return this;
        }

        public Builder sessionId(String sessionId) {
            response.sessionId = sessionId;
            return this;
        }

        public Builder status(UserActivity.ActivityStatus status) {
            response.status = status;
            return this;
        }

        public Builder errorMessage(String errorMessage) {
            response.errorMessage = errorMessage;
            return this;
        }

        public UserActivityResponse build() {
            return response;
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getResourceType() {
        return resourceType;
    }

    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }

    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public UserActivity.ActivityStatus getStatus() {
        return status;
    }

    public void setStatus(UserActivity.ActivityStatus status) {
        this.status = status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}