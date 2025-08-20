# Multi-stage build for optimized production image with security best practices

# Build stage
FROM eclipse-temurin:17-jdk-alpine AS builder

# Install build dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Copy Maven wrapper and pom.xml first for better layer caching
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make Maven wrapper executable
RUN chmod +x ./mvnw

# Download dependencies (cached layer if pom.xml doesn't change)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build the application with optimizations
RUN ./mvnw clean package -DskipTests -Dspring-boot.repackage.skip=false \
    && java -Djarmode=layertools -jar target/*.jar extract

# Production stage with minimal base image
FROM eclipse-temurin:17-jre-alpine

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    curl \
    dumb-init \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create application directory
WORKDIR /app

# Create non-root user and group with specific UID/GID for security
RUN addgroup -g 1001 -S appgroup \
    && adduser -u 1001 -S appuser -G appgroup

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads /app/temp \
    && chown -R appuser:appgroup /app \
    && chmod -R 755 /app

# Copy application layers from builder stage for better caching
COPY --from=builder --chown=appuser:appgroup /app/dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /app/spring-boot-loader/ ./
COPY --from=builder --chown=appuser:appgroup /app/snapshot-dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /app/application/ ./

# Switch to non-root user
USER appuser:appgroup

# Set environment variables for JVM optimization
ENV JAVA_OPTS="-XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:+UseG1GC \
    -XX:+UseStringDeduplication \
    -XX:+OptimizeStringConcat \
    -Djava.security.egd=file:/dev/./urandom \
    -Dspring.backgroundpreinitializer.ignore=true"

# Set Spring Boot specific environment variables
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8080

# Expose port
EXPOSE 8080

# Add labels for better container management
LABEL maintainer="inventory-team@company.com" \
      version="1.0.0" \
      description="E-Commerce Inventory Management System" \
      org.opencontainers.image.title="Inventory Management" \
      org.opencontainers.image.description="Production-ready inventory management system" \
      org.opencontainers.image.vendor="Company Name" \
      org.opencontainers.image.version="1.0.0"

# Health check with proper configuration
HEALTHCHECK --interval=30s \
    --timeout=10s \
    --start-period=90s \
    --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/actuator/health/readiness || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the application with optimized JVM settings
CMD ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.JarLauncher"]