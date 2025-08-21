// Core event system
export * from './EventBus';
export * from './types';

// Publishers
export * from './publishers/EventPublisher';

// Handlers
export * from './handlers';

// Retry mechanism
export * from './retry/RetryPolicy';
export * from './retry/EventRetryService';

// Dead letter queue
export * from './dlq/DeadLetterQueueService';

// Main event system initialization
import { registerAllEventHandlers } from './handlers';
import { eventBus } from './EventBus';
import { eventPublisher } from './publishers/EventPublisher';
import { eventRetryService } from './retry/EventRetryService';
import { deadLetterQueueService } from './dlq/DeadLetterQueueService';

/**
 * Initializes the complete event system.
 */
export async function initializeEventSystem(): Promise<void> {
  console.log('Initializing event system...');

  try {
    // Register all event handlers
    registerAllEventHandlers();

    // Start background services
    // Event retry service is already started in its constructor

    console.log('Event system initialized successfully');
    console.log(`Registered event types: ${eventBus.getRegisteredEventTypes().join(', ')}`);

  } catch (error) {
    console.error('Failed to initialize event system:', error);
    throw error;
  }
}

/**
 * Shuts down the event system gracefully.
 */
export async function shutdownEventSystem(): Promise<void> {
  console.log('Shutting down event system...');

  try {
    // Stop retry service
    eventRetryService.stop();

    // Shutdown event bus
    await eventBus.shutdown();

    console.log('Event system shutdown complete');

  } catch (error) {
    console.error('Error during event system shutdown:', error);
    throw error;
  }
}

/**
 * Gets comprehensive event system statistics.
 */
export function getEventSystemStatistics(): Record<string, any> {
  return {
    eventBus: eventBus.getStatistics(),
    retryService: eventRetryService.getRetryStatistics(),
    deadLetterQueue: deadLetterQueueService.getStatistics(),
    registeredEventTypes: eventBus.getRegisteredEventTypes(),
    handlerCounts: eventBus.getRegisteredEventTypes().reduce((counts, eventType) => {
      counts[eventType] = eventBus.getHandlerCount(eventType);
      return counts;
    }, {} as Record<string, number>)
  };
}

// Export singleton instances for easy access
export { 
  eventBus, 
  eventPublisher, 
  eventRetryService, 
  deadLetterQueueService 
};