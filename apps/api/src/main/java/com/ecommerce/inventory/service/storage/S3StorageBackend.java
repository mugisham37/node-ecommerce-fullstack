package com.ecommerce.inventory.service.storage;

import com.ecommerce.inventory.config.FileStorageProperties;
import com.ecommerce.inventory.exception.FileStorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "file.upload.cloud-storage.enabled", havingValue = "true")
public class S3StorageBackend implements StorageBackend {

    private final FileStorageProperties fileStorageProperties;
    private S3Client s3Client;

    @PostConstruct
    public void initializeS3Client() {
        FileStorageProperties.CloudStorage cloudConfig = fileStorageProperties.getCloudStorage();
        
        if (!cloudConfig.isEnabled() || !"s3".equals(cloudConfig.getProvider())) {
            return;
        }

        try {
            AwsBasicCredentials credentials = AwsBasicCredentials.create(
                cloudConfig.getAccessKey(),
                cloudConfig.getSecretKey()
            );

            s3Client = S3Client.builder()
                .region(Region.of(cloudConfig.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();

            log.info("S3 client initialized successfully for bucket: {}", cloudConfig.getBucketName());
        } catch (Exception ex) {
            log.error("Failed to initialize S3 client", ex);
            throw new FileStorageException("Failed to initialize S3 storage", ex);
        }
    }

    @Override
    public String store(MultipartFile file, String fileName, String directory) throws IOException {
        if (s3Client == null) {
            throw new FileStorageException("S3 client not initialized");
        }

        if (!StringUtils.hasText(fileName)) {
            throw new FileStorageException("Filename cannot be empty");
        }

        try {
            String key = StringUtils.hasText(directory) ? directory + "/" + fileName : fileName;
            FileStorageProperties.CloudStorage cloudConfig = fileStorageProperties.getCloudStorage();

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(cloudConfig.getBucketName())
                .key(key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            
            log.info("File uploaded to S3 successfully: {}", key);
            return key;
            
        } catch (Exception ex) {
            throw new FileStorageException("Could not upload file to S3: " + fileName, ex);
        }
    }

    @Override
    public Resource loadAsResource(String fileName) throws IOException {
        try {
            String fileUrl = getFileUrl(fileName);
            Resource resource = new UrlResource(new URL(fileUrl));
            
            if (resource.exists()) {
                return resource;
            } else {
                throw new FileStorageException("File not found in S3: " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new FileStorageException("Invalid file URL: " + fileName, ex);
        }
    }

    @Override
    public void delete(String fileName) throws IOException {
        if (s3Client == null) {
            throw new FileStorageException("S3 client not initialized");
        }

        try {
            FileStorageProperties.CloudStorage cloudConfig = fileStorageProperties.getCloudStorage();
            
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(cloudConfig.getBucketName())
                .key(fileName)
                .build();

            s3Client.deleteObject(deleteObjectRequest);
            log.info("File deleted from S3 successfully: {}", fileName);
            
        } catch (Exception ex) {
            throw new FileStorageException("Could not delete file from S3: " + fileName, ex);
        }
    }

    @Override
    public boolean exists(String fileName) {
        if (s3Client == null) {
            return false;
        }

        try {
            FileStorageProperties.CloudStorage cloudConfig = fileStorageProperties.getCloudStorage();
            
            HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                .bucket(cloudConfig.getBucketName())
                .key(fileName)
                .build();

            s3Client.headObject(headObjectRequest);
            return true;
            
        } catch (NoSuchKeyException ex) {
            return false;
        } catch (Exception ex) {
            log.error("Error checking file existence in S3: {}", fileName, ex);
            return false;
        }
    }

    @Override
    public String getFileUrl(String fileName) {
        FileStorageProperties.CloudStorage cloudConfig = fileStorageProperties.getCloudStorage();
        
        if (StringUtils.hasText(cloudConfig.getEndpoint())) {
            return String.format("%s/%s/%s", cloudConfig.getEndpoint(), cloudConfig.getBucketName(), fileName);
        } else {
            return String.format("https://%s.s3.%s.amazonaws.com/%s", 
                cloudConfig.getBucketName(), cloudConfig.getRegion(), fileName);
        }
    }

    @Override
    public String getStorageType() {
        return "s3";
    }
}