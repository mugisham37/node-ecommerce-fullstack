import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import SyncService, { SyncStatus, SyncConflict, SyncOptions } from '../services/SyncService';
import OfflineStorage from '../services/OfflineStorage';

export interface UseOfflineSyncReturn {
  // Status
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: number;
  lastSyncTime: number | null;
  pendingItems: number;
  failedItems: number;
  
  // Actions
  startSync: (options?: SyncOptions) => Promise<void>;
  stopSync: () => void;
  forceSyncItem: (id: string, type: string) => Promise<void>;
  
  // Conflicts
  conflicts: SyncConflict[];
  resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => Promise<void>;
  
  // Storage
  storeOfflineData: (data: any, type: string, id: string) => Promise<void>;
  getOfflineData: (id: string) => Promise<any>;
  clearOfflineData: () => Promise<void>;
  
  // Statistics
  storageStats: {
    totalItems: number;
    pendingSync: number;
    conflicts: number;
    cacheSize: number;
  };
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingItems: 0,
    failedItems: 0,
    syncProgress: 0,
  });
  
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [storageStats, setStorageStats] = useState({
    totalItems: 0,
    pendingSync: 0,
    conflicts: 0,
    cacheSize: 0,
  });

  const syncServiceRef = useRef(SyncService);
  const offlineStorageRef = useRef(OfflineStorage);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await syncServiceRef.current.initialize();
        await offlineStorageRef.current.initialize();
        
        // Get initial status
        const initialStatus = syncServiceRef.current.getSyncStatus();
        setSyncStatus(initialStatus);
        
        // Get initial storage stats
        const stats = await offlineStorageRef.current.getStorageStats();
        setStorageStats(stats);
      } catch (error) {
        console.error('Failed to initialize offline sync services:', error);
      }
    };

    initializeServices();
  }, []);

  // Set up sync status listener
  useEffect(() => {
    const handleSyncStatusChange = async (status: SyncStatus) => {
      setSyncStatus(status);
      
      // Update storage stats when sync status changes
      try {
        const stats = await offlineStorageRef.current.getStorageStats();
        setStorageStats(stats);
      } catch (error) {
        console.error('Failed to update storage stats:', error);
      }
    };

    syncServiceRef.current.addSyncListener(handleSyncStatusChange);

    return () => {
      syncServiceRef.current.removeSyncListener(handleSyncStatusChange);
    };
  }, []);

  // Set up conflict listener
  useEffect(() => {
    const handleConflict = (conflict: SyncConflict) => {
      setConflicts(prev => [...prev, conflict]);
    };

    syncServiceRef.current.addConflictListener(handleConflict);

    return () => {
      syncServiceRef.current.removeConflictListener(handleConflict);
    };
  }, []);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setSyncStatus(prev => ({
        ...prev,
        isOnline: state.isConnected ?? false,
      }));
    });

    return unsubscribe;
  }, []);

  // Actions
  const startSync = useCallback(async (options?: SyncOptions) => {
    try {
      await syncServiceRef.current.startSync(options);
    } catch (error) {
      console.error('Failed to start sync:', error);
      throw error;
    }
  }, []);

  const stopSync = useCallback(() => {
    syncServiceRef.current.stopSync();
  }, []);

  const forceSyncItem = useCallback(async (id: string, type: string) => {
    try {
      await syncServiceRef.current.forceSyncItem(id, type);
    } catch (error) {
      console.error('Failed to force sync item:', error);
      throw error;
    }
  }, []);

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ) => {
    try {
      await syncServiceRef.current.resolveConflict(conflictId, resolution, mergedData);
      
      // Remove resolved conflict from state
      setConflicts(prev => prev.filter(conflict => conflict.id !== conflictId));
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }, []);

  // Storage operations
  const storeOfflineData = useCallback(async (data: any, type: string, id: string) => {
    try {
      await offlineStorageRef.current.storeData({
        id,
        type: type as any,
        data,
        syncStatus: 'pending',
        lastModified: Date.now(),
      });

      // Add to sync queue
      await offlineStorageRef.current.addToSyncQueue({
        id,
        action: 'update',
        type: type as any,
        data,
        maxRetries: 3,
        priority: 'normal',
      });

      // Update storage stats
      const stats = await offlineStorageRef.current.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to store offline data:', error);
      throw error;
    }
  }, []);

  const getOfflineData = useCallback(async (id: string) => {
    try {
      const data = await offlineStorageRef.current.getData(id);
      return data?.data || null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }, []);

  const clearOfflineData = useCallback(async () => {
    try {
      await offlineStorageRef.current.clearAllData();
      
      // Update storage stats
      setStorageStats({
        totalItems: 0,
        pendingSync: 0,
        conflicts: 0,
        cacheSize: 0,
      });
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, []);

  return {
    // Status
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    syncProgress: syncStatus.syncProgress,
    lastSyncTime: syncStatus.lastSyncTime,
    pendingItems: syncStatus.pendingItems,
    failedItems: syncStatus.failedItems,
    
    // Actions
    startSync,
    stopSync,
    forceSyncItem,
    
    // Conflicts
    conflicts,
    resolveConflict,
    
    // Storage
    storeOfflineData,
    getOfflineData,
    clearOfflineData,
    
    // Statistics
    storageStats,
  };
};

export default useOfflineSync;