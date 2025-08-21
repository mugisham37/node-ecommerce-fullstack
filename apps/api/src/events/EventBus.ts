import { EventEmitter } from 'events';
import { BaseEvent, DomainEventType, EventProcessingResult } from './types';

/**
 * Event handler function type.
 */
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;

/**
 * Event handler registration.
 */
interface EventHandlerRegistration {
  eventType: string;
  handler: EventHandler;
  options: EventHandlerOptions;
}

/**
 * Options for event handler registration.
 */
export interface EventHandlerOptions {
  priority?: number; // Higher numbers = higher priority
  async?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
  timeout?: number; // in milliseconds
}

/**
 * Event bus statistics.
 */
export interface EventBusStatistics {
  totalEventsPublished: number;
  totalEventsProcessed: number;
  totalEventsFailed: number;
  eventTypeStats: Record<string, {
    published: number;
    processed: number;
    failed: number;
    averageProcessingTime: number;
  }>;
  handlerStats: Record<string, {
    totalProcessed: number;
    totalFailed: number;
    averageProcessingTime: number;
  }>;
}

/**
 * Centralized event bus for domain event publishing and handling.
 * Provides type-safe event publishing with comprehensive monitoring and error handling.
 */
export class EventBus extends EventEmitter {
  private handlers: Map<string, EventHandlerRegistration[]> = new Map();
  private statistics: EventBusStatistics = {
    totalEventsPublished: 0,
    totalEventsProcessed: 0,
    totalEventsFailed: 0,
    eventTypeStats: {},
    handlerStats: {}
  };
  private isShuttingDown = false;

  constructor() {
    super();
    this.setMaxListeners(100); // Increase default limit for high-throughput scenarios
  }

  /**
   * Registers an event handler for a specific event type.
   */
  public registerHandler<T extends BaseEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options: EventHandlerOptions = {}
  ): void {
    const registration: EventHandlerRegistration = {
      eventType,
      handler: handler as EventHandler,
      options: {
        priority: 0,
        async: true,
        retryOnFailure: false,
        maxRetries: 3,
        timeout: 30000,
        ...options
      }
    };

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.push(registration);

    // Sort handlers by priority (higher priority first)
    handlers.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

    console.log(`Registered handler for event type: ${eventType} with priority: ${registration.options.priority}`);
  }

  /**
   * Unregisters an event handler.
   */
  public unregisterHandler(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;

    const index = handlers.findIndex(reg => reg.handler === handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      console.log(`Unregistered handler for event type: ${eventType}`);
    }

    if (handlers.length === 0) {
      this.handlers.delete(eventType);
    }
  }

  /**
   * Publishes a domain event to all registered handlers.
   */
  public async publishEvent(event: DomainEventType): Promise<EventProcessingResult[]> {
    if (this.isShuttingDown) {
      throw new Error('EventBus is shutting down, cannot publish new events');
    }

    const startTime = Date.now();
    const results: EventProcessingResult[] = [];

    try {
      console.log(`Publishing event: ${event.eventType} with ID: ${event.eventId}`);
      
      // Update statistics
      this.updatePublishStatistics(event);

      // Get handlers for this event type
      const handlers = this.handlers.get(event.eventType) || [];
      
      if (handlers.length === 0) {
        console.warn(`No handlers registered for event type: ${event.eventType}`);
        return results;
      }

      // Process handlers
      for (const registration of handlers) {
        const handlerResult = await this.processHandler(event, registration);
        results.push(handlerResult);
      }

      // Emit event for any additional listeners
      this.emit(event.eventType, event);
      this.emit('*', event); // Wildcard listener

      const processingTime = Date.now() - startTime;
      console.log(`Successfully published event: ${event.eventType} with ID: ${event.eventId} in ${processingTime}ms`);

      return results;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Failed to publish event: ${event.eventType} with ID: ${event.eventId}`, error);
      
      this.updateFailureStatistics(event, error as Error);
      
      throw new Error(`Event publishing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Publishes multiple events in sequence.
   */
  public async publishEvents(events: DomainEventType[]): Promise<EventProcessingResult[][]> {
    const results: EventProcessingResult[][] = [];
    
    for (const event of events) {
      const eventResults = await this.publishEvent(event);
      results.push(eventResults);
    }
    
    return results;
  }

  /**
   * Publishes an event asynchronously (fire-and-forget).
   */
  public publishEventAsync(event: DomainEventType): void {
    setImmediate(async () => {
      try {
        await this.publishEvent(event);
      } catch (error) {
        console.error(`Async event publishing failed for event: ${event.eventType} with ID: ${event.eventId}`, error);
      }
    });
  }

  /**
   * Processes a single handler for an event.
   */
  private async processHandler(
    event: DomainEventType, 
    registration: EventHandlerRegistration
  ): Promise<EventProcessingResult> {
    const startTime = Date.now();
    const handlerName = registration.handler.name || 'anonymous';

    try {
      console.debug(`Processing event ${event.eventId} with handler: ${handlerName}`);

      if (registration.options.async) {
        // Handle with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Handler timeout')), registration.options.timeout);
        });

        const handlerPromise = Promise.resolve(registration.handler(event));
        await Promise.race([handlerPromise, timeoutPromise]);
      } else {
        // Synchronous handling
        await registration.handler(event);
      }

      const processingTime = Date.now() - startTime;
      this.updateHandlerStatistics(handlerName, true, processingTime);

      return {
        success: true,
        eventId: event.eventId,
        eventType: event.eventType,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Handler ${handlerName} failed for event ${event.eventId}:`, error);
      
      this.updateHandlerStatistics(handlerName, false, processingTime);

      return {
        success: false,
        eventId: event.eventId,
        eventType: event.eventType,
        processingTime,
        error: (error as Error).message
      };
    }
  }

  /**
   * Updates publishing statistics.
   */
  private updatePublishStatistics(event: DomainEventType): void {
    this.statistics.totalEventsPublished++;
    
    if (!this.statistics.eventTypeStats[event.eventType]) {
      this.statistics.eventTypeStats[event.eventType] = {
        published: 0,
        processed: 0,
        failed: 0,
        averageProcessingTime: 0
      };
    }
    
    this.statistics.eventTypeStats[event.eventType].published++;
  }

  /**
   * Updates processing statistics.
   */
  private updateProcessingStatistics(event: DomainEventType, processingTime: number): void {
    this.statistics.totalEventsProcessed++;
    
    const stats = this.statistics.eventTypeStats[event.eventType];
    if (stats) {
      stats.processed++;
      stats.averageProcessingTime = (stats.averageProcessingTime + processingTime) / 2;
    }
  }

  /**
   * Updates failure statistics.
   */
  private updateFailureStatistics(event: DomainEventType, error: Error): void {
    this.statistics.totalEventsFailed++;
    
    const stats = this.statistics.eventTypeStats[event.eventType];
    if (stats) {
      stats.failed++;
    }
  }

  /**
   * Updates handler statistics.
   */
  private updateHandlerStatistics(handlerName: string, success: boolean, processingTime: number): void {
    if (!this.statistics.handlerStats[handlerName]) {
      this.statistics.handlerStats[handlerName] = {
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0
      };
    }

    const stats = this.statistics.handlerStats[handlerName];
    stats.totalProcessed++;
    
    if (!success) {
      stats.totalFailed++;
    }
    
    stats.averageProcessingTime = (stats.averageProcessingTime + processingTime) / 2;
  }

  /**
   * Gets event bus statistics.
   */
  public getStatistics(): EventBusStatistics {
    return { ...this.statistics };
  }

  /**
   * Resets statistics.
   */
  public resetStatistics(): void {
    this.statistics = {
      totalEventsPublished: 0,
      totalEventsProcessed: 0,
      totalEventsFailed: 0,
      eventTypeStats: {},
      handlerStats: {}
    };
  }

  /**
   * Gets all registered event types.
   */
  public getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Gets handler count for an event type.
   */
  public getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  /**
   * Gracefully shuts down the event bus.
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down EventBus...');
    this.isShuttingDown = true;
    
    // Wait for any pending events to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear all handlers
    this.handlers.clear();
    this.removeAllListeners();
    
    console.log('EventBus shutdown complete');
  }
}

// Singleton instance
export const eventBus = new EventBus();