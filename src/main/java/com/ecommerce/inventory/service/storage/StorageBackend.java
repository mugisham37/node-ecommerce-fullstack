package com.ecommerce.inventory.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;

public interface StorageBackend {
    
    /**
     * Store a file and return the stored file path
     */
    String store(MultipartFile file, String fileName, String directory) throws IOException;
    
    /**
     * Load a file as a Resource
     */
    Resource loadAsResource(String fileName) throws IOException;
    
    /**
     * Delete a file
     */
    void delete(String fileName) throws IOException;
    
    /**
     * Check if a file exists
     */
    boolean exists(String fileName);
    
    /**
     * Get the full URL for accessing the file
     */
    String getFileUrl(String fileName);
    
    /**
     * Get the storage type identifier
     */
    String getStorageType();
}