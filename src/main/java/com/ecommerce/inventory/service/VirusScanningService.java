package com.ecommerce.inventory.service;

import com.ecommerce.inventory.config.FileStorageProperties;
import com.ecommerce.inventory.exception.FileValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "file.upload.enable-virus-scanning", havingValue = "true")
public class VirusScanningService {

    private final FileStorageProperties fileStorageProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    public void scanFile(MultipartFile file) {
        if (!fileStorageProperties.isEnableVirusScanning()) {
            log.debug("Virus scanning is disabled, skipping scan for file: {}", file.getOriginalFilename());
            return;
        }

        String scannerUrl = fileStorageProperties.getVirusScannerUrl();
        if (scannerUrl == null || scannerUrl.trim().isEmpty()) {
            log.warn("Virus scanner URL not configured, skipping scan for file: {}", file.getOriginalFilename());
            return;
        }

        try {
            ScanResult result = performVirusScan(file, scannerUrl);
            
            if (!result.isClean()) {
                log.error("Virus detected in file: {} - Threat: {}", 
                    file.getOriginalFilename(), result.getThreatName());
                throw new FileValidationException(
                    "File contains malicious content: " + result.getThreatName()
                );
            }
            
            log.info("File passed virus scan: {}", file.getOriginalFilename());
            
        } catch (FileValidationException ex) {
            throw ex; // Re-throw validation exceptions
        } catch (Exception ex) {
            log.error("Virus scanning failed for file: {}", file.getOriginalFilename(), ex);
            
            // Decide whether to fail or allow based on configuration
            // For security, we'll fail by default
            throw new FileValidationException("Virus scanning failed: " + ex.getMessage());
        }
    }

    public CompletableFuture<ScanResult> scanFileAsync(MultipartFile file) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String scannerUrl = fileStorageProperties.getVirusScannerUrl();
                return performVirusScan(file, scannerUrl);
            } catch (Exception ex) {
                log.error("Async virus scanning failed for file: {}", file.getOriginalFilename(), ex);
                return new ScanResult(false, "SCAN_ERROR", "Scanning failed: " + ex.getMessage());
            }
        });
    }

    private ScanResult performVirusScan(MultipartFile file, String scannerUrl) {
        try {
            // Prepare the request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", file.getResource());

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // Make the request with timeout
            ResponseEntity<VirusScanResponse> response = restTemplate.exchange(
                scannerUrl + "/scan",
                HttpMethod.POST,
                requestEntity,
                VirusScanResponse.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                VirusScanResponse scanResponse = response.getBody();
                return new ScanResult(
                    scanResponse.isClean(),
                    scanResponse.getThreatName(),
                    scanResponse.getMessage()
                );
            } else {
                throw new RuntimeException("Invalid response from virus scanner");
            }

        } catch (Exception ex) {
            log.error("Error communicating with virus scanner", ex);
            throw new RuntimeException("Virus scanning service unavailable", ex);
        }
    }

    // Mock implementation for demonstration when no external scanner is available
    public ScanResult performMockScan(MultipartFile file) {
        log.info("Performing mock virus scan for file: {}", file.getOriginalFilename());
        
        // Simulate scanning delay
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Mock scan logic - flag files with suspicious names
        String fileName = file.getOriginalFilename();
        if (fileName != null && (fileName.contains("virus") || fileName.contains("malware"))) {
            return new ScanResult(false, "MOCK_VIRUS", "Mock virus detected in filename");
        }

        return new ScanResult(true, null, "File is clean");
    }

    // DTO classes for virus scanner communication
    public static class VirusScanResponse {
        private boolean clean;
        private String threatName;
        private String message;
        private long scanTime;

        // Constructors, getters, and setters
        public VirusScanResponse() {}

        public VirusScanResponse(boolean clean, String threatName, String message, long scanTime) {
            this.clean = clean;
            this.threatName = threatName;
            this.message = message;
            this.scanTime = scanTime;
        }

        public boolean isClean() { return clean; }
        public void setClean(boolean clean) { this.clean = clean; }

        public String getThreatName() { return threatName; }
        public void setThreatName(String threatName) { this.threatName = threatName; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public long getScanTime() { return scanTime; }
        public void setScanTime(long scanTime) { this.scanTime = scanTime; }
    }

    public record ScanResult(
        boolean isClean,
        String threatName,
        String message
    ) {}
}