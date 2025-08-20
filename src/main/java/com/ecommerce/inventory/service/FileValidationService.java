package com.ecommerce.inventory.service;

import com.ecommerce.inventory.config.FileStorageProperties;
import com.ecommerce.inventory.exception.FileValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileValidationService {

    private final FileStorageProperties fileStorageProperties;
    private final VirusScanningService virusScanningService;
    private final Tika tika = new Tika();

    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FileValidationException("File cannot be empty");
        }

        validateFileName(file.getOriginalFilename());
        validateFileSize(file);
        validateFileType(file);
        validateFileContent(file);
        
        // Perform virus scanning if enabled
        if (fileStorageProperties.isEnableVirusScanning()) {
            virusScanningService.scanFile(file);
        }
    }

    private void validateFileName(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            throw new FileValidationException("File name cannot be empty");
        }

        // Check for dangerous characters
        String[] dangerousChars = {"../", "..\\", "<", ">", ":", "\"", "|", "?", "*"};
        for (String dangerousChar : dangerousChars) {
            if (fileName.contains(dangerousChar)) {
                throw new FileValidationException("File name contains invalid characters");
            }
        }

        // Check file extension
        String extension = getFileExtension(fileName);
        if (!fileStorageProperties.getAllowedTypes().contains(extension.toLowerCase())) {
            throw new FileValidationException(
                "File type not allowed. Allowed types: " + 
                String.join(", ", fileStorageProperties.getAllowedTypes())
            );
        }
    }

    private void validateFileSize(MultipartFile file) {
        long maxSize = parseSize(fileStorageProperties.getMaxFileSize());
        if (file.getSize() > maxSize) {
            throw new FileValidationException(
                "File size exceeds maximum allowed size of " + fileStorageProperties.getMaxFileSize()
            );
        }
    }

    private void validateFileType(MultipartFile file) {
        try {
            String detectedType = tika.detect(file.getInputStream());
            String fileName = file.getOriginalFilename();
            String extension = getFileExtension(fileName);

            // Validate MIME type matches extension
            if (!isValidMimeTypeForExtension(detectedType, extension)) {
                throw new FileValidationException(
                    "File content does not match file extension. Detected type: " + detectedType
                );
            }
        } catch (IOException e) {
            throw new FileValidationException("Unable to validate file type", e);
        }
    }

    private void validateFileContent(MultipartFile file) {
        try {
            // Basic content validation - check for executable signatures
            byte[] header = new byte[Math.min(1024, (int) file.getSize())];
            file.getInputStream().read(header);
            
            // Check for common executable signatures
            if (containsExecutableSignature(header)) {
                throw new FileValidationException("File contains executable content");
            }
        } catch (IOException e) {
            throw new FileValidationException("Unable to validate file content", e);
        }
    }

    public String generateFileHash(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (IOException | NoSuchAlgorithmException e) {
            log.error("Error generating file hash", e);
            return null;
        }
    }

    public String getFileExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "";
        }
        int lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : "";
    }

    private boolean isValidMimeTypeForExtension(String mimeType, String extension) {
        return switch (extension.toLowerCase()) {
            case "jpg", "jpeg" -> mimeType.equals("image/jpeg");
            case "png" -> mimeType.equals("image/png");
            case "gif" -> mimeType.equals("image/gif");
            case "pdf" -> mimeType.equals("application/pdf");
            default -> false;
        };
    }

    private boolean containsExecutableSignature(byte[] header) {
        // Check for common executable signatures
        byte[][] signatures = {
            {0x4D, 0x5A}, // PE executable (MZ)
            {0x7F, 0x45, 0x4C, 0x46}, // ELF executable
            {(byte) 0xCA, (byte) 0xFE, (byte) 0xBA, (byte) 0xBE}, // Java class file
            {0x50, 0x4B, 0x03, 0x04}, // ZIP (could contain executables)
        };

        for (byte[] signature : signatures) {
            if (header.length >= signature.length) {
                boolean matches = true;
                for (int i = 0; i < signature.length; i++) {
                    if (header[i] != signature[i]) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    return true;
                }
            }
        }
        return false;
    }

    private long parseSize(String size) {
        if (size.endsWith("KB")) {
            return Long.parseLong(size.substring(0, size.length() - 2)) * 1024;
        } else if (size.endsWith("MB")) {
            return Long.parseLong(size.substring(0, size.length() - 2)) * 1024 * 1024;
        } else if (size.endsWith("GB")) {
            return Long.parseLong(size.substring(0, size.length() - 2)) * 1024 * 1024 * 1024;
        }
        return Long.parseLong(size);
    }
}