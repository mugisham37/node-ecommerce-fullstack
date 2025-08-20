package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.service.FileAccessLogService;
import com.ecommerce.inventory.service.FileCleanupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/files/security")
@RequiredArgsConstructor
@Tag(name = "File Security", description = "File security and access control operations")
public class FileSecurityController {

    private final FileAccessLogService fileAccessLogService;
    private final FileCleanupService fileCleanupService;

    @GetMapping("/access-logs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get recent file access logs", description = "Retrieve recent file access logs for security monitoring")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Access logs retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Admin access required")
    })
    public ResponseEntity<List<FileAccessLogService.FileAccessLog>> getRecentAccessLogs(
            @Parameter(description = "Maximum number of logs to retrieve")
            @RequestParam(value = "limit", defaultValue = "100") int limit) {

        List<FileAccessLogService.FileAccessLog> logs = fileAccessLogService.getRecentAccessLogs(limit);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/access-logs/user/{userId}")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Get access logs for a specific user", description = "Retrieve file access logs for a specific user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User access logs retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Manager access required")
    })
    public ResponseEntity<List<FileAccessLogService.FileAccessLog>> getUserAccessLogs(
            @Parameter(description = "User ID", required = true)
            @PathVariable Long userId,
            
            @Parameter(description = "Maximum number of logs to retrieve")
            @RequestParam(value = "limit", defaultValue = "50") int limit) {

        List<FileAccessLogService.FileAccessLog> logs = fileAccessLogService.getAccessLogsForUser(userId, limit);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/access-logs/file/{fileName:.+}")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Get access logs for a specific file", description = "Retrieve access logs for a specific file")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "File access logs retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Manager access required")
    })
    public ResponseEntity<List<FileAccessLogService.FileAccessLog>> getFileAccessLogs(
            @Parameter(description = "File name", required = true)
            @PathVariable String fileName,
            
            @Parameter(description = "Maximum number of logs to retrieve")
            @RequestParam(value = "limit", defaultValue = "50") int limit) {

        List<FileAccessLogService.FileAccessLog> logs = fileAccessLogService.getAccessLogsForFile(fileName, limit);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/access-logs/failed")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get failed access attempts", description = "Retrieve failed file access attempts for security monitoring")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Failed access attempts retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Admin access required")
    })
    public ResponseEntity<List<FileAccessLogService.FileAccessLog>> getFailedAccessAttempts(
            @Parameter(description = "Maximum number of logs to retrieve")
            @RequestParam(value = "limit", defaultValue = "100") int limit) {

        List<FileAccessLogService.FileAccessLog> logs = fileAccessLogService.getFailedAccessAttempts(limit);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/stats/file/{fileName:.+}")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Get file access statistics", description = "Get access statistics for a specific file")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "File statistics retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Manager access required")
    })
    public ResponseEntity<FileAccessStats> getFileAccessStats(
            @Parameter(description = "File name", required = true)
            @PathVariable String fileName) {

        long accessCount = fileAccessLogService.getAccessCount(fileName);
        long failedCount = fileAccessLogService.getFailedAccessCount(fileName);
        
        FileAccessStats stats = new FileAccessStats(fileName, accessCount, failedCount);
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/cleanup/orphaned")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Clean up orphaned files", description = "Remove orphaned files that are no longer referenced")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Cleanup completed successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Admin access required")
    })
    public ResponseEntity<FileCleanupService.CleanupResult> cleanupOrphanedFiles() {
        log.info("Manual cleanup of orphaned files initiated");
        FileCleanupService.CleanupResult result = fileCleanupService.cleanupOrphanedFiles();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/cleanup/old")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Clean up old files", description = "Remove files older than specified number of days")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Cleanup completed successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Admin access required")
    })
    public ResponseEntity<FileCleanupService.CleanupResult> cleanupOldFiles(
            @Parameter(description = "Number of days old", required = true)
            @RequestParam("daysOld") int daysOld) {

        log.info("Manual cleanup of files older than {} days initiated", daysOld);
        FileCleanupService.CleanupResult result = fileCleanupService.cleanupOldFiles(daysOld);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/storage/stats")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Get storage statistics", description = "Get overall storage usage statistics")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Storage statistics retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Manager access required")
    })
    public ResponseEntity<FileCleanupService.StorageStats> getStorageStats() {
        FileCleanupService.StorageStats stats = fileCleanupService.getStorageStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/storage/large-files")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Find large files", description = "Find files larger than specified size")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Large files found successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Manager access required")
    })
    public ResponseEntity<List<FileCleanupService.FileInfo>> findLargeFiles(
            @Parameter(description = "Minimum file size in bytes")
            @RequestParam(value = "minSize", defaultValue = "10485760") long minSizeBytes) { // Default 10MB

        List<FileCleanupService.FileInfo> largeFiles = fileCleanupService.findLargeFiles(minSizeBytes);
        return ResponseEntity.ok(largeFiles);
    }

    // DTO for file access statistics
    public record FileAccessStats(
        String fileName,
        long accessCount,
        long failedAccessCount
    ) {}
}