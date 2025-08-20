package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.response.FileUploadResponse;
import com.ecommerce.inventory.exception.FileStorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.imgscalr.Scalr;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImageProcessingService {

    private final FileNamingService fileNamingService;

    // Standard image sizes for different use cases
    public static final Map<String, Dimension> IMAGE_SIZES = Map.of(
        "thumbnail", new Dimension(150, 150),
        "small", new Dimension(300, 300),
        "medium", new Dimension(600, 600),
        "large", new Dimension(1200, 1200),
        "original", new Dimension(0, 0) // Keep original size
    );

    public Map<String, byte[]> processImage(MultipartFile file) throws IOException {
        if (!isImageFile(file)) {
            throw new FileStorageException("File is not a valid image");
        }

        BufferedImage originalImage = ImageIO.read(file.getInputStream());
        if (originalImage == null) {
            throw new FileStorageException("Unable to read image file");
        }

        Map<String, byte[]> processedImages = new HashMap<>();
        String originalFileName = file.getOriginalFilename();

        // Process each size variant
        for (Map.Entry<String, Dimension> entry : IMAGE_SIZES.entrySet()) {
            String sizeName = entry.getKey();
            Dimension targetSize = entry.getValue();

            try {
                BufferedImage processedImage;
                if ("original".equals(sizeName)) {
                    processedImage = optimizeImage(originalImage);
                } else {
                    processedImage = resizeImage(originalImage, targetSize);
                }

                byte[] imageBytes = convertToBytes(processedImage, getImageFormat(originalFileName));
                processedImages.put(sizeName, imageBytes);

                log.debug("Processed image variant: {} ({}x{})", 
                    sizeName, processedImage.getWidth(), processedImage.getHeight());

            } catch (Exception ex) {
                log.error("Failed to process image variant: {}", sizeName, ex);
                // Continue processing other variants
            }
        }

        return processedImages;
    }

    public FileUploadResponse.FileMetadata extractImageMetadata(MultipartFile file) throws IOException {
        if (!isImageFile(file)) {
            return FileUploadResponse.FileMetadata.builder()
                .isImage(false)
                .format(getFileExtension(file.getOriginalFilename()))
                .build();
        }

        try (ImageInputStream iis = ImageIO.createImageInputStream(file.getInputStream())) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            
            if (readers.hasNext()) {
                ImageReader reader = readers.next();
                reader.setInput(iis);
                
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                String format = reader.getFormatName().toLowerCase();
                
                reader.dispose();
                
                return FileUploadResponse.FileMetadata.builder()
                    .width(width)
                    .height(height)
                    .format(format)
                    .isImage(true)
                    .build();
            }
        } catch (Exception ex) {
            log.error("Failed to extract image metadata", ex);
        }

        return FileUploadResponse.FileMetadata.builder()
            .isImage(true)
            .format(getFileExtension(file.getOriginalFilename()))
            .build();
    }

    public BufferedImage resizeImage(BufferedImage originalImage, Dimension targetSize) {
        int targetWidth = targetSize.width;
        int targetHeight = targetSize.height;

        // Calculate dimensions maintaining aspect ratio
        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();

        if (targetWidth == 0 && targetHeight == 0) {
            return originalImage; // No resizing needed
        }

        // Calculate the scaling factor to maintain aspect ratio
        double scaleX = (double) targetWidth / originalWidth;
        double scaleY = (double) targetHeight / originalHeight;
        double scale = Math.min(scaleX, scaleY);

        int newWidth = (int) (originalWidth * scale);
        int newHeight = (int) (originalHeight * scale);

        // Use Scalr for high-quality resizing
        return Scalr.resize(originalImage, Scalr.Method.QUALITY, 
            Scalr.Mode.FIT_EXACT, newWidth, newHeight);
    }

    public BufferedImage optimizeImage(BufferedImage image) {
        // Apply basic optimization techniques
        BufferedImage optimized = new BufferedImage(
            image.getWidth(), 
            image.getHeight(), 
            BufferedImage.TYPE_INT_RGB
        );

        Graphics2D g2d = optimized.createGraphics();
        
        // Set high-quality rendering hints
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        
        g2d.drawImage(image, 0, 0, null);
        g2d.dispose();

        return optimized;
    }

    public BufferedImage convertFormat(BufferedImage image, String targetFormat) {
        if ("png".equalsIgnoreCase(targetFormat)) {
            // PNG supports transparency
            BufferedImage converted = new BufferedImage(
                image.getWidth(), 
                image.getHeight(), 
                BufferedImage.TYPE_INT_ARGB
            );
            Graphics2D g2d = converted.createGraphics();
            g2d.drawImage(image, 0, 0, null);
            g2d.dispose();
            return converted;
        } else {
            // JPEG and other formats
            BufferedImage converted = new BufferedImage(
                image.getWidth(), 
                image.getHeight(), 
                BufferedImage.TYPE_INT_RGB
            );
            Graphics2D g2d = converted.createGraphics();
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, image.getWidth(), image.getHeight());
            g2d.drawImage(image, 0, 0, null);
            g2d.dispose();
            return converted;
        }
    }

    public byte[] compressImage(BufferedImage image, String format, float quality) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        
        if ("jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format)) {
            // Use JPEG compression with quality setting
            var writers = ImageIO.getImageWritersByFormatName("jpeg");
            if (writers.hasNext()) {
                var writer = writers.next();
                var writeParam = writer.getDefaultWriteParam();
                writeParam.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
                writeParam.setCompressionQuality(quality);
                
                try (var ios = ImageIO.createImageOutputStream(baos)) {
                    writer.setOutput(ios);
                    writer.write(null, new javax.imageio.IIOImage(image, null, null), writeParam);
                }
                writer.dispose();
            }
        } else {
            // Use default compression for other formats
            ImageIO.write(image, format, baos);
        }
        
        return baos.toByteArray();
    }

    public String generateVariantFileName(String originalFileName, String variant) {
        return fileNamingService.generateVariantFileName(originalFileName, variant);
    }

    private boolean isImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType != null && contentType.startsWith("image/");
    }

    private String getImageFormat(String fileName) {
        String extension = getFileExtension(fileName);
        return switch (extension.toLowerCase()) {
            case "jpg", "jpeg" -> "jpeg";
            case "png" -> "png";
            case "gif" -> "gif";
            default -> "jpeg"; // Default to JPEG
        };
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return "";
        }
        int lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : "";
    }

    private byte[] convertToBytes(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        return baos.toByteArray();
    }
}