package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.FileUploadRequest;
import com.ecommerce.inventory.dto.response.FileUploadResponse;
import com.ecommerce.inventory.exception.FileStorageException;
import com.ecommerce.inventory.service.storage.StorageBackend;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EnhancedFileStorageService {

    private final FileStorageService fileStorageService;
    private final ImageProcessingService imageProcessingService;

    public FileUploadResponse uploadFileWithProcessing(FileUploadRequest request) {
        MultipartFile file = request.getFile();
        
        try {
            // Check if it's an image file
            if (isImageFile(file)) {
                return uploadImageWithVariants(request);
            } else {
                // For non-image files, use standard upload
                return fileStorageService.uploadFile(request);
            }
        } catch (Exception ex) {
            log.error("Enhanced file upload failed for: {}", file.getOriginalFilename(), ex);
            throw new FileStorageException("Enhanced file upload failed", ex);
        }
    }

    private FileUploadResponse uploadImageWithVariants(FileUploadRequest request) throws IOException {
        MultipartFile originalFile = request.getFile();
        
        // Extract image metadata
        FileUploadResponse.FileMetadata metadata = 
            imageProcessingService.extractImageMetadata(originalFile);
        
        // Process image into different sizes
        Map<String, byte[]> processedImages = imageProcessingService.processImage(originalFile);
        
        // Upload original file first
        FileUploadResponse mainResponse = fileStorageService.uploadFile(request);
        
        // Upload image variants
        List<ImageVariant> variants = new ArrayList<>();
        for (Map.Entry<String, byte[]> entry : processedImages.entrySet()) {
            String sizeName = entry.getKey();
            byte[] imageData = entry.getValue();
            
            if (!"original".equals(sizeName)) { // Skip original as it's already uploaded
                try {
                    ImageVariant variant = uploadImageVariant(
                        originalFile.getOriginalFilename(),
                        imageData,
                        sizeName,
                        request.getCategory(),
                        request.getEntityId()
                    );
                    variants.add(variant);
                } catch (Exception ex) {
                    log.error("Failed to upload image variant: {}", sizeName, ex);
                    // Continue with other variants
                }
            }
        }
        
        // Enhance the response with image metadata and variants
        return enhanceResponseWithImageData(mainResponse, metadata, variants);
    }

    private ImageVariant uploadImageVariant(String originalFileName, byte[] imageData, 
                                          String sizeName, String category, Long entityId) throws IOException {
        
        // Generate variant filename
        String variantFileName = imageProcessingService.generateVariantFileName(originalFileName, sizeName);
        
        // Create MultipartFile from processed image data
        MockMultipartFile variantFile = new MockMultipartFile(
            "file",
            variantFileName,
            "image/jpeg", // Assuming JPEG for variants
            imageData
        );
        
        // Create upload request for variant
        FileUploadRequest variantRequest = FileUploadRequest.builder()
            .file(variantFile)
            .category(category)
            .entityId(entityId)
            .description("Image variant: " + sizeName)
            .build();
        
        // Upload variant
        FileUploadResponse variantResponse = fileStorageService.uploadFile(variantRequest);
        
        return new ImageVariant(
            sizeName,
            variantResponse.getFileName(),
            variantResponse.getFileUrl(),
            variantResponse.getFileSize(),
            extractDimensionsFromMetadata(variantResponse.getMetadata())
        );
    }

    private FileUploadResponse enhanceResponseWithImageData(FileUploadResponse originalResponse,
                                                          FileUploadResponse.FileMetadata metadata,
                                                          List<ImageVariant> variants) {
        
        // Create enhanced metadata
        FileUploadResponse.FileMetadata enhancedMetadata = FileUploadResponse.FileMetadata.builder()
            .width(metadata.getWidth())
            .height(metadata.getHeight())
            .format(metadata.getFormat())
            .isImage(metadata.getIsImage())
            .description(originalResponse.getMetadata() != null ? 
                originalResponse.getMetadata().getDescription() : null)
            .build();
        
        // Return enhanced response
        return FileUploadResponse.builder()
            .fileName(originalResponse.getFileName())
            .originalFileName(originalResponse.getOriginalFileName())
            .fileUrl(originalResponse.getFileUrl())
            .contentType(originalResponse.getContentType())
            .fileSize(originalResponse.getFileSize())
            .fileHash(originalResponse.getFileHash())
            .uploadedAt(originalResponse.getUploadedAt())
            .metadata(enhancedMetadata)
            .build();
    }

    public Map<String, String> getImageVariants(String originalFileName, String category, Long entityId) {
        Map<String, String> variants = new HashMap<>();
        
        for (String sizeName : ImageProcessingService.IMAGE_SIZES.keySet()) {
            if (!"original".equals(sizeName)) {
                String variantFileName = imageProcessingService.generateVariantFileName(originalFileName, sizeName);
                if (fileStorageService.fileExists(variantFileName)) {
                    // Get the file URL for the variant
                    variants.put(sizeName, "/api/v1/files/" + variantFileName);
                }
            }
        }
        
        return variants;
    }

    public void deleteImageWithVariants(String originalFileName) {
        try {
            // Delete original file
            fileStorageService.deleteFile(originalFileName);
            
            // Delete all variants
            for (String sizeName : ImageProcessingService.IMAGE_SIZES.keySet()) {
                if (!"original".equals(sizeName)) {
                    String variantFileName = imageProcessingService.generateVariantFileName(originalFileName, sizeName);
                    try {
                        fileStorageService.deleteFile(variantFileName);
                    } catch (Exception ex) {
                        log.warn("Failed to delete image variant: {}", variantFileName, ex);
                    }
                }
            }
            
            log.info("Deleted image with all variants: {}", originalFileName);
        } catch (Exception ex) {
            log.error("Failed to delete image with variants: {}", originalFileName, ex);
            throw new FileStorageException("Failed to delete image with variants", ex);
        }
    }

    private boolean isImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType != null && contentType.startsWith("image/");
    }

    private String extractDimensionsFromMetadata(FileUploadResponse.FileMetadata metadata) {
        if (metadata != null && metadata.getWidth() != null && metadata.getHeight() != null) {
            return metadata.getWidth() + "x" + metadata.getHeight();
        }
        return null;
    }

    // Inner class for image variant information
    public record ImageVariant(
        String sizeName,
        String fileName,
        String fileUrl,
        Long fileSize,
        String dimensions
    ) {}
}