package com.ecommerce.inventory.controller;

import com.ecommerce.inventory.dto.request.LoginRequest;
import com.ecommerce.inventory.dto.request.RefreshTokenRequest;
import com.ecommerce.inventory.dto.response.JwtAuthenticationResponse;
import com.ecommerce.inventory.dto.versioning.ApiVersion;
import com.ecommerce.inventory.dto.versioning.ApiVersionCompatibility;
import com.ecommerce.inventory.entity.User;
import com.ecommerce.inventory.repository.UserRepository;
import com.ecommerce.inventory.security.JwtTokenProvider;
import com.ecommerce.inventory.security.UserPrincipal;
import com.ecommerce.inventory.service.UserActivityService;
import com.ecommerce.inventory.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Authentication Controller
 * Handles user authentication, token refresh, and logout operations
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Authentication management APIs")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserService userService;

    @Autowired
    private UserActivityService userActivityService;

    @Autowired
    private UserRepository userRepository;

    /**
     * User login endpoint
     */
    @PostMapping("/login")
    @ApiVersion("1.0")
    @Operation(
        summary = "User Authentication",
        description = """
            Authenticate a user with email and password credentials and return JWT tokens.
            
            **Authentication Flow:**
            1. Validates user credentials against the database
            2. Checks if the account is active and not locked
            3. Generates access token (expires in 30 minutes) and refresh token (expires in 7 days)
            4. Logs the login activity for security auditing
            5. Updates the user's last login timestamp
            
            **Security Features:**
            - Account lockout after 5 failed attempts (locked for 30 minutes)
            - IP address and user agent tracking
            - Comprehensive activity logging
            - Password strength validation
            
            **Rate Limiting:** 10 requests per minute per IP address
            """,
        tags = {"Authentication"}
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Authentication successful",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = JwtAuthenticationResponse.class),
                examples = @ExampleObject(
                    name = "Successful Login",
                    summary = "Successful authentication response",
                    value = """
                        {
                            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                            "tokenType": "Bearer",
                            "expiresIn": 1800,
                            "user": {
                                "id": 1,
                                "email": "admin@inventory.com",
                                "firstName": "Admin",
                                "lastName": "User",
                                "fullName": "Admin User",
                                "role": "ADMIN"
                            }
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid request data",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Validation Error",
                    summary = "Request validation failed",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 400,
                            "error": "Bad Request",
                            "message": "Validation failed",
                            "path": "/api/v1/auth/login",
                            "details": {
                                "email": "Email is required",
                                "password": "Password must be at least 8 characters"
                            }
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Authentication failed",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Invalid Credentials",
                    summary = "Invalid email or password",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 401,
                            "error": "Unauthorized",
                            "message": "Invalid email or password",
                            "path": "/api/v1/auth/login"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "423",
            description = "Account locked",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Account Locked",
                    summary = "Account temporarily locked",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 423,
                            "error": "Locked",
                            "message": "Account is temporarily locked due to multiple failed login attempts",
                            "path": "/api/v1/auth/login"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "429",
            description = "Too many requests",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Rate Limited",
                    summary = "Rate limit exceeded",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 429,
                            "error": "Too Many Requests",
                            "message": "Rate limit exceeded. Try again later.",
                            "path": "/api/v1/auth/login"
                        }
                        """
                )
            )
        )
    })
    public ResponseEntity<JwtAuthenticationResponse> login(
        @Parameter(
            description = "User login credentials",
            required = true,
            schema = @Schema(implementation = LoginRequest.class),
            example = """
                {
                    "email": "admin@inventory.com",
                    "password": "SecurePass123!"
                }
                """
        )
        @Valid @RequestBody LoginRequest loginRequest, 
        HttpServletRequest request) {
        logger.info("Login attempt for user: {}", loginRequest.getEmail());
        
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        try {
            // Check if account is locked
            if (userService.isAccountLocked(loginRequest.getEmail())) {
                logger.warn("Login attempt for locked account: {}", loginRequest.getEmail());
                
                // Log failed login attempt for locked account
                userRepository.findByEmail(loginRequest.getEmail()).ifPresent(user -> 
                    userActivityService.logLoginActivity(user, false, ipAddress, userAgent));
                
                throw new LockedException("Account is temporarily locked due to multiple failed login attempts");
            }

            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getEmail(),
                    loginRequest.getPassword()
                )
            );

            // Generate tokens
            String accessToken = tokenProvider.generateAccessToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(authentication);

            // Update last login
            userService.handleSuccessfulLogin(loginRequest.getEmail());

            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            // Log successful login activity
            User user = userRepository.findById(userPrincipal.getId()).orElse(null);
            if (user != null) {
                userActivityService.logLoginActivity(user, true, ipAddress, userAgent);
            }
            
            JwtAuthenticationResponse response = new JwtAuthenticationResponse(
                accessToken,
                refreshToken,
                "Bearer",
                userPrincipal.getId(),
                userPrincipal.getEmail(),
                userPrincipal.getFullName(),
                userPrincipal.getRole()
            );

            logger.info("Successful login for user: {}", loginRequest.getEmail());
            return ResponseEntity.ok(response);

        } catch (BadCredentialsException ex) {
            logger.warn("Failed login attempt for user: {} - Invalid credentials", loginRequest.getEmail());
            userService.handleFailedLogin(loginRequest.getEmail());
            
            // Log failed login activity
            userRepository.findByEmail(loginRequest.getEmail()).ifPresent(user -> 
                userActivityService.logLoginActivity(user, false, ipAddress, userAgent));
            
            throw new BadCredentialsException("Invalid email or password");
        } catch (DisabledException ex) {
            logger.warn("Failed login attempt for disabled user: {}", loginRequest.getEmail());
            
            // Log failed login activity for disabled user
            userRepository.findByEmail(loginRequest.getEmail()).ifPresent(user -> 
                userActivityService.logLoginActivity(user, false, ipAddress, userAgent));
            
            throw new DisabledException("User account is disabled");
        } catch (LockedException ex) {
            logger.warn("Failed login attempt for locked user: {}", loginRequest.getEmail());
            throw ex;
        } catch (Exception ex) {
            logger.error("Login error for user: {}", loginRequest.getEmail(), ex);
            
            // Log failed login activity for general error
            userRepository.findByEmail(loginRequest.getEmail()).ifPresent(user -> 
                userActivityService.logLoginActivity(user, false, ipAddress, userAgent));
            
            throw new RuntimeException("Authentication failed");
        }
    }

    /**
     * Refresh token endpoint
     */
    @PostMapping("/refresh")
    @ApiVersion("1.0")
    @Operation(
        summary = "Refresh Access Token",
        description = """
            Generate a new access token using a valid refresh token.
            
            **Token Refresh Flow:**
            1. Validates the provided refresh token
            2. Extracts user information from the refresh token
            3. Generates a new access token with fresh expiration
            4. Returns the new access token while keeping the same refresh token
            5. Logs the token refresh activity
            
            **Security Notes:**
            - Refresh tokens are long-lived (7 days) compared to access tokens (30 minutes)
            - Only valid, non-expired refresh tokens can be used
            - Each refresh operation is logged for security auditing
            
            **Use Case:** Call this endpoint when your access token expires to get a new one without requiring the user to log in again.
            """,
        tags = {"Authentication"}
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Token refresh successful",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = JwtAuthenticationResponse.class),
                examples = @ExampleObject(
                    name = "Successful Token Refresh",
                    summary = "New access token generated",
                    value = """
                        {
                            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_TOKEN...",
                            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SAME_REFRESH_TOKEN...",
                            "tokenType": "Bearer",
                            "expiresIn": 1800,
                            "user": {
                                "id": 1,
                                "email": "admin@inventory.com",
                                "firstName": "Admin",
                                "lastName": "User",
                                "fullName": "Admin User",
                                "role": "ADMIN"
                            }
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Invalid or expired refresh token",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Invalid Refresh Token",
                    summary = "Refresh token is invalid or expired",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 401,
                            "error": "Unauthorized",
                            "message": "Invalid refresh token",
                            "path": "/api/v1/auth/refresh"
                        }
                        """
                )
            )
        )
    })
    public ResponseEntity<JwtAuthenticationResponse> refreshToken(
        @Parameter(
            description = "Refresh token request containing the refresh token",
            required = true,
            schema = @Schema(implementation = RefreshTokenRequest.class),
            example = """
                {
                    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                }
                """
        )
        @Valid @RequestBody RefreshTokenRequest refreshRequest) {
        String refreshToken = refreshRequest.getRefreshToken();
        
        logger.info("Token refresh attempt");

        try {
            // Validate refresh token
            if (!tokenProvider.validateToken(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
                logger.warn("Invalid refresh token provided");
                throw new BadCredentialsException("Invalid refresh token");
            }

            // Extract user information from refresh token
            UserPrincipal userPrincipal = tokenProvider.getUserPrincipalFromToken(refreshToken);

            // Generate new access token
            String newAccessToken = tokenProvider.generateAccessToken(userPrincipal);

            // Log token refresh activity
            userActivityService.logActivity(UserActivityService.ActivityActions.TOKEN_REFRESHED, "TOKEN", "refresh", 
                "Token refreshed successfully");

            JwtAuthenticationResponse response = new JwtAuthenticationResponse(
                newAccessToken,
                refreshToken, // Keep the same refresh token
                "Bearer",
                userPrincipal.getId(),
                userPrincipal.getEmail(),
                userPrincipal.getFullName(),
                userPrincipal.getRole()
            );

            logger.info("Successful token refresh for user: {}", userPrincipal.getEmail());
            return ResponseEntity.ok(response);

        } catch (Exception ex) {
            logger.error("Token refresh error", ex);
            userActivityService.logFailedActivity(UserActivityService.ActivityActions.TOKEN_REFRESHED, "TOKEN", "refresh", 
                "Token refresh failed: " + ex.getMessage());
            throw new BadCredentialsException("Invalid refresh token");
        }
    }

    /**
     * Logout endpoint
     */
    @PostMapping("/logout")
    @ApiVersion("1.0")
    @Operation(
        summary = "User Logout",
        description = """
            Logout the current authenticated user and invalidate their session.
            
            **Logout Process:**
            1. Retrieves the current user from the security context
            2. Logs the logout activity for security auditing
            3. Clears the security context
            4. Returns a success confirmation
            
            **Security Notes:**
            - In production, tokens should be added to a blacklist/revocation list
            - Revoked tokens should be stored in Redis with expiration
            - The JWT filter should check the blacklist for each request
            
            **Authentication Required:** Yes - Bearer token in Authorization header
            """,
        tags = {"Authentication"}
    )
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Logout successful",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Successful Logout",
                    summary = "User logged out successfully",
                    value = """
                        {
                            "message": "Successfully logged out",
                            "timestamp": "1705329000000"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Unauthorized - Invalid or missing token",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Unauthorized",
                    summary = "Authentication required",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 401,
                            "error": "Unauthorized",
                            "message": "Full authentication is required to access this resource",
                            "path": "/api/v1/auth/logout"
                        }
                        """
                )
            )
        )
    })
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        // Get current user from security context
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            logger.info("User logout: {}", userPrincipal.getEmail());
            
            // Log logout activity
            userActivityService.logActivity(UserActivityService.ActivityActions.LOGOUT, "USER", 
                userPrincipal.getId().toString(), "User logged out successfully");
        }

        // Clear security context
        SecurityContextHolder.clearContext();

        // In a production system, you would typically:
        // 1. Add the token to a blacklist/revocation list
        // 2. Store revoked tokens in Redis with expiration
        // 3. Check blacklist in JwtAuthenticationFilter

        Map<String, String> response = new HashMap<>();
        response.put("message", "Successfully logged out");
        response.put("timestamp", String.valueOf(System.currentTimeMillis()));

        return ResponseEntity.ok(response);
    }

    /**
     * Get current user information
     */
    @GetMapping("/me")
    @ApiVersion("1.0")
    @Operation(
        summary = "Get Current User Profile",
        description = """
            Retrieve the profile information of the currently authenticated user.
            
            **Response Information:**
            - User ID and basic profile information
            - Email address and full name
            - Assigned role and authorities
            - Account status and permissions
            
            **Authentication Required:** Yes - Bearer token in Authorization header
            
            **Use Case:** Get user information for profile display, role-based UI rendering, and permission checks.
            """,
        tags = {"Authentication"}
    )
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "User information retrieved successfully",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Current User Info",
                    summary = "Current authenticated user information",
                    value = """
                        {
                            "id": 1,
                            "email": "admin@inventory.com",
                            "firstName": "Admin",
                            "lastName": "User",
                            "fullName": "Admin User",
                            "role": "ADMIN",
                            "authorities": [
                                {
                                    "authority": "ROLE_ADMIN"
                                }
                            ]
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Unauthorized - Invalid or missing token",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(
                    name = "Unauthorized",
                    summary = "Authentication required",
                    value = """
                        {
                            "timestamp": "2024-01-15T14:30:00",
                            "status": 401,
                            "error": "Unauthorized",
                            "message": "Full authentication is required to access this resource",
                            "path": "/api/v1/auth/me"
                        }
                        """
                )
            )
        )
    })
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", userPrincipal.getId());
            response.put("email", userPrincipal.getEmail());
            response.put("firstName", userPrincipal.getFirstName());
            response.put("lastName", userPrincipal.getLastName());
            response.put("fullName", userPrincipal.getFullName());
            response.put("role", userPrincipal.getRole());
            response.put("authorities", userPrincipal.getAuthorities());
            
            return ResponseEntity.ok(response);
        }
        
        throw new RuntimeException("User not authenticated");
    }

    /**
     * Validate token endpoint
     */
    @PostMapping("/validate")
    @ApiVersion("1.0")
    @Operation(
        summary = "Validate JWT Token",
        description = """
            Validate a JWT token and return its information and validity status.
            
            **Validation Process:**
            1. Checks token format and signature
            2. Verifies token expiration
            3. Extracts user information from valid tokens
            4. Returns validation status and token details
            
            **Use Cases:**
            - Client-side token validation before API calls
            - Token introspection for debugging
            - Microservice token verification
            - Session management validation
            
            **Security Notes:**
            - This endpoint does not require authentication
            - Invalid tokens return validation failure without error
            - Token details are only returned for valid tokens
            """,
        tags = {"Authentication"}
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Token validation completed",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = {
                    @ExampleObject(
                        name = "Valid Token",
                        summary = "Token is valid and active",
                        value = """
                            {
                                "valid": true,
                                "userId": 1,
                                "email": "admin@inventory.com",
                                "role": "ADMIN",
                                "tokenType": "access",
                                "expiresAt": "2024-01-15T15:00:00Z"
                            }
                            """
                    ),
                    @ExampleObject(
                        name = "Invalid Token",
                        summary = "Token is invalid or expired",
                        value = """
                            {
                                "valid": false,
                                "message": "Invalid or expired token"
                            }
                            """
                    )
                }
            )
        )
    })
    public ResponseEntity<Map<String, Object>> validateToken(
        @Parameter(
            description = "Token validation request",
            required = true,
            example = """
                {
                    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                }
                """
        )
        @RequestBody Map<String, String> request) {
        String token = request.get("token");
        
        Map<String, Object> response = new HashMap<>();
        
        if (token != null && tokenProvider.validateToken(token)) {
            UserPrincipal userPrincipal = tokenProvider.getUserPrincipalFromToken(token);
            
            response.put("valid", true);
            response.put("userId", userPrincipal.getId());
            response.put("email", userPrincipal.getEmail());
            response.put("role", userPrincipal.getRole());
            response.put("tokenType", tokenProvider.isAccessToken(token) ? "access" : "refresh");
            response.put("expiresAt", tokenProvider.getExpirationDateFromToken(token));
        } else {
            response.put("valid", false);
            response.put("message", "Invalid or expired token");
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get client IP address from request
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}