package com.ecommerce.inventory.logging;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * Filter to generate and propagate correlation IDs for request tracing
 */
@Component
@Order(1)
public class CorrelationIdFilter implements Filter {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String CORRELATION_ID_MDC_KEY = "correlationId";
    private static final String REQUEST_ID_MDC_KEY = "requestId";
    private static final String USER_ID_MDC_KEY = "userId";
    private static final String SESSION_ID_MDC_KEY = "sessionId";
    private static final String HTTP_METHOD_MDC_KEY = "httpMethod";
    private static final String HTTP_URL_MDC_KEY = "httpUrl";
    private static final String CLIENT_IP_MDC_KEY = "clientIp";
    private static final String USER_AGENT_MDC_KEY = "userAgent";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        try {
            // Generate or extract correlation ID
            String correlationId = extractOrGenerateCorrelationId(httpRequest);
            String requestId = extractOrGenerateRequestId(httpRequest);

            // Set correlation ID in MDC for logging
            MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
            MDC.put(REQUEST_ID_MDC_KEY, requestId);

            // Add HTTP request context
            MDC.put(HTTP_METHOD_MDC_KEY, httpRequest.getMethod());
            MDC.put(HTTP_URL_MDC_KEY, getFullURL(httpRequest));
            MDC.put(CLIENT_IP_MDC_KEY, getClientIpAddress(httpRequest));
            
            String userAgent = httpRequest.getHeader("User-Agent");
            if (userAgent != null) {
                MDC.put(USER_AGENT_MDC_KEY, userAgent);
            }

            // Add session ID if available
            if (httpRequest.getSession(false) != null) {
                MDC.put(SESSION_ID_MDC_KEY, httpRequest.getSession().getId());
            }

            // Add correlation ID to response headers
            httpResponse.setHeader(CORRELATION_ID_HEADER, correlationId);
            httpResponse.setHeader(REQUEST_ID_HEADER, requestId);

            // Continue with the filter chain
            chain.doFilter(request, response);

        } finally {
            // Clean up MDC to prevent memory leaks
            MDC.clear();
        }
    }

    private String extractOrGenerateCorrelationId(HttpServletRequest request) {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.trim().isEmpty()) {
            correlationId = generateUUID();
        }
        return correlationId;
    }

    private String extractOrGenerateRequestId(HttpServletRequest request) {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.trim().isEmpty()) {
            requestId = generateUUID();
        }
        return requestId;
    }

    private String generateUUID() {
        return UUID.randomUUID().toString();
    }

    private String getFullURL(HttpServletRequest request) {
        StringBuilder requestURL = new StringBuilder(request.getRequestURL().toString());
        String queryString = request.getQueryString();

        if (queryString == null) {
            return requestURL.toString();
        } else {
            return requestURL.append('?').append(queryString).toString();
        }
    }

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