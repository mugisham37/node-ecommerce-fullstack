import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncStatus, SyncConflict } from '../services/SyncService';

export interface OfflineItem {
  id: string;
  type: 'product' | 'inventory' | 'order' | 'supplier' | 'user';
  data: any;
  timestamp: number;
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  lastModified: number;
  retryCount: number;
}

export interface OfflineSettings {
  autoSync: boolean;
  syncInterval: number; // in milliseconds
  maxRetries: number;
  batchSize: number;
  wifiOnly: boolean;
  backgroundSync: boolean;
  conflictResolution: 'manual' | 'local' | 'server';
}

export interface OfflineState {
  // Data
  items: Record<string, OfflineItem>;
  conflicts: SyncConflict[];
  
  // Status
  syncStatus: SyncStatus;
  isInitialized: boolean;
  
  // Settings
  settings: OfflineSettings;
  
  // Statistics
  stats: {
    totalItems: number;
    pendingItems: number;
    syncedItems: number;
    errorItems: number;
    conflictItems: number;
    lastSyncTime: number | null;
    cacheSize: number;
  };
}

export interface OfflineActions {
  // Initialization
  initialize: () => Promise<void>;
  reset: () => void;
  
  // Data management
  addItem: (item: Omit<OfflineItem, 'timestamp' | 'retryCount'>) => void;
  updateItem: (id: string, updates: Partial<OfflineItem>) => void;
  removeItem: (id: string) => void;
  getItem: (id: string) => OfflineItem | undefined;
  getItemsByType: (type: OfflineItem['type']) => OfflineItem[];
  clearItems: () => void;
  
  // Sync status
  updateSyncStatus: (status: Partial<SyncStatus>) => void;
  
  // Conflicts
  addConflict: (conflict: SyncConflict) => void;
  removeConflict: (conflictId: string) => void;
  clearConflicts: () => void;
  
  // Settings
  updateSettings: (settings: Partial<OfflineSettings>) => void;
  
  // Statistics
  updateStats: () => void;
  
  // Bulk operations
  addItems: (items: Omit<OfflineItem, 'timestamp' | 'retryCount'>[]) => void;
  updateItemsByType: (type: OfflineItem['type'], updates: Partial<OfflineItem>) => void;
  removeItemsByType: (type: OfflineItem['type']) => void;
  
  // Queue management
  getPendingItems: () => OfflineItem[];
  getErrorItems: () => OfflineItem[];
  getConflictItems: () => OfflineItem[];
  retryItem: (id: string) => void;
  
  // Cache management
  cleanupOldItems: (maxAge: number) => void;
  optimizeCache: () => void;
}

const defaultSettings: OfflineSettings = {
  autoSync: true,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  batchSize: 10,
  wifiOnly: false,
  backgroundSync: true,
  conflictResolution: 'manual',
};

const defaultSyncStatus: SyncStatus = {
  isOnline: false,
  isSyncing: false,
  lastSyncTime: null,
  pendingItems: 0,
  failedItems: 0,
  syncProgress: 0,
};

const defaultStats = {
  totalItems: 0,
  pendingItems: 0,
  syncedItems: 0,
  errorItems: 0,
  conflictItems: 0,
  lastSyncTime: null,
  cacheSize: 0,
};

export const useOfflineStore = create<OfflineState & OfflineActions>()(
  persist(
    (set, get) => ({
      // Initial state
      items: {},
      conflicts: [],
      syncStatus: defaultSyncStatus,
      isInitialized: false,
      settings: defaultSettings,
      stats: defaultStats,

      // Initialization
      initialize: async () => {
        try {
          const state = get();
          if (state.isInitialized) return;

          // Update statistics
          state.updateStats();
          
          set({ isInitialized: true });
          console.log('Offline store initialized');
        } catch (error) {
          console.error('Failed to initialize offline store:', error);
        }
      },

      reset: () => {
        set({
          items: {},
          conflicts: [],
          syncStatus: defaultSyncStatus,
          isInitialized: false,
          settings: defaultSettings,
          stats: defaultStats,
        });
      },

      // Data management
      addItem: (item) => {
        const newItem: OfflineItem = {
          ...item,
          timestamp: Date.now(),
          retryCount: 0,
        };

        set((state) => ({
          items: {
            ...state.items,
            [item.id]: newItem,
          },
        }));

        get().updateStats();
      },

      updateItem: (id, updates) => {
        set((state) => {
          const existingItem = state.items[id];
          if (!existingItem) return state;

          return {
            items: {
              ...state.items,
              [id]: {
                ...existingItem,
                ...updates,
                lastModified: Date.now(),
              },
            },
          };
        });

        get().updateStats();
      },

      removeItem: (id) => {
        set((state) => {
          const { [id]: removed, ...remainingItems } = state.items;
          return { items: remainingItems };
        });

        get().updateStats();
      },

      getItem: (id) => {
        return get().items[id];
      },

      getItemsByType: (type) => {
        const items = get().items;
        return Object.values(items).filter(item => item.type === type);
      },

      clearItems: () => {
        set({ items: {} });
        get().updateStats();
      },

      // Sync status
      updateSyncStatus: (status) => {
        set((state) => ({
          syncStatus: {
            ...state.syncStatus,
            ...status,
          },
        }));
      },

      // Conflicts
      addConflict: (conflict) => {
        set((state) => ({
          conflicts: [...state.conflicts, conflict],
        }));
      },

      removeConflict: (conflictId) => {
        set((state) => ({
          conflicts: state.conflicts.filter(c => c.id !== conflictId),
        }));
      },

      clearConflicts: () => {
        set({ conflicts: [] });
      },

      // Settings
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));
      },

      // Statistics
      updateStats: () => {
        const state = get();
        const items = Object.values(state.items);
        
        const stats = {
          totalItems: items.length,
          pendingItems: items.filter(item => item.syncStatus === 'pending').length,
          syncedItems: items.filter(item => item.syncStatus === 'synced').length,
          errorItems: items.filter(item => item.syncStatus === 'error').length,
          conflictItems: items.filter(item => item.syncStatus === 'conflict').length,
          lastSyncTime: state.syncStatus.lastSyncTime,
          cacheSize: JSON.stringify(items).length, // Approximate size in bytes
        };

        set({ stats });
      },

      // Bulk operations
      addItems: (items) => {
        const newItems: Record<string, OfflineItem> = {};
        const timestamp = Date.now();

        items.forEach(item => {
          newItems[item.id] = {
            ...item,
            timestamp,
            retryCount: 0,
          };
        });

        set((state) => ({
          items: {
            ...state.items,
            ...newItems,
          },
        }));

        get().updateStats();
      },

      updateItemsByType: (type, updates) => {
        set((state) => {
          const updatedItems = { ...state.items };
          
          Object.keys(updatedItems).forEach(id => {
            if (updatedItems[id].type === type) {
              updatedItems[id] = {
                ...updatedItems[id],
                ...updates,
                lastModified: Date.now(),
              };
            }
          });

          return { items: updatedItems };
        });

        get().updateStats();
      },

      removeItemsByType: (type) => {
        set((state) => {
          const filteredItems: Record<string, OfflineItem> = {};
          
          Object.entries(state.items).forEach(([id, item]) => {
            if (item.type !== type) {
              filteredItems[id] = item;
            }
          });

          return { items: filteredItems };
        });

        get().updateStats();
      },

      // Queue management
      getPendingItems: () => {
        const items = get().items;
        return Object.values(items).filter(item => item.syncStatus === 'pending');
      },

      getErrorItems: () => {
        const items = get().items;
        return Object.values(items).filter(item => item.syncStatus === 'error');
      },

      getConflictItems: () => {
        const items = get().items;
        return Object.values(items).filter(item => item.syncStatus === 'conflict');
      },

      retryItem: (id) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return state;

          return {
            items: {
              ...state.items,
              [id]: {
                ...item,
                syncStatus: 'pending',
                retryCount: item.retryCount + 1,
                lastModified: Date.now(),
              },
            },
          };
        });

        get().updateStats();
      },

      // Cache management
      cleanupOldItems: (maxAge) => {
        const cutoffTime = Date.now() - maxAge;
        
        set((state) => {
          const filteredItems: Record<string, OfflineItem> = {};
          
          Object.entries(state.items).forEach(([id, item]) => {
            if (item.syncStatus === 'synced' && item.timestamp < cutoffTime) {
              // Remove old synced items
              return;
            }
            filteredItems[id] = item;
          });

          return { items: filteredItems };
        });

        get().updateStats();
      },

      optimizeCache: () => {
        const state = get();
        const { settings } = state;
        
        // Remove old synced items (older than 7 days)
        const sevenDaysAgo = 7 * 24 * 60 * 60 * 1000;
        state.cleanupOldItems(sevenDaysAgo);
        
        // Remove items that exceeded max retries
        set((currentState) => {
          const filteredItems: Record<string, OfflineItem> = {};
          
          Object.entries(currentState.items).forEach(([id, item]) => {
            if (item.syncStatus === 'error' && item.retryCount >= settings.maxRetries) {
              // Remove items that can't be synced
              return;
            }
            filteredItems[id] = item;
          });

          return { items: filteredItems };
        });

        get().updateStats();
        console.log('Cache optimized');
      },
    }),
    {
      name: 'offline-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        settings: state.settings,
        conflicts: state.conflicts,
      }),
    }
  )
);

export default useOfflineStore;