package com.ecommerce.inventory.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom JWT Authentication Entry Point
 * Handles authentication failures and returns structured error responses
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationEntryPoint.class);

    @Override
    public void commence(HttpServletRequest httpServletRequest,
                        HttpServletResponse httpServletResponse,
                        AuthenticationException ex) throws IOException, ServletException {
        
        logger.error("Responding with unauthorized error. Message - {}", ex.getMessage());

        httpServletResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
        httpServletResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpServletResponse.SC_UNAUTHORIZED);
        body.put("error", "Unauthorized");
        body.put("message", "Authentication required to access this resource");
        body.put("path", httpServletRequest.getRequestURI());
        body.put("timestamp", LocalDateTime.now().toString());

        // Add specific error details based on the exception type
        if (ex.getMessage().contains("JWT")) {
            body.put("details", "Invalid or expired JWT token");
        } else if (ex.getMessage().contains("credentials")) {
            body.put("details", "Invalid credentials provided");
        } else {
            body.put("details", "Authentication failed");
        }

        final ObjectMapper mapper = new ObjectMapper();
        mapper.writeValue(httpServletResponse.getOutputStream(), body);
    }
}