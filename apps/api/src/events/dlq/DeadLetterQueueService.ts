import { DomainEventType } from '../types';

/**
 * Dead letter queue entry for failed events.
 */
export interface DeadLetterQueueEntry {
  eventId: string;
  eventType: string;
  aggregateId: string;
  userId: string;
  serializedEvent: string;
  lastError: string;
  errorType: string;
  attemptCount: number;
  createdAt: Date;
  metadata: Record<string, any>;
}

/**
 * Dead letter queue statistics.
 */
export interface DeadLetterQueueStatistics {
  totalEntries: number;
  entriesByEventType: Record<string, number>;
  entriesByErrorType: Record<string, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
  averageAttempts: number;
}

/**
 * Storage interface for dead letter queue entries.
 */
export interface DeadLetterQueueStorage {
  store(entry: DeadLetterQueueEntry): Promise<void>;
  retrieve(eventId: string): Promise<DeadLetterQueueEntry | null>;
  list(offset: number, limit: number): Promise<DeadLetterQueueEntry[]>;
  remove(eventId: string): Promise<boolean>;
  count(): Promise<number>;
  cleanup(olderThanDays: number): Promise<number>;
  getStatistics(): Promise<DeadLetterQueueStatistics>;
}

/**
 * In-memory storage implementation for dead letter queue.
 * In production, use Redis, database, or other persistent storage.
 */
export class InMemoryDeadLetterQueueStorage implements DeadLetterQueueStorage {
  private entries: Map<string, DeadLetterQueueEntry> = new Map();
  private entryList: string[] = []; // Maintains insertion order

  async store(entry: DeadLetterQueueEntry): Promise<void> {
    if (!this.entries.has(entry.eventId)) {
      this.entryList.unshift(entry.eventId); // Add to front for LIFO order
    }
    this.entries.set(entry.eventId, { ...entry });
  }

  async retrieve(eventId: string): Promise<DeadLetterQueueEntry | null> {
    return this.entries.get(eventId) || null;
  }

  async list(offset: number, limit: number): Promise<DeadLetterQueueEntry[]> {
    const eventIds = this.entryList.slice(offset, offset + limit);
    const entries: DeadLetterQueueEntry[] = [];
    
    for (const eventId of eventIds) {
      const entry = this.entries.get(eventId);
      if (entry) {
        entries.push(entry);
      }
    }
    
    return entries;
  }

  async remove(eventId: string): Promise<boolean> {
    const existed = this.entries.has(eventId);
    this.entries.delete(eventId);
    
    const index = this.entryList.indexOf(eventId);
    if (index !== -1) {
      this.entryList.splice(index, 1);
    }
    
    return existed;
  }

  async count(): Promise<number> {
    return this.entries.size;
  }

  async cleanup(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let cleanedCount = 0;
    const toRemove: string[] = [];
    
    for (const [eventId, entry] of this.entries.entries()) {
      if (entry.createdAt < cutoffDate) {
        toRemove.push(eventId);
      }
    }
    
    for (const eventId of toRemove) {
      await this.remove(eventId);
      cleanedCount++;
    }
    
    return cleanedCount;
  }

  async getStatistics(): Promise<DeadLetterQueueStatistics> {
    const entries = Array.from(this.entries.values());
    
    const stats: DeadLetterQueueStatistics = {
      totalEntries: entries.length,
      entriesByEventType: {},
      entriesByErrorType: {},
      averageAttempts: 0
    };

    if (entries.length === 0) {
      return stats;
    }

    // Calculate statistics
    let totalAttempts = 0;
    let oldestDate: Date | undefined;
    let newestDate: Date | undefined;

    for (const entry of entries) {
      // Event type statistics
      stats.entriesByEventType[entry.eventType] = 
        (stats.entriesByEventType[entry.eventType] || 0) + 1;

      // Error type statistics
      stats.entriesByErrorType[entry.errorType] = 
        (stats.entriesByErrorType[entry.errorType] || 0) + 1;

      // Attempt count
      totalAttempts += entry.attemptCount;

      // Date tracking
      if (!oldestDate || entry.createdAt < oldestDate) {
        oldestDate = entry.createdAt;
      }
      if (!newestDate || entry.createdAt > newestDate) {
        newestDate = entry.createdAt;
      }
    }

    stats.averageAttempts = totalAttempts / entries.length;
    stats.oldestEntry = oldestDate;
    stats.newestEntry = newestDate;

    return stats;
  }
}

/**
 * Service for handling events that have failed all retry attempts.
 * Stores failed events for manual inspection and potential reprocessing.
 */
export class DeadLetterQueueService {
  private storage: DeadLetterQueueStorage;

  constructor(storage?: DeadLetterQueueStorage) {
    this.storage = storage || new InMemoryDeadLetterQueueStorage();
  }

  /**
   * Sends a failed event to the dead letter queue.
   */
  public async sendToDeadLetterQueue(
    event: DomainEventType, 
    lastError: Error, 
    attemptCount: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const entry: DeadLetterQueueEntry = {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        userId: event.userId,
        serializedEvent: this.serializeEvent(event),
        lastError: lastError.message,
        errorType: lastError.constructor.name,
        attemptCount,
        createdAt: new Date(),
        metadata
      };

      await this.storage.store(entry);

      console.error(`Event ${event.eventId} sent to dead letter queue after ${attemptCount} attempts. Error: ${lastError.message}`);

    } catch (error) {
      console.error(`Failed to send event ${event.eventId} to dead letter queue`, error);
      throw error;
    }
  }

  /**
   * Retrieves a dead letter queue entry by event ID.
   */
  public async getEntry(eventId: string): Promise<DeadLetterQueueEntry | null> {
    try {
      return await this.storage.retrieve(eventId);
    } catch (error) {
      console.error(`Failed to retrieve dead letter queue entry for event ${eventId}`, error);
      return null;
    }
  }

  /**
   * Gets dead letter queue entries with pagination.
   */
  public async getEntries(offset: number = 0, limit: number = 50): Promise<DeadLetterQueueEntry[]> {
    try {
      return await this.storage.list(offset, limit);
    } catch (error) {
      console.error('Failed to retrieve dead letter queue entries', error);
      return [];
    }
  }

  /**
   * Gets all entries for a specific event type.
   */
  public async getEntriesByEventType(eventType: string, offset: number = 0, limit: number = 50): Promise<DeadLetterQueueEntry[]> {
    const allEntries = await this.getEntries(0, 1000); // Get a large batch
    const filteredEntries = allEntries.filter(entry => entry.eventType === eventType);
    return filteredEntries.slice(offset, offset + limit);
  }

  /**
   * Gets all entries for a specific error type.
   */
  public async getEntriesByErrorType(errorType: string, offset: number = 0, limit: number = 50): Promise<DeadLetterQueueEntry[]> {
    const allEntries = await this.getEntries(0, 1000); // Get a large batch
    const filteredEntries = allEntries.filter(entry => entry.errorType === errorType);
    return filteredEntries.slice(offset, offset + limit);
  }

  /**
   * Removes an event from the dead letter queue.
   */
  public async removeEntry(eventId: string): Promise<boolean> {
    try {
      const removed = await this.storage.remove(eventId);
      if (removed) {
        console.info(`Removed event ${eventId} from dead letter queue`);
      }
      return removed;
    } catch (error) {
      console.error(`Failed to remove event ${eventId} from dead letter queue`, error);
      return false;
    }
  }

  /**
   * Gets the total count of entries in the dead letter queue.
   */
  public async getCount(): Promise<number> {
    try {
      return await this.storage.count();
    } catch (error) {
      console.error('Failed to get dead letter queue count', error);
      return 0;
    }
  }

  /**
   * Gets dead letter queue statistics.
   */
  public async getStatistics(): Promise<DeadLetterQueueStatistics> {
    try {
      return await this.storage.getStatistics();
    } catch (error) {
      console.error('Failed to retrieve dead letter queue statistics', error);
      return {
        totalEntries: 0,
        entriesByEventType: {},
        entriesByErrorType: {},
        averageAttempts: 0
      };
    }
  }

  /**
   * Clears old entries from the dead letter queue.
   */
  public async clearOldEntries(daysOld: number = 30): Promise<number> {
    try {
      const clearedCount = await this.storage.cleanup(daysOld);
      console.info(`Cleared ${clearedCount} old dead letter queue entries older than ${daysOld} days`);
      return clearedCount;
    } catch (error) {
      console.error('Failed to clear old dead letter queue entries', error);
      return 0;
    }
  }

  /**
   * Attempts to reprocess a dead letter queue entry.
   * Returns the deserialized event for manual reprocessing.
   */
  public async reprocessEntry(eventId: string): Promise<DomainEventType | null> {
    try {
      const entry = await this.getEntry(eventId);
      if (!entry) {
        console.warn(`Dead letter queue entry not found for event ${eventId}`);
        return null;
      }

      // Deserialize the event
      const event = this.deserializeEvent(entry.serializedEvent, entry.eventType);
      if (!event) {
        console.error(`Failed to deserialize event ${eventId} from dead letter queue`);
        return null;
      }

      console.info(`Retrieved event ${eventId} from dead letter queue for reprocessing`);
      return event;

    } catch (error) {
      console.error(`Failed to reprocess dead letter queue entry for event ${eventId}`, error);
      return null;
    }
  }

  /**
   * Bulk reprocess entries by event type.
   */
  public async reprocessEntriesByEventType(eventType: string, limit: number = 10): Promise<DomainEventType[]> {
    const entries = await this.getEntriesByEventType(eventType, 0, limit);
    const events: DomainEventType[] = [];

    for (const entry of entries) {
      const event = this.deserializeEvent(entry.serializedEvent, entry.eventType);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Serializes an event for storage.
   */
  private serializeEvent(event: DomainEventType): string {
    try {
      return JSON.stringify({
        ...event,
        timestamp: event.timestamp.toISOString()
      });
    } catch (error) {
      console.warn(`Failed to serialize event ${event.eventId}, storing minimal info`, error);
      return JSON.stringify({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        userId: event.userId,
        timestamp: event.timestamp.toISOString(),
        error: 'Serialization failed'
      });
    }
  }

  /**
   * Deserializes an event from storage.
   */
  private deserializeEvent(serializedEvent: string, eventType: string): DomainEventType | null {
    try {
      const data = JSON.parse(serializedEvent);
      
      // Convert timestamp back to Date object
      if (data.timestamp) {
        data.timestamp = new Date(data.timestamp);
      }

      // In a real implementation, you would use a factory or registry
      // to reconstruct the proper event class based on eventType
      return data as DomainEventType;

    } catch (error) {
      console.error(`Failed to deserialize event of type ${eventType}:`, error);
      return null;
    }
  }

  /**
   * Sets a custom storage implementation.
   */
  public setStorage(storage: DeadLetterQueueStorage): void {
    this.storage = storage;
  }

  /**
   * Gets the current storage implementation.
   */
  public getStorage(): DeadLetterQueueStorage {
    return this.storage;
  }
}

// Singleton instance
export const deadLetterQueueService = new DeadLetterQueueService();