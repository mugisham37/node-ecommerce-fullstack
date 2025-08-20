package com.ecommerce.inventory.dto.versioning;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Wrapper for versioned API responses
 */
@Data
public class VersionedResponse<T> {
    
    private String apiVersion;
    private LocalDateTime timestamp;
    private T data;
    private VersionMetadata metadata;
    
    public VersionedResponse(String apiVersion, T data) {
        this.apiVersion = apiVersion;
        this.data = data;
        this.timestamp = LocalDateTime.now();
        this.metadata = new VersionMetadata();
    }
    
    @Data
    public static class VersionMetadata {
        private boolean deprecated = false;
        private String deprecationMessage;
        private String replacementVersion;
        private String replacementEndpoint;
        private LocalDateTime deprecationDate;
        private LocalDateTime removalDate;
    }
    
    public VersionedResponse<T> withDeprecation(String message, String replacementVersion, String replacementEndpoint) {
        this.metadata.setDeprecated(true);
        this.metadata.setDeprecationMessage(message);
        this.metadata.setReplacementVersion(replacementVersion);
        this.metadata.setReplacementEndpoint(replacementEndpoint);
        return this;
    }
}