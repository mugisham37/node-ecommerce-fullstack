/**
 * Base interface for all domain events in the system.
 * Provides common event metadata and versioning support.
 */
export interface BaseEvent {
  eventId: string;
  timestamp: Date;
  eventVersion: string;
  eventType: string;
  aggregateId: string;
  userId: string;
}

/**
 * Abstract base class for creating domain events.
 */
export abstract class DomainEvent implements BaseEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly eventVersion: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly userId: string;

  protected constructor(aggregateId: string, userId: string, eventVersion: string = '1.0') {
    this.eventId = crypto.randomUUID();
    this.timestamp = new Date();
    this.eventVersion = eventVersion;
    this.eventType = this.constructor.name;
    this.aggregateId = aggregateId;
    this.userId = userId;
  }

  toString(): string {
    return `${this.eventType}{eventId='${this.eventId}', timestamp=${this.timestamp.toISOString()}, version='${this.eventVersion}', aggregateId='${this.aggregateId}', userId='${this.userId}'}`;
  }
}

/**
 * Event metadata for tracking and monitoring.
 */
export interface EventMetadata {
  eventId: string;
  eventType: string;
  aggregateId: string;
  userId: string;
  timestamp: Date;
  version: string;
  correlationId?: string;
  causationId?: string;
  source?: string;
}

/**
 * Event processing result.
 */
export interface EventProcessingResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processingTime: number;
  error?: string;
  retryCount?: number;
}