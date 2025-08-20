package com.ecommerce.inventory.config;

import com.ecommerce.inventory.security.CustomUserDetailsService;
import com.ecommerce.inventory.security.JwtAccessDeniedHandler;
import com.ecommerce.inventory.security.JwtAuthenticationEntryPoint;
import com.ecommerce.inventory.security.JwtAuthenticationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired
    private SecurityConfig securityConfig;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @MockBean
    private JwtAccessDeniedHandler jwtAccessDeniedHandler;

    @Test
    void contextLoads() {
        assertNotNull(securityConfig);
    }

    @Test
    void shouldCreatePasswordEncoder() {
        PasswordEncoder passwordEncoder = securityConfig.passwordEncoder();
        
        assertNotNull(passwordEncoder);
        
        String rawPassword = "testPassword123";
        String encodedPassword = passwordEncoder.encode(rawPassword);
        
        assertNotNull(encodedPassword);
        assertNotEquals(rawPassword, encodedPassword);
        assertTrue(passwordEncoder.matches(rawPassword, encodedPassword));
    }

    @Test
    void shouldCreateJwtAuthenticationFilter() {
        JwtAuthenticationFilter filter = securityConfig.jwtAuthenticationFilter();
        
        assertNotNull(filter);
    }

    @Test
    void shouldCreateCorsConfigurationSource() {
        CorsConfigurationSource corsConfigurationSource = securityConfig.corsConfigurationSource();
        
        assertNotNull(corsConfigurationSource);
        
        // Test CORS configuration
        var corsConfig = corsConfigurationSource.getCorsConfiguration("/**");
        assertNotNull(corsConfig);
        assertTrue(corsConfig.getAllowedMethods().contains("GET"));
        assertTrue(corsConfig.getAllowedMethods().contains("POST"));
        assertTrue(corsConfig.getAllowedMethods().contains("PUT"));
        assertTrue(corsConfig.getAllowedMethods().contains("DELETE"));
        assertTrue(corsConfig.getAllowedHeaders().contains("Authorization"));
        assertTrue(corsConfig.getAllowedHeaders().contains("Content-Type"));
        assertTrue(corsConfig.getAllowCredentials());
    }

    @Test
    void shouldCreateAuthenticationProvider() {
        var authProvider = securityConfig.authenticationProvider();
        
        assertNotNull(authProvider);
    }
}