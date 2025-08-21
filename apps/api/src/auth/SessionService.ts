import { SessionData, UserPrincipal } from './types';

/**
 * Session storage interface for different storage backends
 */
export interface SessionStorage {
  get(sessionId: string): Promise<SessionData | null>;
  set(sessionId: string, data: SessionData, ttl?: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
  extend(sessionId: string, ttl: number): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * In-memory session storage implementation
 */
export class MemorySessionStorage implements SessionStorage {
  private sessions = new Map<string, { data: SessionData; expires: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    // Run cleanup every minute by default
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    if (Date.now() > session.expires) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.data;
  }

  async set(sessionId: string, data: SessionData, ttl: number = 3600000): Promise<void> {
    this.sessions.set(sessionId, {
      data,
      expires: Date.now() + ttl,
    });
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async exists(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    if (Date.now() > session.expires) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  async extend(sessionId: string, ttl: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.expires = Date.now() + ttl;
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expires) {
        this.sessions.delete(sessionId);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }
}

/**
 * Redis session storage implementation
 */
export class RedisSessionStorage implements SessionStorage {
  private redis: any; // Redis client type would be imported from redis package
  private keyPrefix: string;

  constructor(redisClient: any, keyPrefix: string = 'session:') {
    this.redis = redisClient;
    this.keyPrefix = keyPrefix;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const data = await this.redis.get(this.getKey(sessionId));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis session get error:', error);
      return null;
    }
  }

  async set(sessionId: string, data: SessionData, ttl: number = 3600): Promise<void> {
    try {
      const key = this.getKey(sessionId);
      await this.redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(data));
    } catch (error) {
      console.error('Redis session set error:', error);
      throw error;
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(sessionId));
    } catch (error) {
      console.error('Redis session delete error:', error);
    }
  }

  async exists(sessionId: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(sessionId));
      return result === 1;
    } catch (error) {
      console.error('Redis session exists error:', error);
      return false;
    }
  }

  async extend(sessionId: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(this.getKey(sessionId), Math.floor(ttl / 1000));
    } catch (error) {
      console.error('Redis session extend error:', error);
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL cleanup automatically
  }

  private getKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }
}

/**
 * Session Service for managing user sessions
 */
export class SessionService {
  private storage: SessionStorage;
  private defaultTtl: number;

  constructor(storage: SessionStorage, defaultTtlMs: number = 3600000) {
    this.storage = storage;
    this.defaultTtl = defaultTtlMs;
  }

  /**
   * Create a new session for user
   */
  async createSession(
    user: UserPrincipal,
    ipAddress?: string,
    userAgent?: string,
    ttl?: number
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      loginTime: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent,
    };

    await this.storage.set(sessionId, sessionData, ttl || this.defaultTtl);
    return sessionId;
  }

  /**
   * Get session data by session ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    return await this.storage.get(sessionId);
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.storage.get(sessionId);
    
    if (session) {
      session.lastActivity = new Date();
      await this.storage.set(sessionId, session, this.defaultTtl);
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string, ttl?: number): Promise<void> {
    await this.storage.extend(sessionId, ttl || this.defaultTtl);
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);
  }

  /**
   * Check if session exists and is valid
   */
  async isValidSession(sessionId: string): Promise<boolean> {
    return await this.storage.exists(sessionId);
  }

  /**
   * Get user from session
   */
  async getUserFromSession(sessionId: string): Promise<UserPrincipal | null> {
    const session = await this.storage.get(sessionId);
    
    if (!session) {
      return null;
    }

    return {
      id: session.userId,
      email: session.email,
      role: session.role,
      firstName: '', // Would need to be populated from database
      lastName: '', // Would need to be populated from database
      active: true,
    };
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    // This would require a more sophisticated storage implementation
    // that can query by user ID. For now, this is a placeholder.
    console.warn('destroyAllUserSessions not implemented for current storage backend');
  }

  /**
   * Get active session count for user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    // This would require a more sophisticated storage implementation
    // that can query by user ID. For now, this is a placeholder.
    console.warn('getActiveSessionCount not implemented for current storage backend');
    return 0;
  }

  /**
   * Clean up expired sessions
   */
  async cleanup(): Promise<void> {
    await this.storage.cleanup();
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate session ID format
   */
  isValidSessionId(sessionId: string): boolean {
    return /^[a-f0-9]{64}$/.test(sessionId);
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
  }> {
    // This would require storage backend support
    return {
      totalSessions: 0,
      activeSessions: 0,
    };
  }
}