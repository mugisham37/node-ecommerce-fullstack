import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import BackgroundJob from 'react-native-background-job';
import { AppState, AppStateStatus } from 'react-native';
import OfflineStorage, { OfflineData, SyncQueueItem } from './OfflineStorage';
import { trpc } from '../lib/trpc';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingItems: number;
  failedItems: number;
  syncProgress: number; // 0-100
}

export interface SyncConflict {
  id: string;
  type: string;
  localData: any;
  serverData: any;
  timestamp: number;
  resolution?: 'local' | 'server' | 'merge';
}

export interface SyncOptions {
  forceSync?: boolean;
  syncTypes?: Array<'product' | 'inventory' | 'order' | 'supplier' | 'user'>;
  batchSize?: number;
  timeout?: number;
}

class SyncService {
  private static instance: SyncService;
  private isOnline = false;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private backgroundSyncInterval: NodeJS.Timeout | null = null;
  private appState: AppStateStatus = 'active';
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private conflictListeners: Array<(conflict: SyncConflict) => void> = [];
  private lastSyncTime: number | null = null;
  private syncProgress = 0;

  private constructor() {
    this.setupNetworkListener();
    this.setupAppStateListener();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Initialize sync service
   */
  public async initialize(): Promise<void> {
    try {
      // Check initial network state
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;

      // Start periodic sync if online
      if (this.isOnline) {
        this.startPeriodicSync();
      }

      // Setup background sync
      this.setupBackgroundSync();

      console.log('SyncService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SyncService:', error);
      throw error;
    }
  }

  /**
   * Start manual sync
   */
  public async startSync(options: SyncOptions = {}): Promise<void> {
    if (this.isSyncing && !options.forceSync) {
      console.log('Sync already in progress');
      return;
    }

    if (!this.isOnline) {
      console.log('Cannot sync: device is offline');
      return;
    }

    this.isSyncing = true;
    this.syncProgress = 0;
    this.notifyListeners();

    try {
      console.log('Starting sync process...');

      // Get sync queue items
      const syncQueue = await OfflineStorage.getSyncQueue();
      const filteredQueue = options.syncTypes
        ? syncQueue.filter(item => options.syncTypes!.includes(item.type))
        : syncQueue;

      if (filteredQueue.length === 0) {
        console.log('No items to sync');
        this.completeSyncProcess();
        return;
      }

      // Process sync queue in batches
      const batchSize = options.batchSize || 10;
      const batches = this.createBatches(filteredQueue, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await this.processSyncBatch(batch, options.timeout);
        
        this.syncProgress = Math.round(((i + 1) / batches.length) * 100);
        this.notifyListeners();
      }

      // Sync server changes to local
      await this.syncServerChanges(options);

      this.completeSyncProcess();
    } catch (error) {
      console.error('Sync process failed:', error);
      this.isSyncing = false;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Stop sync process
   */
  public stopSync(): void {
    this.isSyncing = false;
    this.syncProgress = 0;
    this.notifyListeners();
    console.log('Sync process stopped');
  }

  /**
   * Add sync listener
   */
  public addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync listener
   */
  public removeSyncListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Add conflict listener
   */
  public addConflictListener(listener: (conflict: SyncConflict) => void): void {
    this.conflictListeners.push(listener);
  }

  /**
   * Remove conflict listener
   */
  public removeConflictListener(listener: (conflict: SyncConflict) => void): void {
    const index = this.conflictListeners.indexOf(listener);
    if (index > -1) {
      this.conflictListeners.splice(index, 1);
    }
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingItems: 0, // Will be updated by listeners
      failedItems: 0, // Will be updated by listeners
      syncProgress: this.syncProgress,
    };
  }

  /**
   * Resolve sync conflict
   */
  public async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> {
    try {
      // Implementation depends on your conflict resolution strategy
      console.log(`Resolving conflict ${conflictId} with resolution: ${resolution}`);
      
      // TODO: Implement conflict resolution logic
      // This would involve updating the local data based on the resolution
      // and marking the conflict as resolved
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }

  /**
   * Force sync specific item
   */
  public async forceSyncItem(id: string, type: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync: device is offline');
    }

    try {
      const data = await OfflineStorage.getData(id);
      if (!data) {
        throw new Error(`Item not found: ${id}`);
      }

      await this.syncSingleItem({
        id,
        action: 'update',
        type: type as any,
        data: data.data,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'high',
      });

      console.log(`Item force synced: ${id}`);
    } catch (error) {
      console.error('Failed to force sync item:', error);
      throw error;
    }
  }

  /**
   * Private methods
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        console.log('Device came online, starting sync...');
        this.startPeriodicSync();
        this.startSync({ forceSync: false });
      } else if (wasOnline && !this.isOnline) {
        console.log('Device went offline, stopping sync...');
        this.stopPeriodicSync();
        this.stopSync();
      }

      this.notifyListeners();
    });
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App came to foreground, checking for sync...');
        if (this.isOnline) {
          this.startSync({ forceSync: false });
        }
      }
      this.appState = nextAppState;
    });
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.startSync({ forceSync: false });
      }
    }, 30000); // Sync every 30 seconds
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private setupBackgroundSync(): void {
    BackgroundJob.register({
      jobKey: 'syncJob',
      job: () => {
        if (this.isOnline && !this.isSyncing) {
          this.startSync({ forceSync: false, batchSize: 5 });
        }
      },
    });

    this.backgroundSyncInterval = setInterval(() => {
      if (this.appState === 'background' && this.isOnline) {
        BackgroundJob.start({
          jobKey: 'syncJob',
          period: 60000, // Run every minute in background
        });
      }
    }, 60000);
  }

  private async processSyncBatch(batch: SyncQueueItem[], timeout?: number): Promise<void> {
    const promises = batch.map(item => this.syncSingleItem(item, timeout));
    await Promise.allSettled(promises);
  }

  private async syncSingleItem(item: SyncQueueItem, timeout?: number): Promise<void> {
    try {
      console.log(`Syncing item: ${item.id} (${item.action})`);

      // Create timeout promise if specified
      const timeoutPromise = timeout
        ? new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sync timeout')), timeout)
          )
        : null;

      // Sync based on action and type
      const syncPromise = this.performSyncAction(item);

      // Wait for sync or timeout
      if (timeoutPromise) {
        await Promise.race([syncPromise, timeoutPromise]);
      } else {
        await syncPromise;
      }

      // Remove from sync queue on success
      await OfflineStorage.removeFromSyncQueue(item.id);
      await OfflineStorage.updateSyncStatus(item.id, 'synced');

      console.log(`Item synced successfully: ${item.id}`);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);

      // Update retry count
      await OfflineStorage.updateSyncQueueRetry(item.id);

      // Check if max retries exceeded
      if (item.retryCount >= item.maxRetries - 1) {
        await OfflineStorage.updateSyncStatus(item.id, 'error');
        console.error(`Max retries exceeded for item: ${item.id}`);
      }
    }
  }

  private async performSyncAction(item: SyncQueueItem): Promise<void> {
    const { action, type, data } = item;

    try {
      switch (type) {
        case 'product':
          await this.syncProduct(action, data);
          break;
        case 'inventory':
          await this.syncInventory(action, data);
          break;
        case 'order':
          await this.syncOrder(action, data);
          break;
        case 'supplier':
          await this.syncSupplier(action, data);
          break;
        case 'user':
          await this.syncUser(action, data);
          break;
        default:
          throw new Error(`Unknown sync type: ${type}`);
      }
    } catch (error) {
      // Handle conflicts
      if (this.isConflictError(error)) {
        await this.handleSyncConflict(item, error);
      }
      throw error;
    }
  }

  private async syncProduct(action: string, data: any): Promise<void> {
    switch (action) {
      case 'create':
        await trpc.products.create.mutate(data);
        break;
      case 'update':
        await trpc.products.update.mutate({ id: data.id, ...data });
        break;
      case 'delete':
        await trpc.products.delete.mutate({ id: data.id });
        break;
    }
  }

  private async syncInventory(action: string, data: any): Promise<void> {
    switch (action) {
      case 'create':
        await trpc.inventory.create.mutate(data);
        break;
      case 'update':
        await trpc.inventory.update.mutate({ id: data.id, ...data });
        break;
      case 'delete':
        await trpc.inventory.delete.mutate({ id: data.id });
        break;
    }
  }

  private async syncOrder(action: string, data: any): Promise<void> {
    switch (action) {
      case 'create':
        await trpc.orders.create.mutate(data);
        break;
      case 'update':
        await trpc.orders.update.mutate({ id: data.id, ...data });
        break;
      case 'delete':
        await trpc.orders.delete.mutate({ id: data.id });
        break;
    }
  }

  private async syncSupplier(action: string, data: any): Promise<void> {
    switch (action) {
      case 'create':
        await trpc.suppliers.create.mutate(data);
        break;
      case 'update':
        await trpc.suppliers.update.mutate({ id: data.id, ...data });
        break;
      case 'delete':
        await trpc.suppliers.delete.mutate({ id: data.id });
        break;
    }
  }

  private async syncUser(action: string, data: any): Promise<void> {
    switch (action) {
      case 'create':
        await trpc.users.create.mutate(data);
        break;
      case 'update':
        await trpc.users.update.mutate({ id: data.id, ...data });
        break;
      case 'delete':
        await trpc.users.delete.mutate({ id: data.id });
        break;
    }
  }

  private async syncServerChanges(options: SyncOptions): Promise<void> {
    try {
      console.log('Syncing server changes to local...');

      // Get last sync timestamp
      const lastSync = this.lastSyncTime || 0;

      // Fetch changes from server for each type
      const types = options.syncTypes || ['product', 'inventory', 'order', 'supplier', 'user'];

      for (const type of types) {
        await this.syncServerChangesForType(type, lastSync);
      }
    } catch (error) {
      console.error('Failed to sync server changes:', error);
      throw error;
    }
  }

  private async syncServerChangesForType(type: string, lastSync: number): Promise<void> {
    try {
      // This would call your API to get changes since lastSync
      // Implementation depends on your API structure
      console.log(`Syncing server changes for type: ${type} since ${lastSync}`);
      
      // TODO: Implement server change sync based on your API
      // Example:
      // const changes = await trpc[type].getChangesSince.query({ timestamp: lastSync });
      // for (const change of changes) {
      //   await OfflineStorage.storeData({
      //     id: change.id,
      //     type: type as any,
      //     data: change.data,
      //     syncStatus: 'synced',
      //     lastModified: change.lastModified,
      //   });
      // }
    } catch (error) {
      console.error(`Failed to sync server changes for type ${type}:`, error);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private isConflictError(error: any): boolean {
    // Check if error indicates a conflict (version mismatch, etc.)
    return error?.code === 'CONFLICT' || error?.status === 409;
  }

  private async handleSyncConflict(item: SyncQueueItem, error: any): Promise<void> {
    try {
      const conflict: SyncConflict = {
        id: item.id,
        type: item.type,
        localData: item.data,
        serverData: error.serverData || {},
        timestamp: Date.now(),
      };

      // Notify conflict listeners
      this.conflictListeners.forEach(listener => listener(conflict));

      // Store conflict for later resolution
      // TODO: Implement conflict storage
      console.log('Sync conflict detected:', conflict);
    } catch (error) {
      console.error('Failed to handle sync conflict:', error);
    }
  }

  private completeSyncProcess(): void {
    this.isSyncing = false;
    this.syncProgress = 100;
    this.lastSyncTime = Date.now();
    this.notifyListeners();
    
    // Reset progress after a short delay
    setTimeout(() => {
      this.syncProgress = 0;
      this.notifyListeners();
    }, 1000);

    console.log('Sync process completed');
  }

  private notifyListeners(): void {
    const status = this.getSyncStatus();
    this.syncListeners.forEach(listener => listener(status));
  }
}

export default SyncService.getInstance();