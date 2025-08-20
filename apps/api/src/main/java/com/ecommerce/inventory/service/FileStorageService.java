package com.ecommerce.inventory.service;

import com.ecommerce.inventory.config.FileStorageProperties;
import com.ecommerce.inventory.dto.request.FileUploadRequest;
import com.ecommerce.inventory.dto.response.FileUploadResponse;
import com.ecommerce.inventory.exception.FileStorageException;
import com.ecommerce.inventory.service.storage.LocalStorageBackend;
import com.ecommerce.inventory.service.storage.S3StorageBackend;
import com.ecommerce.inventory.service.storage.StorageBackend;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final FileStorageProperties fileStorageProperties;
    private final FileValidationService fileValidationService;
    private final FileNamingService fileNamingService;
    private final LocalStorageBackend localStorageBackend;
    private final S3StorageBackend s3StorageBackend;
    private final ImageProcessingService imageProcessingService;
    private final FileAccessControlService fileAccessControlService;
    
    // Track upload progress
    private final ConcurrentMap<String, UploadProgress> uploadProgressMap = new ConcurrentHashMap<>();

    public FileUploadResponse uploadFile(FileUploadRequest request) {
        MultipartFile file = request.getFile();
        String uploadId = generateUploadId();
        
        try {
            // Initialize progress tracking
            updateUploadProgress(uploadId, 0, "Validating permissions...");
            
            // Validate upload permissions
            fileAccessControlService.validateUploadPermission(request.getCategory(), request.getEntityId());
            updateUploadProgress(uploadId, 10, "Permissions validated");
            
            // Validate file
            fileValidationService.validateFile(file);
            updateUploadProgress(uploadId, 30, "File validation completed");
            
            // Generate secure filename and directory
            String fileName = fileNamingService.generateFileName(
                file.getOriginalFilename(), 
                request.getCategory(), 
                request.getEntityId()
            );
            
            String directory = fileNamingService.generateDirectoryPath(
                request.getCategory(), 
                LocalDateTime.now()
            );
            
            updateUploadProgress(uploadId, 40, "Preparing file storage...");
            
            // Store file using appropriate backend
            StorageBackend storageBackend = getStorageBackend();
            String storedPath = storageBackend.store(file, fileName, directory);
            
            updateUploadProgress(uploadId, 80, "File stored successfully");
            
            // Generate file hash
            String fileHash = fileValidationService.generateFileHash(file);
            
            // Extract metadata
            FileUploadResponse.FileMetadata metadata = extractFileMetadata(file);
            
            updateUploadProgress(uploadId, 100, "Upload completed");
            
            // Build response
            FileUploadResponse response = FileUploadResponse.builder()
                .fileName(fileName)
                .originalFileName(file.getOriginalFilename())
                .fileUrl(storageBackend.getFileUrl(storedPath))
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .fileHash(fileHash)
                .uploadedAt(LocalDateTime.now())
                .metadata(metadata)
                .build();
            
            log.info("File uploaded successfully: {} -> {}", file.getOriginalFilename(), fileName);
            return response;
            
        } catch (Exception ex) {
            updateUploadProgress(uploadId, -1, "Upload failed: " + ex.getMessage());
            log.error("File upload failed for: {}", file.getOriginalFilename(), ex);
            throw new FileStorageException("File upload failed", ex);
        } finally {
            // Clean up progress tracking after a delay
            CompletableFuture.delayedExecutor(java.util.concurrent.TimeUnit.MINUTES.toMillis(5), 
                java.util.concurrent.TimeUnit.MILLISECONDS)
                .execute(() -> uploadProgressMap.remove(uploadId));
        }
    }

    public Resource loadFileAsResource(String fileName) {
        try {
            // Validate file access permissions
            fileAccessControlService.validateFileAccess(fileName, "read");
            
            StorageBackend storageBackend = getStorageBackend();
            return storageBackend.loadAsResource(fileName);
        } catch (IOException ex) {
            throw new FileStorageException("Could not load file: " + fileName, ex);
        }
    }

    public void deleteFile(String fileName) {
        try {
            // Validate delete permissions
            fileAccessControlService.validateDeletePermission(fileName);
            
            StorageBackend storageBackend = getStorageBackend();
            storageBackend.delete(fileName);
            log.info("File deleted successfully: {}", fileName);
        } catch (IOException ex) {
            throw new FileStorageException("Could not delete file: " + fileName, ex);
        }
    }

    public boolean fileExists(String fileName) {
        StorageBackend storageBackend = getStorageBackend();
        return storageBackend.exists(fileName);
    }

    public List<String> getAllowedFileTypes() {
        return fileStorageProperties.getAllowedTypes();
    }

    public boolean validateFileSize(MultipartFile file) {
        try {
            fileValidationService.validateFile(file);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public String generateSecureFileName(String originalFileName) {
        return fileNamingService.generateSecureFileName(originalFileName);
    }

    public UploadProgress getUploadProgress(String uploadId) {
        return uploadProgressMap.get(uploadId);
    }

    private StorageBackend getStorageBackend() {
        if (fileStorageProperties.getCloudStorage().isEnabled()) {
            return s3StorageBackend;
        } else {
            return localStorageBackend;
        }
    }

    private String generateUploadId() {
        return java.util.UUID.randomUUID().toString();
    }

    private void updateUploadProgress(String uploadId, int percentage, String message) {
        UploadProgress progress = new UploadProgress(uploadId, percentage, message, LocalDateTime.now());
        uploadProgressMap.put(uploadId, progress);
        log.debug("Upload progress [{}]: {}% - {}", uploadId, percentage, message);
    }

    private FileUploadResponse.FileMetadata extractFileMetadata(MultipartFile file) {
        try {
            return imageProcessingService.extractImageMetadata(file);
        } catch (Exception ex) {
            log.warn("Failed to extract file metadata for: {}", file.getOriginalFilename(), ex);
            
            // Fallback to basic metadata
            String contentType = file.getContentType();
            boolean isImage = contentType != null && contentType.startsWith("image/");
            
            return FileUploadResponse.FileMetadata.builder()
                .isImage(isImage)
                .format(fileValidationService.getFileExtension(file.getOriginalFilename()))
                .build();
        }
    }

    // Inner class for upload progress tracking
    public record UploadProgress(
        String uploadId,
        int percentage,
        String message,
        LocalDateTime timestamp
    ) {}
}