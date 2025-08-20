package com.ecommerce.inventory.service.storage;

import com.ecommerce.inventory.config.FileStorageProperties;
import com.ecommerce.inventory.exception.FileStorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Slf4j
@Component
@RequiredArgsConstructor
public class LocalStorageBackend implements StorageBackend {

    private final FileStorageProperties fileStorageProperties;

    @Override
    public String store(MultipartFile file, String fileName, String directory) throws IOException {
        if (!StringUtils.hasText(fileName)) {
            throw new FileStorageException("Filename cannot be empty");
        }

        try {
            Path uploadPath = getUploadPath();
            Path directoryPath = uploadPath.resolve(directory).normalize();
            
            // Create directory if it doesn't exist
            if (!Files.exists(directoryPath)) {
                Files.createDirectories(directoryPath);
            }

            Path targetLocation = directoryPath.resolve(fileName).normalize();
            
            // Security check: ensure the file is stored within the upload directory
            if (!targetLocation.startsWith(uploadPath)) {
                throw new FileStorageException("Cannot store file outside upload directory");
            }

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Return relative path from upload directory
            String relativePath = uploadPath.relativize(targetLocation).toString().replace("\\", "/");
            log.info("File stored successfully: {}", relativePath);
            return relativePath;
            
        } catch (IOException ex) {
            throw new FileStorageException("Could not store file " + fileName, ex);
        }
    }

    @Override
    public Resource loadAsResource(String fileName) throws IOException {
        try {
            Path filePath = getUploadPath().resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new FileStorageException("File not found: " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new FileStorageException("File not found: " + fileName, ex);
        }
    }

    @Override
    public void delete(String fileName) throws IOException {
        try {
            Path filePath = getUploadPath().resolve(fileName).normalize();
            
            // Security check
            if (!filePath.startsWith(getUploadPath())) {
                throw new FileStorageException("Cannot delete file outside upload directory");
            }
            
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("File deleted successfully: {}", fileName);
            } else {
                log.warn("Attempted to delete non-existent file: {}", fileName);
            }
        } catch (IOException ex) {
            throw new FileStorageException("Could not delete file " + fileName, ex);
        }
    }

    @Override
    public boolean exists(String fileName) {
        try {
            Path filePath = getUploadPath().resolve(fileName).normalize();
            return Files.exists(filePath) && filePath.startsWith(getUploadPath());
        } catch (Exception ex) {
            log.error("Error checking file existence: {}", fileName, ex);
            return false;
        }
    }

    @Override
    public String getFileUrl(String fileName) {
        // For local storage, return a relative URL that will be handled by a controller
        return "/api/v1/files/" + fileName;
    }

    @Override
    public String getStorageType() {
        return "local";
    }

    private Path getUploadPath() {
        return Paths.get(fileStorageProperties.getDir()).toAbsolutePath().normalize();
    }
}