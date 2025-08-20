package com.ecommerce.inventory.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "file.upload")
public class FileStorageProperties {
    private String dir = "./uploads";
    private String maxFileSize = "10MB";
    private String maxRequestSize = "10MB";
    private List<String> allowedTypes = List.of("jpg", "jpeg", "png", "gif", "pdf");
    private boolean enableVirusScanning = false;
    private String virusScannerUrl;
    
    // Cloud storage configuration
    private CloudStorage cloudStorage = new CloudStorage();
    
    @Data
    public static class CloudStorage {
        private boolean enabled = false;
        private String provider = "s3"; // s3, azure, gcp
        private String bucketName;
        private String region;
        private String accessKey;
        private String secretKey;
        private String endpoint;
    }
}