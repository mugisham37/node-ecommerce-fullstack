package com.ecommerce.inventory.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadRequest {
    @NotNull(message = "File is required")
    private MultipartFile file;
    
    private String description;
    private String category;
    private Long entityId; // For associating with products, etc.
    private String entityType; // "product", "category", etc.
}