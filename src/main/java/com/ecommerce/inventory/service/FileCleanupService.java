package com.ecommerce.inventory.service;

import com.ecommerce.inventory.config.FileStorageProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileCleanupService {

    private final FileStorageProperties fileStorageProperties;
    private final FileStorageService fileStorageService;

    @Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
    public void performDailyCleanup() {
        log.info("Starting daily file cleanup process");
        
        try {
            CleanupResult result = cleanupOrphanedFiles();
            log.info("Daily cleanup completed - Files removed: {}, Space freed: {} bytes", 
                result.filesRemoved(), result.spaceFreed());
        } catch (Exception ex) {
            log.error("Daily cleanup failed", ex);
        }
    }

    public CleanupResult cleanupOrphanedFiles() {
        Path uploadPath = Paths.get(fileStorageProperties.getDir()).toAbsolutePath().normalize();
        
        if (!Files.exists(uploadPath)) {
            log.warn("Upload directory does not exist: {}", uploadPath);
            return new CleanupResult(0, 0L, new ArrayList<>());
        }

        List<String> removedFiles = new ArrayList<>();
        AtomicLong totalSpaceFreed = new AtomicLong(0);
        AtomicLong filesRemoved = new AtomicLong(0);

        try {
            Files.walkFileTree(uploadPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (isOrphanedFile(file, attrs)) {
                        long fileSize = attrs.size();
                        String relativePath = uploadPath.relativize(file).toString().replace("\\", "/");
                        
                        try {
                            Files.delete(file);
                            removedFiles.add(relativePath);
                            totalSpaceFreed.addAndGet(fileSize);
                            filesRemoved.incrementAndGet();
                            
                            log.debug("Removed orphaned file: {} (size: {} bytes)", relativePath, fileSize);
                        } catch (IOException ex) {
                            log.error("Failed to delete orphaned file: {}", relativePath, ex);
                        }
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                    log.error("Failed to visit file: {}", file, exc);
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException ex) {
            log.error("Error during file cleanup", ex);
        }

        return new CleanupResult(filesRemoved.get(), totalSpaceFreed.get(), removedFiles);
    }

    public CleanupResult cleanupOldFiles(int daysOld) {
        Path uploadPath = Paths.get(fileStorageProperties.getDir()).toAbsolutePath().normalize();
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysOld);
        
        List<String> removedFiles = new ArrayList<>();
        AtomicLong totalSpaceFreed = new AtomicLong(0);
        AtomicLong filesRemoved = new AtomicLong(0);

        try {
            Files.walkFileTree(uploadPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    LocalDateTime fileTime = LocalDateTime.ofInstant(
                        attrs.lastModifiedTime().toInstant(), 
                        ZoneId.systemDefault()
                    );
                    
                    if (fileTime.isBefore(cutoffDate)) {
                        long fileSize = attrs.size();
                        String relativePath = uploadPath.relativize(file).toString().replace("\\", "/");
                        
                        try {
                            Files.delete(file);
                            removedFiles.add(relativePath);
                            totalSpaceFreed.addAndGet(fileSize);
                            filesRemoved.incrementAndGet();
                            
                            log.debug("Removed old file: {} (modified: {})", relativePath, fileTime);
                        } catch (IOException ex) {
                            log.error("Failed to delete old file: {}", relativePath, ex);
                        }
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException ex) {
            log.error("Error during old file cleanup", ex);
        }

        return new CleanupResult(filesRemoved.get(), totalSpaceFreed.get(), removedFiles);
    }

    public List<FileInfo> findLargeFiles(long minSizeBytes) {
        Path uploadPath = Paths.get(fileStorageProperties.getDir()).toAbsolutePath().normalize();
        List<FileInfo> largeFiles = new ArrayList<>();

        try {
            Files.walkFileTree(uploadPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (attrs.size() >= minSizeBytes) {
                        String relativePath = uploadPath.relativize(file).toString().replace("\\", "/");
                        LocalDateTime modifiedTime = LocalDateTime.ofInstant(
                            attrs.lastModifiedTime().toInstant(), 
                            ZoneId.systemDefault()
                        );
                        
                        largeFiles.add(new FileInfo(
                            relativePath,
                            attrs.size(),
                            modifiedTime,
                            attrs.isRegularFile()
                        ));
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException ex) {
            log.error("Error finding large files", ex);
        }

        return largeFiles.stream()
            .sorted((a, b) -> Long.compare(b.size(), a.size()))
            .toList();
    }

    public StorageStats getStorageStatistics() {
        Path uploadPath = Paths.get(fileStorageProperties.getDir()).toAbsolutePath().normalize();
        
        AtomicLong totalFiles = new AtomicLong(0);
        AtomicLong totalSize = new AtomicLong(0);
        AtomicLong imageFiles = new AtomicLong(0);
        AtomicLong documentFiles = new AtomicLong(0);

        try {
            Files.walkFileTree(uploadPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (attrs.isRegularFile()) {
                        totalFiles.incrementAndGet();
                        totalSize.addAndGet(attrs.size());
                        
                        String fileName = file.getFileName().toString().toLowerCase();
                        if (fileName.matches(".*\\.(jpg|jpeg|png|gif|bmp|webp)$")) {
                            imageFiles.incrementAndGet();
                        } else if (fileName.matches(".*\\.(pdf|doc|docx|xls|xlsx|txt)$")) {
                            documentFiles.incrementAndGet();
                        }
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException ex) {
            log.error("Error calculating storage statistics", ex);
        }

        return new StorageStats(
            totalFiles.get(),
            totalSize.get(),
            imageFiles.get(),
            documentFiles.get(),
            uploadPath.toString()
        );
    }

    private boolean isOrphanedFile(Path file, BasicFileAttributes attrs) {
        // Simple orphan detection - files older than 30 days that are not referenced
        // In a real system, you would check database references
        
        LocalDateTime fileTime = LocalDateTime.ofInstant(
            attrs.lastModifiedTime().toInstant(), 
            ZoneId.systemDefault()
        );
        
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30);
        
        // For now, consider files older than 30 days as potentially orphaned
        // You should implement proper reference checking here
        return fileTime.isBefore(cutoffDate) && !isSystemFile(file);
    }

    private boolean isSystemFile(Path file) {
        String fileName = file.getFileName().toString().toLowerCase();
        // Don't delete system files or hidden files
        return fileName.startsWith(".") || fileName.equals("readme.txt");
    }

    // Record classes for return types
    public record CleanupResult(
        long filesRemoved,
        long spaceFreed,
        List<String> removedFiles
    ) {}

    public record FileInfo(
        String path,
        long size,
        LocalDateTime lastModified,
        boolean isRegularFile
    ) {}

    public record StorageStats(
        long totalFiles,
        long totalSize,
        long imageFiles,
        long documentFiles,
        String storagePath
    ) {}
}