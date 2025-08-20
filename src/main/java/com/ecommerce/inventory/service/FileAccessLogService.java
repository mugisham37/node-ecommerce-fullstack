package com.ecommerce.inventory.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileAccessLogService {

    // In-memory storage for demonstration - in production, use database
    private final ConcurrentLinkedQueue<FileAccessLog> accessLogs = new ConcurrentLinkedQueue<>();
    
    public void logFileAccess(Long userId, String userEmail, String fileName, 
                             String operation, boolean success, String ipAddress) {
        
        FileAccessLog logEntry = new FileAccessLog(
            System.currentTimeMillis(),
            LocalDateTime.now(),
            userId,
            userEmail,
            fileName,
            operation,
            success,
            ipAddress
        );
        
        accessLogs.offer(logEntry);
        
        // Log to application logs
        if (success) {
            log.info("File access granted - User: {}, File: {}, Operation: {}, IP: {}", 
                userEmail, fileName, operation, ipAddress);
        } else {
            log.warn("File access denied - User: {}, File: {}, Operation: {}, IP: {}", 
                userEmail, fileName, operation, ipAddress);
        }
        
        // Keep only recent logs in memory (last 10000 entries)
        while (accessLogs.size() > 10000) {
            accessLogs.poll();
        }
    }

    public List<FileAccessLog> getRecentAccessLogs(int limit) {
        return accessLogs.stream()
            .sorted((a, b) -> b.timestamp().compareTo(a.timestamp()))
            .limit(limit)
            .toList();
    }

    public List<FileAccessLog> getAccessLogsForUser(Long userId, int limit) {
        return accessLogs.stream()
            .filter(log -> log.userId().equals(userId))
            .sorted((a, b) -> b.timestamp().compareTo(a.timestamp()))
            .limit(limit)
            .toList();
    }

    public List<FileAccessLog> getAccessLogsForFile(String fileName, int limit) {
        return accessLogs.stream()
            .filter(log -> log.fileName().equals(fileName))
            .sorted((a, b) -> b.timestamp().compareTo(a.timestamp()))
            .limit(limit)
            .toList();
    }

    public List<FileAccessLog> getFailedAccessAttempts(int limit) {
        return accessLogs.stream()
            .filter(log -> !log.success())
            .sorted((a, b) -> b.timestamp().compareTo(a.timestamp()))
            .limit(limit)
            .toList();
    }

    public long getAccessCount(String fileName) {
        return accessLogs.stream()
            .filter(log -> log.fileName().equals(fileName) && log.success())
            .count();
    }

    public long getFailedAccessCount(String fileName) {
        return accessLogs.stream()
            .filter(log -> log.fileName().equals(fileName) && !log.success())
            .count();
    }

    // Record class for file access log entries
    public record FileAccessLog(
        Long id,
        LocalDateTime timestamp,
        Long userId,
        String userEmail,
        String fileName,
        String operation,
        boolean success,
        String ipAddress
    ) {}
}