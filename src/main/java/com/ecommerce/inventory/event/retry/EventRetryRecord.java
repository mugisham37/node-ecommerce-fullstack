package com.ecommerce.inventory.event.retry;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Record of retry attempts for a specific event.
 * Tracks all attempts, failures, and final status.
 */
public class EventRetryRecord {
    
    private final String eventId;
    private final LocalDateTime createdAt;
    private final List<RetryAttempt> attempts;
    private boolean finallyFailed;
    private String finalErrorMessage;
    private LocalDateTime finalFailureTime;
    
    public EventRetryRecord(String eventId) {
        this.eventId = eventId;
        this.createdAt = LocalDateTime.now();
        this.attempts = new ArrayList<>();
        this.finallyFailed = false;
    }
    
    public void addAttempt(int attemptNumber, LocalDateTime attemptTime) {
        attempts.add(new RetryAttempt(attemptNumber, attemptTime));
    }
    
    public void addFailure(int attemptNumber, String errorMessage, LocalDateTime failureTime) {
        RetryAttempt attempt = findOrCreateAttempt(attemptNumber);
        attempt.setFailed(true);
        attempt.setErrorMessage(errorMessage);
        attempt.setFailureTime(failureTime);
    }
    
    public void markAsFinallyFailed(String errorMessage, LocalDateTime failureTime) {
        this.finallyFailed = true;
        this.finalErrorMessage = errorMessage;
        this.finalFailureTime = failureTime;
    }
    
    private RetryAttempt findOrCreateAttempt(int attemptNumber) {
        return attempts.stream()
                .filter(attempt -> attempt.getAttemptNumber() == attemptNumber)
                .findFirst()
                .orElseGet(() -> {
                    RetryAttempt newAttempt = new RetryAttempt(attemptNumber, LocalDateTime.now());
                    attempts.add(newAttempt);
                    return newAttempt;
                });
    }
    
    public String getEventId() {
        return eventId;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public List<RetryAttempt> getAttempts() {
        return new ArrayList<>(attempts);
    }
    
    public int getAttemptCount() {
        return attempts.size();
    }
    
    public boolean isFinallyFailed() {
        return finallyFailed;
    }
    
    public String getFinalErrorMessage() {
        return finalErrorMessage;
    }
    
    public LocalDateTime getFinalFailureTime() {
        return finalFailureTime;
    }
    
    public RetryAttempt getLastAttempt() {
        return attempts.isEmpty() ? null : attempts.get(attempts.size() - 1);
    }
    
    public long getTotalRetryDurationMs() {
        if (attempts.isEmpty()) {
            return 0;
        }
        
        LocalDateTime firstAttempt = attempts.get(0).getAttemptTime();
        LocalDateTime lastAttempt = attempts.get(attempts.size() - 1).getAttemptTime();
        
        return java.time.Duration.between(firstAttempt, lastAttempt).toMillis();
    }
    
    @Override
    public String toString() {
        return String.format("EventRetryRecord{eventId='%s', attempts=%d, finallyFailed=%s, createdAt=%s}", 
                           eventId, attempts.size(), finallyFailed, createdAt);
    }
    
    /**
     * Represents a single retry attempt.
     */
    public static class RetryAttempt {
        private final int attemptNumber;
        private final LocalDateTime attemptTime;
        private boolean failed;
        private String errorMessage;
        private LocalDateTime failureTime;
        
        public RetryAttempt(int attemptNumber, LocalDateTime attemptTime) {
            this.attemptNumber = attemptNumber;
            this.attemptTime = attemptTime;
            this.failed = false;
        }
        
        public int getAttemptNumber() {
            return attemptNumber;
        }
        
        public LocalDateTime getAttemptTime() {
            return attemptTime;
        }
        
        public boolean isFailed() {
            return failed;
        }
        
        public void setFailed(boolean failed) {
            this.failed = failed;
        }
        
        public String getErrorMessage() {
            return errorMessage;
        }
        
        public void setErrorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
        }
        
        public LocalDateTime getFailureTime() {
            return failureTime;
        }
        
        public void setFailureTime(LocalDateTime failureTime) {
            this.failureTime = failureTime;
        }
        
        @Override
        public String toString() {
            return String.format("RetryAttempt{number=%d, time=%s, failed=%s, error='%s'}", 
                               attemptNumber, attemptTime, failed, errorMessage);
        }
    }
}