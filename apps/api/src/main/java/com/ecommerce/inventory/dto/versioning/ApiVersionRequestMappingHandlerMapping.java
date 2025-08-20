package com.ecommerce.inventory.dto.versioning;

import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.lang.reflect.Method;

/**
 * Custom request mapping handler for API versioning
 */
public class ApiVersionRequestMappingHandlerMapping extends RequestMappingHandlerMapping {

    private static final String VERSION_PREFIX = "/api/v";

    @Override
    protected RequestMappingInfo getMappingForMethod(Method method, Class<?> handlerType) {
        RequestMappingInfo info = super.getMappingForMethod(method, handlerType);
        
        if (info == null) {
            return null;
        }

        ApiVersion methodVersion = AnnotationUtils.findAnnotation(method, ApiVersion.class);
        ApiVersion typeVersion = AnnotationUtils.findAnnotation(handlerType, ApiVersion.class);
        
        if (methodVersion != null) {
            RequestMappingInfo versionInfo = RequestMappingInfo
                    .paths(VERSION_PREFIX + methodVersion.value())
                    .build();
            info = versionInfo.combine(info);
        } else if (typeVersion != null) {
            RequestMappingInfo versionInfo = RequestMappingInfo
                    .paths(VERSION_PREFIX + typeVersion.value())
                    .build();
            info = versionInfo.combine(info);
        }

        return info;
    }
}