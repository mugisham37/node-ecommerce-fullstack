import { BaseEvent, EventProcessingResult } from '../types';
import { EventHandler } from '../EventBus';

/**
 * Event processing metrics interface.
 */
export interface EventProcessingMetrics {
  recordEventProcessed(eventType: string, success: boolean, processingTime?: number): void;
  recordEventFailed(eventType: string, error: string, processingTime?: number): void;
  getMetrics(): Record<string, any>;
}

/**
 * Default metrics implementation.
 */
export class DefaultEventProcessingMetrics implements EventProcessingMetrics {
  private metrics: Map<string, any> = new Map();

  recordEventProcessed(eventType: string, success: boolean, processingTime: number = 0): void {
    const key = `${eventType}:${success ? 'success' : 'failure'}`;
    const current = this.metrics.get(key) || { count: 0, totalTime: 0 };
    current.count++;
    current.totalTime += processingTime;
    this.metrics.set(key, current);
  }

  recordEventFailed(eventType: string, error: string, processingTime: number = 0): void {
    const key = `${eventType}:error:${error}`;
    const current = this.metrics.get(key) || { count: 0, totalTime: 0 };
    current.count++;
    current.totalTime += processingTime;
    this.metrics.set(key, current);
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Abstract base class for event handlers.
 * Provides common functionality like metrics collection and error handling.
 */
export abstract class BaseEventHandler<T extends BaseEvent = BaseEvent> implements EventHandler<T> {
  protected metrics: EventProcessingMetrics;
  protected handlerName: string;

  constructor(metrics?: EventProcessingMetrics) {
    this.metrics = metrics || new DefaultEventProcessingMetrics();
    this.handlerName = this.constructor.name;
  }

  /**
   * Main event handling method that subclasses must implement.
   */
  public async handle(event: T): Promise<void> {
    const startTime = Date.now();

    try {
      console.debug(`${this.handlerName} processing event ${event.eventId} of type ${event.eventType}`);

      // Call the specific handler implementation
      await this.processEvent(event);

      const processingTime = Date.now() - startTime;
      this.metrics.recordEventProcessed(event.eventType, true, processingTime);

      console.debug(`${this.handlerName} successfully processed event ${event.eventId} in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      this.metrics.recordEventFailed(event.eventType, errorMessage, processingTime);

      console.error(`${this.handlerName} failed to process event ${event.eventId} after ${processingTime}ms:`, error);

      // Re-throw to allow retry mechanisms to handle
      throw error;
    }
  }

  /**
   * Abstract method that subclasses must implement for specific event processing.
   */
  protected abstract processEvent(event: T): Promise<void>;

  /**
   * Hook method called before event processing.
   * Subclasses can override for custom pre-processing logic.
   */
  protected async beforeProcessing(event: T): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Hook method called after successful event processing.
   * Subclasses can override for custom post-processing logic.
   */
  protected async afterProcessing(event: T): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Hook method called when event processing fails.
   * Subclasses can override for custom error handling.
   */
  protected async onProcessingError(event: T, error: Error): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Validates an event before processing.
   * Subclasses can override for custom validation logic.
   */
  protected validateEvent(event: T): void {
    if (!event.eventId) {
      throw new Error('Event ID is required');
    }
    if (!event.eventType) {
      throw new Error('Event type is required');
    }
    if (!event.aggregateId) {
      throw new Error('Aggregate ID is required');
    }
    if (!event.timestamp) {
      throw new Error('Event timestamp is required');
    }
  }

  /**
   * Gets the metrics collector.
   */
  public getMetrics(): EventProcessingMetrics {
    return this.metrics;
  }

  /**
   * Gets the handler name.
   */
  public getHandlerName(): string {
    return this.handlerName;
  }

  /**
   * Checks if the handler can process a specific event type.
   */
  public abstract canHandle(eventType: string): boolean;

  /**
   * Gets the priority of this handler (higher numbers = higher priority).
   */
  public getPriority(): number {
    return 0; // Default priority
  }

  /**
   * Gets the timeout for this handler in milliseconds.
   */
  public getTimeout(): number {
    return 30000; // 30 seconds default
  }

  /**
   * Determines if this handler should retry on failure.
   */
  public shouldRetryOnFailure(): boolean {
    return true; // Default to retry
  }

  /**
   * Gets the maximum number of retries for this handler.
   */
  public getMaxRetries(): number {
    return 3; // Default max retries
  }
}

/**
 * Utility class for common event handler operations.
 */
export class EventHandlerUtils {
  /**
   * Checks if an event is recent (within the specified time window).
   */
  static isRecentEvent(event: BaseEvent, maxAgeMs: number): boolean {
    const eventAge = Date.now() - event.timestamp.getTime();
    return eventAge <= maxAgeMs;
  }

  /**
   * Extracts correlation ID from event metadata.
   */
  static getCorrelationId(event: BaseEvent): string | undefined {
    // In a real implementation, this would extract from event metadata
    return event.eventId; // Fallback to event ID
  }

  /**
   * Creates a processing context for an event.
   */
  static createProcessingContext(event: BaseEvent, handlerName: string): Record<string, any> {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      userId: event.userId,
      handlerName,
      startTime: new Date(),
      correlationId: this.getCorrelationId(event)
    };
  }

  /**
   * Logs event processing start.
   */
  static logProcessingStart(event: BaseEvent, handlerName: string): void {
    console.info(`[${handlerName}] Starting processing of ${event.eventType} event ${event.eventId}`);
  }

  /**
   * Logs event processing completion.
   */
  static logProcessingComplete(event: BaseEvent, handlerName: string, processingTime: number): void {
    console.info(`[${handlerName}] Completed processing of ${event.eventType} event ${event.eventId} in ${processingTime}ms`);
  }

  /**
   * Logs event processing failure.
   */
  static logProcessingFailure(event: BaseEvent, handlerName: string, error: Error, processingTime: number): void {
    console.error(`[${handlerName}] Failed processing of ${event.eventType} event ${event.eventId} after ${processingTime}ms:`, error);
  }
}