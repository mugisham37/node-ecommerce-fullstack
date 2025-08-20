package com.ecommerce.inventory.event;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Registry for managing event versions and backward compatibility.
 * Supports event schema evolution and version migration.
 */
@Component
public class EventVersionRegistry {
    
    private final Map<String, EventVersionInfo> eventVersions = new HashMap<>();
    
    public EventVersionRegistry() {
        initializeEventVersions();
    }
    
    private void initializeEventVersions() {
        // Inventory Events
        registerEventVersion("StockUpdatedEvent", "1.0", true, Set.of());
        registerEventVersion("LowStockEvent", "1.0", true, Set.of());
        registerEventVersion("InventoryAllocatedEvent", "1.0", true, Set.of());
        registerEventVersion("InventoryReleasedEvent", "1.0", true, Set.of());
        
        // Order Events
        registerEventVersion("OrderCreatedEvent", "1.0", true, Set.of());
        registerEventVersion("OrderStatusChangedEvent", "1.0", true, Set.of());
        registerEventVersion("OrderCancelledEvent", "1.0", true, Set.of());
        
        // Supplier Events
        registerEventVersion("SupplierCreatedEvent", "1.0", true, Set.of());
        registerEventVersion("SupplierStatusChangedEvent", "1.0", true, Set.of());
    }
    
    /**
     * Registers a new event version.
     */
    public void registerEventVersion(String eventType, String version, boolean isSupported, Set<String> compatibleVersions) {
        eventVersions.put(eventType, new EventVersionInfo(version, isSupported, compatibleVersions));
    }
    
    /**
     * Checks if an event version is supported.
     */
    public boolean isVersionSupported(String eventType, String version) {
        EventVersionInfo versionInfo = eventVersions.get(eventType);
        return versionInfo != null && 
               (versionInfo.getCurrentVersion().equals(version) || 
                versionInfo.getCompatibleVersions().contains(version)) &&
               versionInfo.isSupported();
    }
    
    /**
     * Gets the current version for an event type.
     */
    public String getCurrentVersion(String eventType) {
        EventVersionInfo versionInfo = eventVersions.get(eventType);
        return versionInfo != null ? versionInfo.getCurrentVersion() : "1.0";
    }
    
    /**
     * Gets compatible versions for an event type.
     */
    public Set<String> getCompatibleVersions(String eventType) {
        EventVersionInfo versionInfo = eventVersions.get(eventType);
        return versionInfo != null ? versionInfo.getCompatibleVersions() : Set.of();
    }
    
    /**
     * Validates if an event can be processed based on its version.
     */
    public void validateEventVersion(BaseEvent event) {
        String eventType = event.getEventType();
        String eventVersion = event.getEventVersion();
        
        if (!isVersionSupported(eventType, eventVersion)) {
            throw new UnsupportedEventVersionException(
                String.format("Event type '%s' version '%s' is not supported. Current version: %s", 
                             eventType, eventVersion, getCurrentVersion(eventType)));
        }
    }
    
    /**
     * Information about an event version.
     */
    private static class EventVersionInfo {
        private final String currentVersion;
        private final boolean supported;
        private final Set<String> compatibleVersions;
        
        public EventVersionInfo(String currentVersion, boolean supported, Set<String> compatibleVersions) {
            this.currentVersion = currentVersion;
            this.supported = supported;
            this.compatibleVersions = compatibleVersions;
        }
        
        public String getCurrentVersion() {
            return currentVersion;
        }
        
        public boolean isSupported() {
            return supported;
        }
        
        public Set<String> getCompatibleVersions() {
            return compatibleVersions;
        }
    }
}