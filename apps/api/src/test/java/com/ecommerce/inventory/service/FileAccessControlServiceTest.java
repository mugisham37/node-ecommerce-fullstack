package com.ecommerce.inventory.service;

import com.ecommerce.inventory.entity.Role;
import com.ecommerce.inventory.entity.User;
import com.ecommerce.inventory.exception.FileStorageException;
import com.ecommerce.inventory.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileAccessControlServiceTest {

    @Mock
    private FileAccessLogService fileAccessLogService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    private FileAccessControlService fileAccessControlService;

    @BeforeEach
    void setUp() {
        fileAccessControlService = new FileAccessControlService(fileAccessLogService);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void canAccessFile_AdminUser_ReturnsTrue() {
        // Arrange
        User adminUser = createUser(1L, "admin@test.com", Role.ADMIN);
        UserPrincipal userPrincipal = new UserPrincipal(adminUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canAccess = fileAccessControlService.canAccessFile("test.jpg", "read");

        // Assert
        assertThat(canAccess).isTrue();
        verify(fileAccessLogService).logFileAccess(eq(1L), eq("admin@test.com"), 
            eq("test.jpg"), eq("read"), eq(true), anyString());
    }

    @Test
    void canAccessFile_ManagerUser_ReturnsTrue() {
        // Arrange
        User managerUser = createUser(2L, "manager@test.com", Role.MANAGER);
        UserPrincipal userPrincipal = new UserPrincipal(managerUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canAccess = fileAccessControlService.canAccessFile("test.jpg", "read");

        // Assert
        assertThat(canAccess).isTrue();
        verify(fileAccessLogService).logFileAccess(eq(2L), eq("manager@test.com"), 
            eq("test.jpg"), eq("read"), eq(true), anyString());
    }

    @Test
    void canAccessFile_EmployeeUser_ReturnsTrue() {
        // Arrange
        User employeeUser = createUser(3L, "employee@test.com", Role.EMPLOYEE);
        UserPrincipal userPrincipal = new UserPrincipal(employeeUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canAccess = fileAccessControlService.canAccessFile("test.jpg", "read");

        // Assert
        assertThat(canAccess).isTrue();
        verify(fileAccessLogService).logFileAccess(eq(3L), eq("employee@test.com"), 
            eq("test.jpg"), eq("read"), eq(true), anyString());
    }

    @Test
    void canAccessFile_UnauthenticatedUser_ReturnsFalse() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(null);

        // Act
        boolean canAccess = fileAccessControlService.canAccessFile("test.jpg", "read");

        // Assert
        assertThat(canAccess).isFalse();
        verifyNoInteractions(fileAccessLogService);
    }

    @Test
    void canUploadFile_AdminUser_ReturnsTrue() {
        // Arrange
        User adminUser = createUser(1L, "admin@test.com", Role.ADMIN);
        UserPrincipal userPrincipal = new UserPrincipal(adminUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canUpload = fileAccessControlService.canUploadFile("product", 1L);

        // Assert
        assertThat(canUpload).isTrue();
    }

    @Test
    void canUploadFile_EmployeeWithValidCategory_ReturnsTrue() {
        // Arrange
        User employeeUser = createUser(3L, "employee@test.com", Role.EMPLOYEE);
        UserPrincipal userPrincipal = new UserPrincipal(employeeUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canUpload = fileAccessControlService.canUploadFile("product", 1L);

        // Assert
        assertThat(canUpload).isTrue();
    }

    @Test
    void canUploadFile_EmployeeWithInvalidCategory_ReturnsFalse() {
        // Arrange
        User employeeUser = createUser(3L, "employee@test.com", Role.EMPLOYEE);
        UserPrincipal userPrincipal = new UserPrincipal(employeeUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canUpload = fileAccessControlService.canUploadFile("restricted", 1L);

        // Assert
        assertThat(canUpload).isFalse();
    }

    @Test
    void canDeleteFile_AdminUser_ReturnsTrue() {
        // Arrange
        User adminUser = createUser(1L, "admin@test.com", Role.ADMIN);
        UserPrincipal userPrincipal = new UserPrincipal(adminUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canDelete = fileAccessControlService.canDeleteFile("test.jpg");

        // Assert
        assertThat(canDelete).isTrue();
    }

    @Test
    void canDeleteFile_ManagerUser_ReturnsTrue() {
        // Arrange
        User managerUser = createUser(2L, "manager@test.com", Role.MANAGER);
        UserPrincipal userPrincipal = new UserPrincipal(managerUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canDelete = fileAccessControlService.canDeleteFile("test.jpg");

        // Assert
        assertThat(canDelete).isTrue();
    }

    @Test
    void canDeleteFile_EmployeeUser_ReturnsFalse() {
        // Arrange
        User employeeUser = createUser(3L, "employee@test.com", Role.EMPLOYEE);
        UserPrincipal userPrincipal = new UserPrincipal(employeeUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act
        boolean canDelete = fileAccessControlService.canDeleteFile("test.jpg");

        // Assert
        assertThat(canDelete).isFalse();
    }

    @Test
    void validateFileAccess_AccessDenied_ThrowsException() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(null);

        // Act & Assert
        assertThatThrownBy(() -> fileAccessControlService.validateFileAccess("test.jpg", "read"))
            .isInstanceOf(FileStorageException.class)
            .hasMessage("Access denied to file: test.jpg");
    }

    @Test
    void validateUploadPermission_PermissionDenied_ThrowsException() {
        // Arrange
        User employeeUser = createUser(3L, "employee@test.com", Role.EMPLOYEE);
        UserPrincipal userPrincipal = new UserPrincipal(employeeUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act & Assert
        assertThatThrownBy(() -> fileAccessControlService.validateUploadPermission("restricted", 1L))
            .isInstanceOf(FileStorageException.class)
            .hasMessage("Upload permission denied for category: restricted");
    }

    @Test
    void validateDeletePermission_PermissionDenied_ThrowsException() {
        // Arrange
        User employeeUser = createUser(3L, "employee@test.com", Role.EMPLOYEE);
        UserPrincipal userPrincipal = new UserPrincipal(employeeUser);
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        // Act & Assert
        assertThatThrownBy(() -> fileAccessControlService.validateDeletePermission("test.jpg"))
            .isInstanceOf(FileStorageException.class)
            .hasMessage("Delete permission denied for file: test.jpg");
    }

    private User createUser(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setRole(role);
        user.setFirstName("Test");
        user.setLastName("User");
        user.setActive(true);
        return user;
    }
}