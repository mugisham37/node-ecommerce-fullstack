package com.ecommerce.inventory.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.multipart.MultipartResolver;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
@EnableConfigurationProperties(FileStorageProperties.class)
public class FileStorageConfig {

    private final FileStorageProperties fileStorageProperties;

    public FileStorageConfig(FileStorageProperties fileStorageProperties) {
        this.fileStorageProperties = fileStorageProperties;
        initializeUploadDirectory();
    }

    @Bean
    public MultipartResolver multipartResolver() {
        return new StandardServletMultipartResolver();
    }

    private void initializeUploadDirectory() {
        try {
            Path uploadPath = Paths.get(fileStorageProperties.getDir()).toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (Exception ex) {
            throw new RuntimeException("Could not create upload directory!", ex);
        }
    }
}