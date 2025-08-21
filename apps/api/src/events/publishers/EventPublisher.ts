import { DomainEventType, EventProcessingResult } from '../types';
import { eventBus } from '../EventBus';

/**
 * Event publishing exception.
 */
export class EventPublishingException extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'EventPublishingException';
  }
}

/**
 * Event metrics collector interface.
 */
export interface EventMetricsCollector {
  recordEventPublished(eventType: string, eventVersion: string): void;
  recordEventPublishingFailure(eventType: string, errorType: string): void;
  recordEventProcessingTime(eventType: string, processingTime: number): void;
}

/**
 * Default metrics collector implementation.
 */
export class DefaultEventMetricsCollector implements EventMetricsCollector {
  private metrics: Map<string, any> = new Map();

  recordEventPublished(eventType: string, eventVersion: string): void {
    const key = `${eventType}:${eventVersion}:published`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
    console.debug(`Event published: ${eventType} v${eventVersion}`);
  }

  recordEventPublishingFailure(eventType: string, errorType: string): void {
    const key = `${eventType}:${errorType}:failed`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
    console.warn(`Event publishing failed: ${eventType} - ${errorType}`);
  }

  recordEventProcessingTime(eventType: string, processingTime: number): void {
    const key = `${eventType}:processing_time`;
    const times = this.metrics.get(key) || [];
    times.push(processingTime);
    this.metrics.set(key, times);
  }

  getMetrics(): Map<string, any> {
    return new Map(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Service for publishing domain events with comprehensive logging and error handling.
 * Provides a centralized point for event publishing with monitoring capabilities.
 */
export class EventPublisher {
  private metricsCollector: EventMetricsCollector;

  constructor(metricsCollector?: EventMetricsCollector) {
    this.metricsCollector = metricsCollector || new DefaultEventMetricsCollector();
  }

  /**
   * Publishes a domain event with comprehensive logging and metrics collection.
   */
  public async publishEvent(event: DomainEventType): Promise<EventProcessingResult[]> {
    const startTime = Date.now();
    
    try {
      console.debug(`Publishing event: ${event.toString()}`);
      
      // Record event publishing metrics
      this.metricsCollector.recordEventPublished(event.eventType, event.eventVersion);
      
      // Publish the event through the event bus
      const results = await eventBus.publishEvent(event);
      
      const processingTime = Date.now() - startTime;
      this.metricsCollector.recordEventProcessingTime(event.eventType, processingTime);
      
      console.info(`Successfully published event: ${event.eventType} with ID: ${event.eventId} in ${processingTime}ms`);
      
      return results;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Failed to publish event: ${event.eventType} with ID: ${event.eventId} after ${processingTime}ms`, error);
      
      // Record failure metrics
      this.metricsCollector.recordEventPublishingFailure(
        event.eventType, 
        (error as Error).constructor.name
      );
      
      // Re-throw as EventPublishingException
      throw new EventPublishingException(
        `Failed to publish event: ${event.eventType}`, 
        error as Error
      );
    }
  }

  /**
   * Publishes multiple events in sequence with error handling.
   */
  public async publishEvents(...events: DomainEventType[]): Promise<EventProcessingResult[][]> {
    const results: EventProcessingResult[][] = [];
    
    for (const event of events) {
      try {
        const eventResults = await this.publishEvent(event);
        results.push(eventResults);
      } catch (error) {
        console.error(`Failed to publish event in batch: ${event.eventType}`, error);
        // Continue with other events even if one fails
        results.push([{
          success: false,
          eventId: event.eventId,
          eventType: event.eventType,
          processingTime: 0,
          error: (error as Error).message
        }]);
      }
    }
    
    return results;
  }

  /**
   * Publishes an event asynchronously (fire-and-forget).
   * Use with caution as failures will only be logged.
   */
  public publishEventAsync(event: DomainEventType): void {
    setImmediate(async () => {
      try {
        await this.publishEvent(event);
      } catch (error) {
        console.error(`Async event publishing failed for event: ${event.eventType} with ID: ${event.eventId}`, error);
        // Don't re-throw for async publishing
      }
    });
  }

  /**
   * Publishes events with a delay (useful for scheduled events).
   */
  public publishEventWithDelay(event: DomainEventType, delayMs: number): Promise<EventProcessingResult[]> {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const results = await this.publishEvent(event);
          resolve(results);
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  }

  /**
   * Publishes events in parallel (use with caution for order-dependent events).
   */
  public async publishEventsParallel(...events: DomainEventType[]): Promise<EventProcessingResult[][]> {
    const promises = events.map(event => 
      this.publishEvent(event).catch(error => [{
        success: false,
        eventId: event.eventId,
        eventType: event.eventType,
        processingTime: 0,
        error: (error as Error).message
      }])
    );
    
    return Promise.all(promises);
  }

  /**
   * Gets the metrics collector for external access.
   */
  public getMetricsCollector(): EventMetricsCollector {
    return this.metricsCollector;
  }

  /**
   * Sets a custom metrics collector.
   */
  public setMetricsCollector(collector: EventMetricsCollector): void {
    this.metricsCollector = collector;
  }
}

// Singleton instance
export const eventPublisher = new EventPublisher();