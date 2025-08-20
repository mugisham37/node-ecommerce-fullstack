package com.ecommerce.inventory.event.retry;

/**
 * Configuration for event retry behavior.
 * Defines retry attempts, delays, and backoff strategies.
 */
public class RetryPolicy {
    
    private final int maxAttempts;
    private final long initialDelayMs;
    private final long maxDelayMs;
    private final double backoffMultiplier;
    private final boolean jitterEnabled;
    
    private RetryPolicy(Builder builder) {
        this.maxAttempts = builder.maxAttempts;
        this.initialDelayMs = builder.initialDelayMs;
        this.maxDelayMs = builder.maxDelayMs;
        this.backoffMultiplier = builder.backoffMultiplier;
        this.jitterEnabled = builder.jitterEnabled;
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static RetryPolicy defaultPolicy() {
        return builder()
                .maxAttempts(3)
                .initialDelayMs(1000)
                .maxDelayMs(30000)
                .backoffMultiplier(2.0)
                .jitterEnabled(true)
                .build();
    }
    
    public static RetryPolicy criticalEventPolicy() {
        return builder()
                .maxAttempts(5)
                .initialDelayMs(500)
                .maxDelayMs(60000)
                .backoffMultiplier(1.5)
                .jitterEnabled(true)
                .build();
    }
    
    public static RetryPolicy lowPriorityEventPolicy() {
        return builder()
                .maxAttempts(2)
                .initialDelayMs(2000)
                .maxDelayMs(10000)
                .backoffMultiplier(3.0)
                .jitterEnabled(false)
                .build();
    }
    
    public static RetryPolicy notificationEventPolicy() {
        return builder()
                .maxAttempts(3)
                .initialDelayMs(1500)
                .maxDelayMs(20000)
                .backoffMultiplier(2.5)
                .jitterEnabled(true)
                .build();
    }
    
    public int getMaxAttempts() {
        return maxAttempts;
    }
    
    public long getInitialDelayMs() {
        return initialDelayMs;
    }
    
    public long getMaxDelayMs() {
        return maxDelayMs;
    }
    
    public double getBackoffMultiplier() {
        return backoffMultiplier;
    }
    
    public boolean isJitterEnabled() {
        return jitterEnabled;
    }
    
    public static class Builder {
        private int maxAttempts = 3;
        private long initialDelayMs = 1000;
        private long maxDelayMs = 30000;
        private double backoffMultiplier = 2.0;
        private boolean jitterEnabled = true;
        
        public Builder maxAttempts(int maxAttempts) {
            if (maxAttempts < 1) {
                throw new IllegalArgumentException("Max attempts must be at least 1");
            }
            this.maxAttempts = maxAttempts;
            return this;
        }
        
        public Builder initialDelayMs(long initialDelayMs) {
            if (initialDelayMs < 0) {
                throw new IllegalArgumentException("Initial delay must be non-negative");
            }
            this.initialDelayMs = initialDelayMs;
            return this;
        }
        
        public Builder maxDelayMs(long maxDelayMs) {
            if (maxDelayMs < initialDelayMs) {
                throw new IllegalArgumentException("Max delay must be greater than or equal to initial delay");
            }
            this.maxDelayMs = maxDelayMs;
            return this;
        }
        
        public Builder backoffMultiplier(double backoffMultiplier) {
            if (backoffMultiplier < 1.0) {
                throw new IllegalArgumentException("Backoff multiplier must be at least 1.0");
            }
            this.backoffMultiplier = backoffMultiplier;
            return this;
        }
        
        public Builder jitterEnabled(boolean jitterEnabled) {
            this.jitterEnabled = jitterEnabled;
            return this;
        }
        
        public RetryPolicy build() {
            return new RetryPolicy(this);
        }
    }
    
    @Override
    public String toString() {
        return String.format("RetryPolicy{maxAttempts=%d, initialDelayMs=%d, maxDelayMs=%d, " +
                           "backoffMultiplier=%.1f, jitterEnabled=%s}", 
                           maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier, jitterEnabled);
    }
}