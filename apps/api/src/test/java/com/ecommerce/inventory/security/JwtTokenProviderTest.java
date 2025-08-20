package com.ecommerce.inventory.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private UserPrincipal userPrincipal;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        // Initialize with test values
        String jwtSecret = "myTestSecretKey123456789012345678901234567890";
        int jwtExpiration = 1800000; // 30 minutes
        int refreshExpiration = 604800000; // 7 days

        jwtTokenProvider = new JwtTokenProvider(jwtSecret, jwtExpiration, refreshExpiration);

        userPrincipal = UserPrincipal.builder()
                .id(1L)
                .email("test@example.com")
                .firstName("John")
                .lastName("Doe")
                .role("ADMIN")
                .active(true)
                .build();

        authentication = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
    }

    @Test
    void shouldGenerateAccessToken() {
        String token = jwtTokenProvider.generateAccessToken(authentication);

        assertNotNull(token);
        assertTrue(token.length() > 0);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertTrue(jwtTokenProvider.isAccessToken(token));
        assertFalse(jwtTokenProvider.isRefreshToken(token));
    }

    @Test
    void shouldGenerateRefreshToken() {
        String token = jwtTokenProvider.generateRefreshToken(authentication);

        assertNotNull(token);
        assertTrue(token.length() > 0);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertTrue(jwtTokenProvider.isRefreshToken(token));
        assertFalse(jwtTokenProvider.isAccessToken(token));
    }

    @Test
    void shouldExtractUserIdFromToken() {
        String token = jwtTokenProvider.generateAccessToken(authentication);
        Long userId = jwtTokenProvider.getUserIdFromToken(token);

        assertEquals(userPrincipal.getId(), userId);
    }

    @Test
    void shouldExtractUserPrincipalFromToken() {
        String token = jwtTokenProvider.generateAccessToken(authentication);
        UserPrincipal extractedPrincipal = jwtTokenProvider.getUserPrincipalFromToken(token);

        assertEquals(userPrincipal.getId(), extractedPrincipal.getId());
        assertEquals(userPrincipal.getEmail(), extractedPrincipal.getEmail());
        assertEquals(userPrincipal.getRole(), extractedPrincipal.getRole());
    }

    @Test
    void shouldGetExpirationDateFromToken() {
        String token = jwtTokenProvider.generateAccessToken(authentication);
        Date expirationDate = jwtTokenProvider.getExpirationDateFromToken(token);

        assertNotNull(expirationDate);
        assertTrue(expirationDate.after(new Date()));
    }

    @Test
    void shouldValidateValidToken() {
        String token = jwtTokenProvider.generateAccessToken(authentication);
        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    void shouldRejectInvalidToken() {
        String invalidToken = "invalid.token.here";
        assertFalse(jwtTokenProvider.validateToken(invalidToken));
    }

    @Test
    void shouldRejectNullToken() {
        assertFalse(jwtTokenProvider.validateToken(null));
    }

    @Test
    void shouldRejectEmptyToken() {
        assertFalse(jwtTokenProvider.validateToken(""));
    }

    @Test
    void shouldDetectTokenExpiration() {
        // Create a token provider with very short expiration for testing
        JwtTokenProvider shortExpirationProvider = new JwtTokenProvider(
                "myTestSecretKey123456789012345678901234567890",
                1, // 1 millisecond
                1000
        );

        String token = shortExpirationProvider.generateAccessToken(authentication);

        // Wait for token to expire
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        assertTrue(shortExpirationProvider.isTokenExpired(token));
    }

    @Test
    void shouldCalculateRemainingTime() {
        String token = jwtTokenProvider.generateAccessToken(authentication);
        long remainingTime = jwtTokenProvider.getTokenRemainingTime(token);

        assertTrue(remainingTime > 0);
        assertTrue(remainingTime <= 1800000); // Should be less than or equal to 30 minutes
    }

    @Test
    void shouldGenerateTokenFromUserPrincipalDirectly() {
        String accessToken = jwtTokenProvider.generateAccessToken(userPrincipal);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userPrincipal);

        assertNotNull(accessToken);
        assertNotNull(refreshToken);
        assertTrue(jwtTokenProvider.validateToken(accessToken));
        assertTrue(jwtTokenProvider.validateToken(refreshToken));
        assertTrue(jwtTokenProvider.isAccessToken(accessToken));
        assertTrue(jwtTokenProvider.isRefreshToken(refreshToken));
    }
}