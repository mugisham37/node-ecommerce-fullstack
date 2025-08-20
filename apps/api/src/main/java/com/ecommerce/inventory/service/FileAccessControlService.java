package com.ecommerce.inventory.service;

import com.ecommerce.inventory.entity.Role;
import com.ecommerce.inventory.entity.User;
import com.ecommerce.inventory.exception.FileStorageException;
import com.ecommerce.inventory.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileAccessControlService {

    private final FileAccessLogService fileAccessLogService;

    public boolean canAccessFile(String fileName, String operation) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("Unauthenticated access attempt to file: {}", fileName);
            return false;
        }

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userPrincipal.getUser();
        
        boolean hasAccess = checkFileAccess(user, fileName, operation);
        
        // Log the access attempt
        fileAccessLogService.logFileAccess(
            user.getId(),
            user.getEmail(),
            fileName,
            operation,
            hasAccess,
            getClientIpAddress()
        );
        
        return hasAccess;
    }

    public boolean canUploadFile(String category, Long entityId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userPrincipal.getUser();
        Role userRole = user.getRole();

        // Basic role-based upload permissions
        return switch (userRole) {
            case ADMIN -> true; // Admins can upload anything
            case MANAGER -> true; // Managers can upload anything
            case EMPLOYEE -> canEmployeeUpload(category, entityId); // Employees have limited upload rights
        };
    }

    public boolean canDeleteFile(String fileName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userPrincipal.getUser();
        Role userRole = user.getRole();

        // Only managers and admins can delete files
        boolean canDelete = userRole == Role.ADMIN || userRole == Role.MANAGER;
        
        if (canDelete) {
            log.info("File deletion authorized for user: {} ({}), file: {}", 
                user.getEmail(), userRole, fileName);
        } else {
            log.warn("File deletion denied for user: {} ({}), file: {}", 
                user.getEmail(), userRole, fileName);
        }
        
        return canDelete;
    }

    public void validateFileAccess(String fileName, String operation) {
        if (!canAccessFile(fileName, operation)) {
            throw new FileStorageException("Access denied to file: " + fileName);
        }
    }

    public void validateUploadPermission(String category, Long entityId) {
        if (!canUploadFile(category, entityId)) {
            throw new FileStorageException("Upload permission denied for category: " + category);
        }
    }

    public void validateDeletePermission(String fileName) {
        if (!canDeleteFile(fileName)) {
            throw new FileStorageException("Delete permission denied for file: " + fileName);
        }
    }

    private boolean checkFileAccess(User user, String fileName, String operation) {
        Role userRole = user.getRole();
        
        // Admin has access to everything
        if (userRole == Role.ADMIN) {
            return true;
        }
        
        // Check operation-specific permissions
        return switch (operation.toLowerCase()) {
            case "read", "view", "download" -> canReadFile(user, fileName);
            case "write", "upload" -> canWriteFile(user, fileName);
            case "delete" -> canDeleteFile(fileName);
            default -> false;
        };
    }

    private boolean canReadFile(User user, String fileName) {
        Role userRole = user.getRole();
        
        // All authenticated users can read files by default
        // You can implement more granular permissions here based on file categories
        return userRole == Role.ADMIN || userRole == Role.MANAGER || userRole == Role.EMPLOYEE;
    }

    private boolean canWriteFile(User user, String fileName) {
        Role userRole = user.getRole();
        
        // Employees and above can write files
        return userRole == Role.ADMIN || userRole == Role.MANAGER || userRole == Role.EMPLOYEE;
    }

    private boolean canEmployeeUpload(String category, Long entityId) {
        // Employees can upload files for products they have access to
        // This is a simplified implementation - in a real system, you might check
        // if the employee is assigned to work with specific products/categories
        
        if (!StringUtils.hasText(category)) {
            return false; // Employees must specify a category
        }
        
        // Allow uploads for common categories
        Set<String> allowedCategories = Set.of("product", "inventory", "general");
        return allowedCategories.contains(category.toLowerCase());
    }

    private String getClientIpAddress() {
        // In a real application, you would extract this from the HTTP request
        // For now, return a placeholder
        return "127.0.0.1";
    }
}