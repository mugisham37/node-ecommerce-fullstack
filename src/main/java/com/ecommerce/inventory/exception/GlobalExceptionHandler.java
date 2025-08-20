package com.ecommerce.inventory.exception;

import com.ecommerce.inventory.logging.StructuredLogger;
import com.ecommerce.inventory.logging.LoggingContext;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final StructuredLogger logger = StructuredLogger.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Resource Not Found")
            .message(ex.getMessage())
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logError("ResourceNotFoundException", "RESOURCE_NOT_FOUND", "RESOURCE_ACCESS", 
                HttpStatus.NOT_FOUND, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<ErrorResponse> handleFileStorage(FileStorageException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("File Storage Error")
            .message(ex.getMessage())
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logError("FileStorageException", "FILE_STORAGE_ERROR", "FILE_UPLOAD", 
                HttpStatus.INTERNAL_SERVER_ERROR, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(FileValidationException.class)
    public ResponseEntity<ErrorResponse> handleFileValidation(FileValidationException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("File Validation Error")
            .message(ex.getMessage())
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logError("FileValidationException", "FILE_VALIDATION_ERROR", "FILE_UPLOAD", 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.PAYLOAD_TOO_LARGE.value())
            .error("File Too Large")
            .message("File size exceeds maximum allowed size")
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logError("MaxUploadSizeExceededException", "FILE_SIZE_EXCEEDED", "FILE_UPLOAD", 
                HttpStatus.PAYLOAD_TOO_LARGE, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(error);
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientStock(InsufficientStockException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        Map<String, Object> details = new HashMap<>();
        details.put("errorId", errorId);
        
        // Add business context if available
        if (ex.getProductId() != null) {
            details.put("productId", ex.getProductId());
        }
        if (ex.getRequestedQuantity() != null) {
            details.put("requestedQuantity", ex.getRequestedQuantity());
        }
        if (ex.getAvailableQuantity() != null) {
            details.put("availableQuantity", ex.getAvailableQuantity());
        }
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Insufficient Stock")
            .message(ex.getMessage())
            .path(path)
            .details(details)
            .build();
        
        logError("InsufficientStockException", "INSUFFICIENT_STOCK", "INVENTORY_ALLOCATION", 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(InvalidOrderStatusTransitionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidOrderStatusTransition(InvalidOrderStatusTransitionException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        Map<String, Object> details = new HashMap<>();
        details.put("errorId", errorId);
        
        // Add business context if available
        if (ex.getCurrentStatus() != null) {
            details.put("currentStatus", ex.getCurrentStatus().toString());
        }
        if (ex.getTargetStatus() != null) {
            details.put("targetStatus", ex.getTargetStatus().toString());
        }
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Invalid Order Status Transition")
            .message(ex.getMessage())
            .path(path)
            .details(details)
            .build();
        
        logError("InvalidOrderStatusTransitionException", "INVALID_ORDER_STATUS", "ORDER_PROCESSING", 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleUserAlreadyExists(UserAlreadyExistsException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.CONFLICT.value())
            .error("User Already Exists")
            .message(ex.getMessage())
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logError("UserAlreadyExistsException", "USER_ALREADY_EXISTS", "USER_REGISTRATION", 
                HttpStatus.CONFLICT, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.FORBIDDEN.value())
            .error("Access Denied")
            .message("You don't have permission to access this resource")
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logSecurityError("AccessDeniedException", "ACCESS_DENIED", errorId, ex);
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleBusinessValidation(ValidationException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        Map<String, Object> details = new HashMap<>();
        details.put("errorId", errorId);
        details.put("errorCode", ex.getErrorCode());
        details.put("category", ex.getCategory());
        details.putAll(ex.getContext());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Business Validation Failed")
            .message(ex.getMessage())
            .path(path)
            .details(details)
            .build();
        
        logError("ValidationException", ex.getErrorCode(), ex.getCategory(), 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler({ProductNotFoundException.class, OrderNotFoundException.class, 
                      SupplierNotFoundException.class, CategoryNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleEntityNotFound(BusinessException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        Map<String, Object> details = new HashMap<>();
        details.put("errorId", errorId);
        details.put("errorCode", ex.getErrorCode());
        details.put("category", ex.getCategory());
        details.putAll(ex.getContext());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Entity Not Found")
            .message(ex.getMessage())
            .path(path)
            .details(details)
            .build();
        
        logError(ex.getClass().getSimpleName(), ex.getErrorCode(), ex.getCategory(), 
                HttpStatus.NOT_FOUND, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(InventoryOperationException.class)
    public ResponseEntity<ErrorResponse> handleInventoryOperation(InventoryOperationException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        Map<String, Object> details = new HashMap<>();
        details.put("errorId", errorId);
        details.put("errorCode", ex.getErrorCode());
        details.put("category", ex.getCategory());
        details.putAll(ex.getContext());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Inventory Operation Failed")
            .message(ex.getMessage())
            .path(path)
            .details(details)
            .build();
        
        logError("InventoryOperationException", ex.getErrorCode(), ex.getCategory(), 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        Map<String, Object> details = new HashMap<>();
        details.put("errorId", errorId);
        details.put("errorCode", ex.getErrorCode());
        details.put("category", ex.getCategory());
        details.putAll(ex.getContext());
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Business Rule Violation")
            .message(ex.getMessage())
            .path(path)
            .details(details)
            .build();
        
        logError("BusinessException", ex.getErrorCode(), ex.getCategory(), 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex, WebRequest request) {
        Map<String, Object> validationErrors = new HashMap<>();
        
        // Process field errors
        ex.getBindingResult().getFieldErrors().forEach((error) -> {
            String fieldName = error.getField();
            String errorMessage = error.getDefaultMessage();
            Object rejectedValue = error.getRejectedValue();
            
            Map<String, Object> fieldError = new HashMap<>();
            fieldError.put("message", errorMessage);
            fieldError.put("rejectedValue", rejectedValue);
            fieldError.put("code", error.getCode());
            
            validationErrors.put(fieldName, fieldError);
        });
        
        // Process global errors
        ex.getBindingResult().getGlobalErrors().forEach((error) -> {
            validationErrors.put(error.getObjectName(), Map.of(
                "message", error.getDefaultMessage(),
                "code", error.getCode()
            ));
        });

        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Validation Failed")
            .message("Input validation failed")
            .path(path)
            .details(Map.of(
                "errorId", errorId,
                "validationErrors", validationErrors,
                "errorCount", validationErrors.size()
            ))
            .build();
        
        logError("MethodArgumentNotValidException", "VALIDATION_FAILED", "INPUT_VALIDATION", 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, WebRequest request) {
        Map<String, Object> validationErrors = new HashMap<>();
        
        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
            String propertyPath = violation.getPropertyPath().toString();
            String message = violation.getMessage();
            Object invalidValue = violation.getInvalidValue();
            
            validationErrors.put(propertyPath, Map.of(
                "message", message,
                "invalidValue", invalidValue != null ? invalidValue.toString() : "null",
                "constraint", violation.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName()
            ));
        }

        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Constraint Violation")
            .message("Validation constraints were violated")
            .path(path)
            .details(Map.of(
                "errorId", errorId,
                "violations", validationErrors,
                "violationCount", validationErrors.size()
            ))
            .build();
        
        logError("ConstraintViolationException", "CONSTRAINT_VIOLATION", "VALIDATION", 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.UNAUTHORIZED.value())
            .error("Authentication Failed")
            .message("Invalid credentials provided")
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logSecurityError("BadCredentialsException", "AUTHENTICATION_FAILED", errorId, ex);
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(InsufficientAuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientAuthentication(InsufficientAuthenticationException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.UNAUTHORIZED.value())
            .error("Authentication Required")
            .message("Full authentication is required to access this resource")
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logSecurityError("InsufficientAuthenticationException", "INSUFFICIENT_AUTHENTICATION", errorId, ex);
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        String message = "Data integrity constraint violation";
        String errorCode = "DATA_INTEGRITY_VIOLATION";
        
        // Extract more specific information from the exception
        if (ex.getCause() != null) {
            String causeMessage = ex.getCause().getMessage();
            if (causeMessage != null) {
                if (causeMessage.contains("unique constraint") || causeMessage.contains("duplicate key")) {
                    message = "Duplicate entry detected";
                    errorCode = "DUPLICATE_ENTRY";
                } else if (causeMessage.contains("foreign key constraint")) {
                    message = "Referenced entity does not exist";
                    errorCode = "FOREIGN_KEY_VIOLATION";
                } else if (causeMessage.contains("not null constraint")) {
                    message = "Required field is missing";
                    errorCode = "NOT_NULL_VIOLATION";
                }
            }
        }
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.CONFLICT.value())
            .error("Data Integrity Violation")
            .message(message)
            .path(path)
            .details(Map.of("errorId", errorId, "errorCode", errorCode))
            .build();
        
        logError("DataIntegrityViolationException", errorCode, "DATABASE_OPERATION", 
                HttpStatus.CONFLICT, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.METHOD_NOT_ALLOWED.value())
            .error("Method Not Allowed")
            .message(String.format("HTTP method '%s' is not supported for this endpoint", ex.getMethod()))
            .path(path)
            .details(Map.of(
                "errorId", errorId,
                "method", ex.getMethod(),
                "supportedMethods", ex.getSupportedMethods()
            ))
            .build();
        
        logError("HttpRequestMethodNotSupportedException", "METHOD_NOT_ALLOWED", "HTTP_REQUEST", 
                HttpStatus.METHOD_NOT_ALLOWED, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE.value())
            .error("Unsupported Media Type")
            .message(String.format("Media type '%s' is not supported", ex.getContentType()))
            .path(path)
            .details(Map.of(
                "errorId", errorId,
                "contentType", ex.getContentType() != null ? ex.getContentType().toString() : "unknown",
                "supportedMediaTypes", ex.getSupportedMediaTypes()
            ))
            .build();
        
        logError("HttpMediaTypeNotSupportedException", "UNSUPPORTED_MEDIA_TYPE", "HTTP_REQUEST", 
                HttpStatus.UNSUPPORTED_MEDIA_TYPE, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(error);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMessageNotReadable(HttpMessageNotReadableException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        String message = "Malformed JSON request";
        if (ex.getCause() != null && ex.getCause().getMessage() != null) {
            String causeMessage = ex.getCause().getMessage();
            if (causeMessage.contains("JSON parse error")) {
                message = "Invalid JSON format";
            } else if (causeMessage.contains("Cannot deserialize")) {
                message = "Invalid data format in request";
            }
        }
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Malformed Request")
            .message(message)
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logError("HttpMessageNotReadableException", "MALFORMED_REQUEST", "HTTP_REQUEST", 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Missing Parameter")
            .message(String.format("Required parameter '%s' is missing", ex.getParameterName()))
            .path(path)
            .details(Map.of(
                "errorId", errorId,
                "parameterName", ex.getParameterName(),
                "parameterType", ex.getParameterType()
            ))
            .build();
        
        logError("MissingServletRequestParameterException", "MISSING_PARAMETER", "HTTP_REQUEST", 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Type Mismatch")
            .message(String.format("Parameter '%s' should be of type %s", 
                    ex.getName(), ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown"))
            .path(path)
            .details(Map.of(
                "errorId", errorId,
                "parameterName", ex.getName(),
                "providedValue", ex.getValue() != null ? ex.getValue().toString() : "null",
                "requiredType", ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown"
            ))
            .build();
        
        logError("MethodArgumentTypeMismatchException", "TYPE_MISMATCH", "HTTP_REQUEST", 
                HttpStatus.BAD_REQUEST, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandlerFound(NoHandlerFoundException ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Endpoint Not Found")
            .message(String.format("No handler found for %s %s", ex.getHttpMethod(), ex.getRequestURL()))
            .path(path)
            .details(Map.of(
                "errorId", errorId,
                "httpMethod", ex.getHttpMethod(),
                "requestURL", ex.getRequestURL()
            ))
            .build();
        
        logError("NoHandlerFoundException", "ENDPOINT_NOT_FOUND", "HTTP_REQUEST", 
                HttpStatus.NOT_FOUND, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, WebRequest request) {
        String path = extractPath(request);
        String errorId = generateErrorId();
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("An unexpected error occurred")
            .path(path)
            .details(Map.of("errorId", errorId))
            .build();
        
        logError("Exception", "INTERNAL_SERVER_ERROR", "SYSTEM", 
                HttpStatus.INTERNAL_SERVER_ERROR, errorId, ex);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    // Helper methods for consistent error handling and logging
    
    private String extractPath(WebRequest request) {
        return request.getDescription(false).replace("uri=", "");
    }
    
    private String generateErrorId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
    
    private void logError(String exceptionType, String errorCode, String category, 
                         HttpStatus status, String errorId, Exception ex) {
        LoggingContext.setHttpStatus(status.value());
        LoggingContext.setErrorContext(exceptionType, errorCode);
        LoggingContext.addContextData("errorId", errorId);
        LoggingContext.addContextData("category", category);
        
        logger.businessError("Error occurred - ID: {}, Code: {}, Category: {}", 
                errorId, errorCode, category, ex);
    }
    
    private void logSecurityError(String exceptionType, String errorCode, String errorId, Exception ex) {
        LoggingContext.setHttpStatus(HttpStatus.UNAUTHORIZED.value());
        LoggingContext.setErrorContext(exceptionType, errorCode);
        LoggingContext.addContextData("errorId", errorId);
        
        logger.auditSecurityEvent(errorCode, "Security error - ID: " + errorId + ", Type: " + exceptionType);
        logger.businessError("Security error occurred - ID: {}, Code: {}", 
                errorId, errorCode, ex);
    }
}