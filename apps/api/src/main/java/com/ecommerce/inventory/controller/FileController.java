package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.FileUploadRequest;
import com.ecommerce.inventory.dto.response.FileUploadResponse;
import com.ecommerce.inventory.service.FileStorageService;
import com.ecommerce.inventory.service.EnhancedFileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Tag(name = "File Management", description = "File upload and management operations")
public class FileController {

    private final FileStorageService fileStorageService;
    private final EnhancedFileStorageService enhancedFileStorageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Upload a file", description = "Upload a file with validation and processing")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "File uploaded successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid file or validation failed"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "413", description = "File too large"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<FileUploadResponse> uploadFile(
            @Parameter(description = "File to upload", required = true)
            @RequestParam("file") MultipartFile file,
            
            @Parameter(description = "File description")
            @RequestParam(value = "description", required = false) String description,
            
            @Parameter(description = "File category")
            @RequestParam(value = "category", required = false) String category,
            
            @Parameter(description = "Associated entity ID")
            @RequestParam(value = "entityId", required = false) Long entityId,
            
            @Parameter(description = "Associated entity type")
            @RequestParam(value = "entityType", required = false) String entityType) {

        FileUploadRequest request = FileUploadRequest.builder()
            .file(file)
            .description(description)
            .category(category)
            .entityId(entityId)
            .entityType(entityType)
            .build();

        FileUploadResponse response = fileStorageService.uploadFile(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/upload-enhanced", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Upload a file with image processing", description = "Upload a file with automatic image processing and variant generation")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "File uploaded and processed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid file or validation failed"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "413", description = "File too large"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<FileUploadResponse> uploadFileEnhanced(
            @Parameter(description = "File to upload", required = true)
            @RequestParam("file") MultipartFile file,
            
            @Parameter(description = "File description")
            @RequestParam(value = "description", required = false) String description,
            
            @Parameter(description = "File category")
            @RequestParam(value = "category", required = false) String category,
            
            @Parameter(description = "Associated entity ID")
            @RequestParam(value = "entityId", required = false) Long entityId,
            
            @Parameter(description = "Associated entity type")
            @RequestParam(value = "entityType", required = false) String entityType) {

        FileUploadRequest request = FileUploadRequest.builder()
            .file(file)
            .description(description)
            .category(category)
            .entityId(entityId)
            .entityType(entityType)
            .build();

        FileUploadResponse response = enhancedFileStorageService.uploadFileWithProcessing(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/image-variants/{fileName:.+}")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Get image variants", description = "Get all available variants of an image")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Image variants retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Image not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<java.util.Map<String, String>> getImageVariants(
            @Parameter(description = "Original image filename", required = true)
            @PathVariable String fileName,
            
            @Parameter(description = "Image category")
            @RequestParam(value = "category", required = false) String category,
            
            @Parameter(description = "Associated entity ID")
            @RequestParam(value = "entityId", required = false) Long entityId) {

        java.util.Map<String, String> variants = enhancedFileStorageService.getImageVariants(fileName, category, entityId);
        return ResponseEntity.ok(variants);
    }

    @GetMapping("/{fileName:.+}")
    @Operation(summary = "Download a file", description = "Download a file by filename")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "File downloaded successfully"),
        @ApiResponse(responseCode = "404", description = "File not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "Name of the file to download", required = true)
            @PathVariable String fileName) {

        Resource resource = fileStorageService.loadFileAsResource(fileName);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
            .body(resource);
    }

    @GetMapping("/view/{fileName:.+}")
    @Operation(summary = "View a file", description = "View a file inline in the browser")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "File loaded successfully"),
        @ApiResponse(responseCode = "404", description = "File not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<Resource> viewFile(
            @Parameter(description = "Name of the file to view", required = true)
            @PathVariable String fileName) {

        Resource resource = fileStorageService.loadFileAsResource(fileName);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
            .body(resource);
    }

    @DeleteMapping("/{fileName:.+}")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Delete a file", description = "Delete a file by filename")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "File deleted successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden"),
        @ApiResponse(responseCode = "404", description = "File not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<Void> deleteFile(
            @Parameter(description = "Name of the file to delete", required = true)
            @PathVariable String fileName) {

        fileStorageService.deleteFile(fileName);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/exists/{fileName:.+}")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Check if file exists", description = "Check if a file exists in storage")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "File existence check completed"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<Boolean> fileExists(
            @Parameter(description = "Name of the file to check", required = true)
            @PathVariable String fileName) {

        boolean exists = fileStorageService.fileExists(fileName);
        return ResponseEntity.ok(exists);
    }

    @GetMapping("/allowed-types")
    @Operation(summary = "Get allowed file types", description = "Get list of allowed file types for upload")
    @ApiResponse(responseCode = "200", description = "Allowed file types retrieved successfully")
    public ResponseEntity<List<String>> getAllowedFileTypes() {
        List<String> allowedTypes = fileStorageService.getAllowedFileTypes();
        return ResponseEntity.ok(allowedTypes);
    }

    @GetMapping("/upload-progress/{uploadId}")
    @PreAuthorize("hasRole('EMPLOYEE')")
    @Operation(summary = "Get upload progress", description = "Get the progress of a file upload")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Upload progress retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Upload ID not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<FileStorageService.UploadProgress> getUploadProgress(
            @Parameter(description = "Upload ID to check progress", required = true)
            @PathVariable String uploadId) {

        FileStorageService.UploadProgress progress = fileStorageService.getUploadProgress(uploadId);
        if (progress == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(progress);
    }
}