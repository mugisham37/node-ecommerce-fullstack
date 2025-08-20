package com.ecommerce.inventory.dto.response;

import com.ecommerce.inventory.entity.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response DTO for user information
 */
@Data
@Builder
public class UserResponse {
    
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private Role role;
    private String roleDescription;
    private Boolean active;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}