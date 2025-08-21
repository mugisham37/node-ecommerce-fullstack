import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import SQLite from 'react-native-sqlite-storage';

// Enable SQLite debugging
SQLite.DEBUG(true);
SQLite.enablePromise(true);

export interface OfflineData {
  id: string;
  type: 'product' | 'inventory' | 'order' | 'supplier' | 'user';
  data: any;
  timestamp: number;
  version: number;
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  lastModified: number;
  checksum?: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  type: 'product' | 'inventory' | 'order' | 'supplier' | 'user';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
}

export interface OfflineStorageConfig {
  maxCacheSize: number; // in MB
  maxRetries: number;
  syncInterval: number; // in milliseconds
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

class OfflineStorage {
  private static instance: OfflineStorage;
  private db: SQLite.SQLiteDatabase | null = null;
  private mmkv: MMKV;
  private isInitialized = false;
  private config: OfflineStorageConfig = {
    maxCacheSize: 100, // 100MB
    maxRetries: 3,
    syncInterval: 30000, // 30 seconds
    compressionEnabled: true,
    encryptionEnabled: true,
  };

  private constructor() {
    this.mmkv = new MMKV({
      id: 'offline-storage',
      encryptionKey: 'ecommerce-mobile-key',
    });
  }

  public static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  /**
   * Initialize offline storage
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize SQLite database
      await this.initializeDatabase();

      // Load configuration
      await this.loadConfiguration();

      // Clean up old data
      await this.cleanupOldData();

      this.isInitialized = true;
      console.log('OfflineStorage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OfflineStorage:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'ecommerce_offline.db',
        location: 'default',
        createFromLocation: '~ecommerce_offline.db',
      });

      // Create tables
      await this.createTables();
      
      console.log('SQLite database initialized');
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Offline data table
      `CREATE TABLE IF NOT EXISTS offline_data (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        version INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        last_modified INTEGER NOT NULL,
        checksum TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Sync queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        priority TEXT NOT NULL DEFAULT 'normal',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )`,
      
      // Cache metadata table
      `CREATE TABLE IF NOT EXISTS cache_metadata (
        key TEXT PRIMARY KEY,
        size INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        accessed_at INTEGER NOT NULL,
        expires_at INTEGER
      )`,
      
      // Conflict resolution table
      `CREATE TABLE IF NOT EXISTS conflicts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        local_data TEXT NOT NULL,
        server_data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT FALSE
      )`
    ];

    for (const table of tables) {
      await this.db.executeSql(table);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_offline_data_type ON offline_data(type)',
      'CREATE INDEX IF NOT EXISTS idx_offline_data_sync_status ON offline_data(sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_cache_metadata_expires ON cache_metadata(expires_at)',
    ];

    for (const index of indexes) {
      await this.db.executeSql(index);
    }
  }

  /**
   * Store data offline
   */
  public async storeData(data: Omit<OfflineData, 'timestamp' | 'version'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const timestamp = Date.now();
      const version = await this.getNextVersion(data.id);
      const checksum = this.calculateChecksum(data.data);

      const offlineData: OfflineData = {
        ...data,
        timestamp,
        version,
        checksum,
      };

      await this.db.executeSql(
        `INSERT OR REPLACE INTO offline_data 
         (id, type, data, timestamp, version, sync_status, last_modified, checksum) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          offlineData.id,
          offlineData.type,
          JSON.stringify(offlineData.data),
          offlineData.timestamp,
          offlineData.version,
          offlineData.syncStatus,
          offlineData.lastModified,
          offlineData.checksum,
        ]
      );

      // Store in MMKV for fast access
      this.mmkv.set(`data_${data.id}`, JSON.stringify(offlineData));

      console.log(`Data stored offline: ${data.id}`);
    } catch (error) {
      console.error('Failed to store data offline:', error);
      throw error;
    }
  }

  /**
   * Retrieve data from offline storage
   */
  public async getData(id: string): Promise<OfflineData | null> {
    try {
      // Try MMKV first for fast access
      const mmkvData = this.mmkv.getString(`data_${id}`);
      if (mmkvData) {
        return JSON.parse(mmkvData);
      }

      // Fallback to SQLite
      if (!this.db) throw new Error('Database not initialized');

      const result = await this.db.executeSql(
        'SELECT * FROM offline_data WHERE id = ?',
        [id]
      );

      if (result[0].rows.length > 0) {
        const row = result[0].rows.item(0);
        const data: OfflineData = {
          id: row.id,
          type: row.type,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          version: row.version,
          syncStatus: row.sync_status,
          lastModified: row.last_modified,
          checksum: row.checksum,
        };

        // Cache in MMKV for future access
        this.mmkv.set(`data_${id}`, JSON.stringify(data));
        
        return data;
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return null;
    }
  }

  /**
   * Get data by type
   */
  public async getDataByType(type: OfflineData['type']): Promise<OfflineData[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.executeSql(
        'SELECT * FROM offline_data WHERE type = ? ORDER BY last_modified DESC',
        [type]
      );

      const data: OfflineData[] = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        data.push({
          id: row.id,
          type: row.type,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          version: row.version,
          syncStatus: row.sync_status,
          lastModified: row.last_modified,
          checksum: row.checksum,
        });
      }

      return data;
    } catch (error) {
      console.error('Failed to get data by type:', error);
      return [];
    }
  }

  /**
   * Delete data from offline storage
   */
  public async deleteData(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.executeSql('DELETE FROM offline_data WHERE id = ?', [id]);
      this.mmkv.delete(`data_${id}`);
      console.log(`Data deleted: ${id}`);
    } catch (error) {
      console.error('Failed to delete data:', error);
      throw error;
    }
  }

  /**
   * Add item to sync queue
   */
  public async addToSyncQueue(item: Omit<SyncQueueItem, 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const syncItem: SyncQueueItem = {
        ...item,
        timestamp: Date.now(),
        retryCount: 0,
      };

      await this.db.executeSql(
        `INSERT INTO sync_queue 
         (id, action, type, data, timestamp, retry_count, max_retries, priority) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          syncItem.id,
          syncItem.action,
          syncItem.type,
          JSON.stringify(syncItem.data),
          syncItem.timestamp,
          syncItem.retryCount,
          syncItem.maxRetries,
          syncItem.priority,
        ]
      );

      console.log(`Item added to sync queue: ${item.id}`);
    } catch (error) {
      console.error('Failed to add item to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get sync queue items
   */
  public async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.executeSql(
        `SELECT * FROM sync_queue 
         WHERE retry_count < max_retries 
         ORDER BY priority DESC, timestamp ASC`
      );

      const items: SyncQueueItem[] = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        items.push({
          id: row.id,
          action: row.action,
          type: row.type,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          retryCount: row.retry_count,
          maxRetries: row.max_retries,
          priority: row.priority,
        });
      }

      return items;
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Remove item from sync queue
   */
  public async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.executeSql('DELETE FROM sync_queue WHERE id = ?', [id]);
      console.log(`Item removed from sync queue: ${id}`);
    } catch (error) {
      console.error('Failed to remove item from sync queue:', error);
      throw error;
    }
  }

  /**
   * Update sync queue item retry count
   */
  public async updateSyncQueueRetry(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.executeSql(
        'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.error('Failed to update sync queue retry count:', error);
      throw error;
    }
  }

  /**
   * Update data sync status
   */
  public async updateSyncStatus(id: string, status: OfflineData['syncStatus']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.executeSql(
        'UPDATE offline_data SET sync_status = ? WHERE id = ?',
        [status, id]
      );

      // Update MMKV cache
      const mmkvData = this.mmkv.getString(`data_${id}`);
      if (mmkvData) {
        const data = JSON.parse(mmkvData);
        data.syncStatus = status;
        this.mmkv.set(`data_${id}`, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to update sync status:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalItems: number;
    pendingSync: number;
    conflicts: number;
    cacheSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const [totalResult, pendingResult, conflictResult] = await Promise.all([
        this.db.executeSql('SELECT COUNT(*) as count FROM offline_data'),
        this.db.executeSql("SELECT COUNT(*) as count FROM offline_data WHERE sync_status = 'pending'"),
        this.db.executeSql('SELECT COUNT(*) as count FROM conflicts WHERE resolved = FALSE'),
      ]);

      const cacheSize = await this.calculateCacheSize();

      return {
        totalItems: totalResult[0].rows.item(0).count,
        pendingSync: pendingResult[0].rows.item(0).count,
        conflicts: conflictResult[0].rows.item(0).count,
        cacheSize,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { totalItems: 0, pendingSync: 0, conflicts: 0, cacheSize: 0 };
    }
  }

  /**
   * Clear all offline data
   */
  public async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await Promise.all([
        this.db.executeSql('DELETE FROM offline_data'),
        this.db.executeSql('DELETE FROM sync_queue'),
        this.db.executeSql('DELETE FROM cache_metadata'),
        this.db.executeSql('DELETE FROM conflicts'),
      ]);

      this.mmkv.clearAll();
      console.log('All offline data cleared');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const config = await AsyncStorage.getItem('offline_storage_config');
      if (config) {
        this.config = { ...this.config, ...JSON.parse(config) };
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  private async getNextVersion(id: string): Promise<number> {
    if (!this.db) return 1;

    try {
      const result = await this.db.executeSql(
        'SELECT MAX(version) as max_version FROM offline_data WHERE id = ?',
        [id]
      );

      const maxVersion = result[0].rows.item(0).max_version;
      return (maxVersion || 0) + 1;
    } catch (error) {
      console.error('Failed to get next version:', error);
      return 1;
    }
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation (in production, use a proper hash function)
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private async calculateCacheSize(): Promise<number> {
    if (!this.db) return 0;

    try {
      const result = await this.db.executeSql(
        'SELECT SUM(LENGTH(data)) as total_size FROM offline_data'
      );

      return result[0].rows.item(0).total_size || 0;
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return 0;
    }
  }

  private async cleanupOldData(): Promise<void> {
    if (!this.db) return;

    try {
      // Remove old synced data (older than 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      await this.db.executeSql(
        "DELETE FROM offline_data WHERE sync_status = 'synced' AND timestamp < ?",
        [thirtyDaysAgo]
      );

      // Remove failed sync queue items (older than 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      await this.db.executeSql(
        'DELETE FROM sync_queue WHERE retry_count >= max_retries AND timestamp < ?',
        [sevenDaysAgo]
      );

      console.log('Old data cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }
}

export default OfflineStorage.getInstance();,