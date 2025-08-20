package com.ecommerce.inventory.service;

import com.ecommerce.inventory.dto.request.UserCreateRequest;
import com.ecommerce.inventory.dto.response.UserResponse;
import com.ecommerce.inventory.entity.Role;
import com.ecommerce.inventory.entity.User;
import com.ecommerce.inventory.exception.ResourceNotFoundException;
import com.ecommerce.inventory.exception.UserAlreadyExistsException;
import com.ecommerce.inventory.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UserCreateRequest createRequest;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("hashedPassword");
        testUser.setFirstName("John");
        testUser.setLastName("Doe");
        testUser.setRole(Role.EMPLOYEE);
        testUser.setActive(true);
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setUpdatedAt(LocalDateTime.now());

        createRequest = new UserCreateRequest();
        createRequest.setEmail("newuser@example.com");
        createRequest.setPassword("Password123!");
        createRequest.setFirstName("Jane");
        createRequest.setLastName("Smith");
        createRequest.setRole("MANAGER");
    }

    @Test
    void shouldCreateUserSuccessfully() {
        // Given
        when(userRepository.existsByEmail(createRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(createRequest.getPassword())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        UserResponse result = userService.createUser(createRequest);

        // Then
        assertNotNull(result);
        assertEquals(testUser.getId(), result.getId());
        assertEquals(testUser.getEmail(), result.getEmail());
        assertEquals(testUser.getFirstName(), result.getFirstName());
        assertEquals(testUser.getLastName(), result.getLastName());
        assertEquals(testUser.getRole().name(), result.getRole());

        verify(userRepository).existsByEmail(createRequest.getEmail());
        verify(passwordEncoder).encode(createRequest.getPassword());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void shouldThrowExceptionWhenUserAlreadyExists() {
        // Given
        when(userRepository.existsByEmail(createRequest.getEmail())).thenReturn(true);

        // When & Then
        assertThrows(UserAlreadyExistsException.class, () -> {
            userService.createUser(createRequest);
        });

        verify(userRepository).existsByEmail(createRequest.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldGetUserByIdSuccessfully() {
        // Given
        Long userId = 1L;
        when(userRepository.findByIdAndActiveTrue(userId)).thenReturn(Optional.of(testUser));

        // When
        UserResponse result = userService.getUserById(userId);

        // Then
        assertNotNull(result);
        assertEquals(testUser.getId(), result.getId());
        assertEquals(testUser.getEmail(), result.getEmail());

        verify(userRepository).findByIdAndActiveTrue(userId);
    }

    @Test
    void shouldThrowExceptionWhenUserNotFound() {
        // Given
        Long userId = 999L;
        when(userRepository.findByIdAndActiveTrue(userId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> {
            userService.getUserById(userId);
        });

        verify(userRepository).findByIdAndActiveTrue(userId);
    }

    @Test
    void shouldHandleSuccessfulLogin() {
        // Given
        String email = "test@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        userService.handleSuccessfulLogin(email);

        // Then
        verify(userRepository).findByEmail(email);
        verify(userRepository).save(testUser);
    }

    @Test
    void shouldHandleFailedLogin() {
        // Given
        String email = "test@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        userService.handleFailedLogin(email);

        // Then
        verify(userRepository).findByEmail(email);
        verify(userRepository).save(testUser);
    }

    @Test
    void shouldCheckAccountLocked() {
        // Given
        String email = "test@example.com";
        testUser.setAccountLockedUntil(LocalDateTime.now().plusMinutes(30));
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(testUser));

        // When
        boolean isLocked = userService.isAccountLocked(email);

        // Then
        assertTrue(isLocked);
        verify(userRepository).findByEmail(email);
    }

    @Test
    void shouldDeactivateUser() {
        // Given
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        userService.deactivateUser(userId);

        // Then
        assertFalse(testUser.getActive());
        verify(userRepository).findById(userId);
        verify(userRepository).save(testUser);
    }

    @Test
    void shouldActivateUser() {
        // Given
        Long userId = 1L;
        testUser.setActive(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        userService.activateUser(userId);

        // Then
        assertTrue(testUser.getActive());
        verify(userRepository).findById(userId);
        verify(userRepository).save(testUser);
    }
}