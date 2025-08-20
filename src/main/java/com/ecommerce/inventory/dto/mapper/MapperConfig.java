package com.ecommerce.inventory.dto.mapper;

import org.mapstruct.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Global MapStruct configuration with enhanced settings
 */
@MapperConfig(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    collectionMappingStrategy = CollectionMappingStrategy.ADDER_PREFERRED,
    uses = {DateTimeMapper.class}
)
public interface MapperConfig {

    /**
     * Helper class for date/time mapping
     */
    class DateTimeMapper {
        
        public String asString(LocalDateTime dateTime) {
            return dateTime != null ? dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null;
        }
        
        public LocalDateTime asLocalDateTime(String dateTime) {
            return dateTime != null ? LocalDateTime.parse(dateTime, DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null;
        }
    }
}