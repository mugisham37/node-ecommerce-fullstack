package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.response.FileUploadResponse;
import com.ecommerce.inventory.exception.FileStorageException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImageProcessingServiceTest {

    @Mock
    private FileNamingService fileNamingService;

    private ImageProcessingService imageProcessingService;

    @BeforeEach
    void setUp() {
        imageProcessingService = new ImageProcessingService(fileNamingService);
    }

    @Test
    void processImage_ValidImageFile_ReturnsProcessedVariants() throws IOException {
        // Arrange
        BufferedImage testImage = createTestImage(800, 600);
        byte[] imageBytes = imageToBytes(testImage, "jpeg");
        
        MultipartFile file = new MockMultipartFile(
            "test.jpg",
            "test.jpg",
            "image/jpeg",
            imageBytes
        );

        // Act
        Map<String, byte[]> processedImages = imageProcessingService.processImage(file);

        // Assert
        assertThat(processedImages).isNotEmpty();
        assertThat(processedImages).containsKeys("thumbnail", "small", "medium", "large", "original");
        
        // Verify that each variant has content
        for (Map.Entry<String, byte[]> entry : processedImages.entrySet()) {
            assertThat(entry.getValue()).isNotEmpty();
        }
    }

    @Test
    void processImage_NonImageFile_ThrowsException() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
            "test.txt",
            "test.txt",
            "text/plain",
            "not an image".getBytes()
        );

        // Act & Assert
        assertThatThrownBy(() -> imageProcessingService.processImage(file))
            .isInstanceOf(FileStorageException.class)
            .hasMessage("File is not a valid image");
    }

    @Test
    void extractImageMetadata_ValidImageFile_ReturnsMetadata() throws IOException {
        // Arrange
        BufferedImage testImage = createTestImage(400, 300);
        byte[] imageBytes = imageToBytes(testImage, "jpeg");
        
        MultipartFile file = new MockMultipartFile(
            "test.jpg",
            "test.jpg",
            "image/jpeg",
            imageBytes
        );

        // Act
        FileUploadResponse.FileMetadata metadata = imageProcessingService.extractImageMetadata(file);

        // Assert
        assertThat(metadata).isNotNull();
        assertThat(metadata.getIsImage()).isTrue();
        assertThat(metadata.getWidth()).isEqualTo(400);
        assertThat(metadata.getHeight()).isEqualTo(300);
        assertThat(metadata.getFormat()).isEqualTo("jpeg");
    }

    @Test
    void extractImageMetadata_NonImageFile_ReturnsBasicMetadata() throws IOException {
        // Arrange
        MultipartFile file = new MockMultipartFile(
            "test.pdf",
            "test.pdf",
            "application/pdf",
            "pdf content".getBytes()
        );

        // Act
        FileUploadResponse.FileMetadata metadata = imageProcessingService.extractImageMetadata(file);

        // Assert
        assertThat(metadata).isNotNull();
        assertThat(metadata.getIsImage()).isFalse();
        assertThat(metadata.getFormat()).isEqualTo("pdf");
        assertThat(metadata.getWidth()).isNull();
        assertThat(metadata.getHeight()).isNull();
    }

    @Test
    void resizeImage_ValidDimensions_ResizesCorrectly() {
        // Arrange
        BufferedImage originalImage = createTestImage(800, 600);
        Dimension targetSize = new Dimension(400, 300);

        // Act
        BufferedImage resizedImage = imageProcessingService.resizeImage(originalImage, targetSize);

        // Assert
        assertThat(resizedImage).isNotNull();
        // The actual size might be different due to aspect ratio preservation
        assertThat(resizedImage.getWidth()).isLessThanOrEqualTo(400);
        assertThat(resizedImage.getHeight()).isLessThanOrEqualTo(300);
    }

    @Test
    void resizeImage_ZeroDimensions_ReturnsOriginal() {
        // Arrange
        BufferedImage originalImage = createTestImage(800, 600);
        Dimension targetSize = new Dimension(0, 0);

        // Act
        BufferedImage result = imageProcessingService.resizeImage(originalImage, targetSize);

        // Assert
        assertThat(result).isSameAs(originalImage);
    }

    @Test
    void optimizeImage_ValidImage_ReturnsOptimized() {
        // Arrange
        BufferedImage originalImage = createTestImage(400, 300);

        // Act
        BufferedImage optimizedImage = imageProcessingService.optimizeImage(originalImage);

        // Assert
        assertThat(optimizedImage).isNotNull();
        assertThat(optimizedImage.getWidth()).isEqualTo(400);
        assertThat(optimizedImage.getHeight()).isEqualTo(300);
        assertThat(optimizedImage.getType()).isEqualTo(BufferedImage.TYPE_INT_RGB);
    }

    @Test
    void convertFormat_ToPNG_ConvertsCorrectly() {
        // Arrange
        BufferedImage originalImage = createTestImage(200, 150);

        // Act
        BufferedImage convertedImage = imageProcessingService.convertFormat(originalImage, "png");

        // Assert
        assertThat(convertedImage).isNotNull();
        assertThat(convertedImage.getType()).isEqualTo(BufferedImage.TYPE_INT_ARGB);
    }

    @Test
    void convertFormat_ToJPEG_ConvertsCorrectly() {
        // Arrange
        BufferedImage originalImage = createTestImage(200, 150);

        // Act
        BufferedImage convertedImage = imageProcessingService.convertFormat(originalImage, "jpeg");

        // Assert
        assertThat(convertedImage).isNotNull();
        assertThat(convertedImage.getType()).isEqualTo(BufferedImage.TYPE_INT_RGB);
    }

    @Test
    void compressImage_ValidParameters_CompressesSuccessfully() throws IOException {
        // Arrange
        BufferedImage testImage = createTestImage(300, 200);
        float quality = 0.8f;

        // Act
        byte[] compressedBytes = imageProcessingService.compressImage(testImage, "jpeg", quality);

        // Assert
        assertThat(compressedBytes).isNotEmpty();
    }

    @Test
    void generateVariantFileName_CallsNamingService() {
        // Arrange
        String originalFileName = "test.jpg";
        String variant = "thumbnail";
        String expectedVariantName = "test_thumbnail.jpg";
        
        when(fileNamingService.generateVariantFileName(originalFileName, variant))
            .thenReturn(expectedVariantName);

        // Act
        String result = imageProcessingService.generateVariantFileName(originalFileName, variant);

        // Assert
        assertThat(result).isEqualTo(expectedVariantName);
    }

    private BufferedImage createTestImage(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = image.createGraphics();
        
        // Create a simple test pattern
        g2d.setColor(Color.BLUE);
        g2d.fillRect(0, 0, width, height);
        g2d.setColor(Color.WHITE);
        g2d.fillOval(width/4, height/4, width/2, height/2);
        
        g2d.dispose();
        return image;
    }

    private byte[] imageToBytes(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        return baos.toByteArray();
    }
}