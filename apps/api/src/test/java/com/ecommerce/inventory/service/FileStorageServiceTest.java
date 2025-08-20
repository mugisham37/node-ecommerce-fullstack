package com.ecommerce.inventory.service;

import com.ecommerce.inventory.config.FileStorageProperties;
import com.ecommerce.inventory.dto.request.FileUploadRequest;
import com.ecommerce.inventory.dto.response.FileUploadResponse;
import com.ecommerce.inventory.exception.FileValidationException;
import com.ecommerce.inventory.service.storage.LocalStorageBackend;
import com.ecommerce.inventory.service.storage.S3StorageBackend;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock
    private FileValidationService fileValidationService;

    @Mock
    private FileNamingService fileNamingService;

    @Mock
    private LocalStorageBackend localStorageBackend;

    @Mock
    private S3StorageBackend s3StorageBackend;

    private FileStorageProperties fileStorageProperties;
    private FileStorageService fileStorageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        fileStorageProperties = new FileStorageProperties();
        fileStorageProperties.setDir(tempDir.toString());
        fileStorageProperties.setAllowedTypes(List.of("jpg", "jpeg", "png", "gif", "pdf"));
        fileStorageProperties.setMaxFileSize("10MB");

        fileStorageService = new FileStorageService(
            fileStorageProperties,
            fileValidationService,
            fileNamingService,
            localStorageBackend,
            s3StorageBackend
        );
    }

    @Test
    void uploadFile_Success() throws Exception {
        // Arrange
        MultipartFile file = new MockMultipartFile(
            "test.jpg",
            "test.jpg",
            "image/jpeg",
            "test image content".getBytes()
        );

        FileUploadRequest request = FileUploadRequest.builder()
            .file(file)
            .category("product")
            .entityId(1L)
            .description("Test image")
            .build();

        String generatedFileName = "product_1_20240101_120000_abc123.jpg";
        String directory = "product/20240101";
        String storedPath = directory + "/" + generatedFileName;

        when(fileNamingService.generateFileName(anyString(), anyString(), any()))
            .thenReturn(generatedFileName);
        when(fileNamingService.generateDirectoryPath(anyString(), any()))
            .thenReturn(directory);
        when(localStorageBackend.store(any(), anyString(), anyString()))
            .thenReturn(storedPath);
        when(localStorageBackend.getFileUrl(anyString()))
            .thenReturn("/api/v1/files/" + storedPath);
        when(fileValidationService.generateFileHash(any()))
            .thenReturn("abc123hash");

        // Act
        FileUploadResponse response = fileStorageService.uploadFile(request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getFileName()).isEqualTo(generatedFileName);
        assertThat(response.getOriginalFileName()).isEqualTo("test.jpg");
        assertThat(response.getContentType()).isEqualTo("image/jpeg");
        assertThat(response.getFileSize()).isEqualTo(file.getSize());
        assertThat(response.getFileHash()).isEqualTo("abc123hash");
        assertThat(response.getUploadedAt()).isNotNull();

        verify(fileValidationService).validateFile(file);
        verify(localStorageBackend).store(file, generatedFileName, directory);
    }

    @Test
    void uploadFile_ValidationFails() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
            "test.exe",
            "test.exe",
            "application/octet-stream",
            "malicious content".getBytes()
        );

        FileUploadRequest request = FileUploadRequest.builder()
            .file(file)
            .build();

        doThrow(new FileValidationException("File type not allowed"))
            .when(fileValidationService).validateFile(file);

        // Act & Assert
        assertThatThrownBy(() -> fileStorageService.uploadFile(request))
            .isInstanceOf(FileValidationException.class)
            .hasMessage("File type not allowed");

        verify(fileValidationService).validateFile(file);
        verifyNoInteractions(localStorageBackend);
    }

    @Test
    void getAllowedFileTypes_ReturnsConfiguredTypes() {
        // Act
        List<String> allowedTypes = fileStorageService.getAllowedFileTypes();

        // Assert
        assertThat(allowedTypes).containsExactly("jpg", "jpeg", "png", "gif", "pdf");
    }

    @Test
    void validateFileSize_ValidFile() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
            "test.jpg",
            "test.jpg",
            "image/jpeg",
            "small content".getBytes()
        );

        // Act
        boolean isValid = fileStorageService.validateFileSize(file);

        // Assert
        assertThat(isValid).isTrue();
        verify(fileValidationService).validateFile(file);
    }

    @Test
    void validateFileSize_InvalidFile() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
            "test.jpg",
            "test.jpg",
            "image/jpeg",
            "content".getBytes()
        );

        doThrow(new FileValidationException("File too large"))
            .when(fileValidationService).validateFile(file);

        // Act
        boolean isValid = fileStorageService.validateFileSize(file);

        // Assert
        assertThat(isValid).isFalse();
        verify(fileValidationService).validateFile(file);
    }

    @Test
    void fileExists_ReturnsTrue() {
        // Arrange
        String fileName = "test.jpg";
        when(localStorageBackend.exists(fileName)).thenReturn(true);

        // Act
        boolean exists = fileStorageService.fileExists(fileName);

        // Assert
        assertThat(exists).isTrue();
        verify(localStorageBackend).exists(fileName);
    }

    @Test
    void generateSecureFileName_CallsNamingService() {
        // Arrange
        String originalFileName = "test.jpg";
        String secureFileName = "secure_20240101_120000_abc123.jpg";
        when(fileNamingService.generateSecureFileName(originalFileName))
            .thenReturn(secureFileName);

        // Act
        String result = fileStorageService.generateSecureFileName(originalFileName);

        // Assert
        assertThat(result).isEqualTo(secureFileName);
        verify(fileNamingService).generateSecureFileName(originalFileName);
    }
}