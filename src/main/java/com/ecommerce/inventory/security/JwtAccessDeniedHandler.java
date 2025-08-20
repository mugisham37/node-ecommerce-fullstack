package com.ecommerce.inventory.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom JWT Access Denied Handler
 * Handles authorization failures and returns structured error responses
 */
@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    private static final Logger logger = LoggerFactory.getLogger(JwtAccessDeniedHandler.class);

    @Override
    public void handle(HttpServletRequest request,
                      HttpServletResponse response,
                      AccessDeniedException accessDeniedException) throws IOException, ServletException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth != null) {
            logger.warn("User '{}' attempted to access the protected URL: {}", 
                       auth.getName(), request.getRequestURI());
        }

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);

        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpServletResponse.SC_FORBIDDEN);
        body.put("error", "Access Denied");
        body.put("message", "You don't have permission to access this resource");
        body.put("path", request.getRequestURI());
        body.put("timestamp", LocalDateTime.now().toString());

        // Add user context if available
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) auth.getPrincipal();
            body.put("user", userPrincipal.getEmail());
            body.put("userRole", userPrincipal.getRole());
            body.put("details", String.format("User with role '%s' cannot access this resource", 
                                            userPrincipal.getRole()));
        } else {
            body.put("details", "Insufficient privileges to access this resource");
        }

        final ObjectMapper mapper = new ObjectMapper();
        mapper.writeValue(response.getOutputStream(), body);
    }
}