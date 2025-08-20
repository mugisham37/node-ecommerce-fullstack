package com.ecommerce.inventory.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
@Service
public class FileNamingService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String ALLOWED_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HHmmss");

    public String generateSecureFileName(String originalFileName) {
        String extension = getFileExtension(originalFileName);
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String randomString = generateRandomString(8);
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        
        return String.format("%s_%s_%s.%s", timestamp, randomString, uuid, extension);
    }

    public String generateFileName(String originalFileName, String category, Long entityId) {
        String extension = getFileExtension(originalFileName);
        String sanitizedCategory = sanitizeString(category);
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String randomString = generateRandomString(6);
        
        if (entityId != null && StringUtils.hasText(sanitizedCategory)) {
            return String.format("%s_%d_%s_%s.%s", 
                sanitizedCategory, entityId, timestamp, randomString, extension);
        } else if (StringUtils.hasText(sanitizedCategory)) {
            return String.format("%s_%s_%s.%s", 
                sanitizedCategory, timestamp, randomString, extension);
        } else {
            return generateSecureFileName(originalFileName);
        }
    }

    public String generateDirectoryPath(String category, LocalDateTime uploadTime) {
        String sanitizedCategory = sanitizeString(category);
        String datePath = uploadTime.format(DATE_FORMATTER);
        
        if (StringUtils.hasText(sanitizedCategory)) {
            return String.format("%s/%s", sanitizedCategory, datePath);
        } else {
            return String.format("general/%s", datePath);
        }
    }

    public String generateThumbnailFileName(String originalFileName, String size) {
        String nameWithoutExtension = getFileNameWithoutExtension(originalFileName);
        String extension = getFileExtension(originalFileName);
        return String.format("%s_thumb_%s.%s", nameWithoutExtension, size, extension);
    }

    public String generateVariantFileName(String originalFileName, String variant) {
        String nameWithoutExtension = getFileNameWithoutExtension(originalFileName);
        String extension = getFileExtension(originalFileName);
        return String.format("%s_%s.%s", nameWithoutExtension, variant, extension);
    }

    private String getFileExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "";
        }
        int lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : "";
    }

    private String getFileNameWithoutExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "";
        }
        int lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
    }

    private String sanitizeString(String input) {
        if (!StringUtils.hasText(input)) {
            return "";
        }
        
        return input.toLowerCase()
                   .replaceAll("[^a-z0-9]", "_")
                   .replaceAll("_{2,}", "_")
                   .replaceAll("^_|_$", "");
    }

    private String generateRandomString(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALLOWED_CHARS.charAt(SECURE_RANDOM.nextInt(ALLOWED_CHARS.length())));
        }
        return sb.toString();
    }
}