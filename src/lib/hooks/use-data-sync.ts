import { useState, useEffect, useCallback, useRef } from 'react';

import { getSocket, subscribeToData, unsubscribeFromData, subscribeToWidget, unsubscribeFromWidget } from '@/lib/realtime/client';
import type { SyncData, WidgetData } from '@/types/realtime';

/**
 * Hook for real-time data synchronization
 */
export const useDataSync = <T = any>(dataType: string, filters?: any) => {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [version, setVersion] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<any>(null);
  const filtersRef = useRef(filters);

  // Update filters ref when they change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {return;}

    socketRef.current = socket;
    setIsLoading(true);
    setError(null);

    // Subscribe to data updates
    subscribeToData(dataType, filters);

    // Listen for data sync events
    const handleDataSync = (syncData: SyncData) => {
      if (syncData.type === dataType) {
        // Check if filters match (basic implementation)
        const filtersMatch = !filtersRef.current ||
          JSON.stringify(filtersRef.current) === JSON.stringify(filters);

        if (filtersMatch) {
          setData(syncData.data);
          setLastUpdated(syncData.timestamp);
          setVersion(syncData.version);
          setIsLoading(false);
          setError(null);
        }
      }
    };

    socket.on('data:sync', handleDataSync);

    // Request initial data
    socket.emit('data:request', { type: dataType, filters }, (success: boolean, initialData: any) => {
      if (success) {
        setData(initialData.data || null);
        setLastUpdated(initialData.timestamp ? new Date(initialData.timestamp) : new Date());
        setVersion(initialData.version || 0);
        setError(null);
      } else {
        setError('Failed to load initial data');
      }
      setIsLoading(false);
    });

    return () => {
      if (socket) {
        socket.off('data:sync', handleDataSync);
        unsubscribeFromData(dataType);
      }
    };
  }, [dataType, filters]);

  const refreshData = useCallback(() => {
    const socket = getSocket();
    if (!socket) {return;}

    setIsLoading(true);
    setError(null);

    socket.emit('data:request', { type: dataType, filters }, (success: boolean, freshData: any) => {
      if (success) {
        setData(freshData.data || null);
        setLastUpdated(freshData.timestamp ? new Date(freshData.timestamp) : new Date());
        setVersion(freshData.version || 0);
        setError(null);
      } else {
        setError('Failed to refresh data');
      }
      setIsLoading(false);
    });
  }, [dataType, filters]);

  const updateData = useCallback((newData: Partial<T>) => {
    const socket = getSocket();
    if (!socket) {return Promise.resolve(false);}

    return new Promise<boolean>((resolve) => {
      socket.emit('data:update', {
        type: dataType,
        data: newData,
        filters,
        version
      }, (success: boolean) => {
        if (!success) {
          setError('Failed to update data');
        }
        resolve(success);
      });
    });
  }, [dataType, filters, version]);

  return {
    data,
    lastUpdated,
    version,
    isLoading,
    error,
    refreshData,
    updateData,
  };
};

/**
 * Hook for widget-specific data synchronization
 */
export const useWidgetSync = <T = any>(widgetId: string, refreshRate?: number) => {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {return;}

    socketRef.current = socket;
    setIsLoading(true);
    setError(null);

    // Subscribe to widget updates
    subscribeToWidget(widgetId);

    // Listen for widget updates
    const handleWidgetUpdate = (updatedWidgetId: string, widgetData: { data: any; lastUpdated: Date }) => {
      if (updatedWidgetId === widgetId) {
        setData(widgetData.data);
        setLastUpdated(new Date(widgetData.lastUpdated));
        setIsLoading(false);
        setError(null);
      }
    };

    socket.on('widget:update', handleWidgetUpdate);

    // Request initial widget data
    socket.emit('widget:request', widgetId, (success: boolean, widgetData: WidgetData) => {
      if (success && widgetData) {
        setData(widgetData.data);
        setLastUpdated(new Date(widgetData.lastUpdated));
        setError(null);
      } else {
        setError('Failed to load widget data');
      }
      setIsLoading(false);
    });

    // Set up auto-refresh if specified
    if (refreshRate && refreshRate > 0) {
      refreshIntervalRef.current = setInterval(() => {
        socket.emit('widget:refresh', widgetId);
      }, refreshRate * 1000);
    }

    return () => {
      if (socket) {
        socket.off('widget:update', handleWidgetUpdate);
        unsubscribeFromWidget(widgetId);
      }

      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [widgetId, refreshRate]);

  const refreshWidget = useCallback(() => {
    const socket = getSocket();
    if (!socket) {return;}

    setIsLoading(true);
    setError(null);

    socket.emit('widget:refresh', widgetId, (success: boolean, widgetData: WidgetData) => {
      if (success && widgetData) {
        setData(widgetData.data);
        setLastUpdated(new Date(widgetData.lastUpdated));
        setError(null);
      } else {
        setError('Failed to refresh widget data');
      }
      setIsLoading(false);
    });
  }, [widgetId]);

  const updateWidget = useCallback((newData: Partial<T>) => {
    const socket = getSocket();
    if (!socket) {return Promise.resolve(false);}

    return new Promise<boolean>((resolve) => {
      socket.emit('widget:update_data', widgetId, newData, (success: boolean) => {
        if (!success) {
          setError('Failed to update widget data');
        }
        resolve(success);
      });
    });
  }, [widgetId]);

  return {
    data,
    lastUpdated,
    isLoading,
    error,
    refreshWidget,
    updateWidget,
  };
};

/**
 * Hook for managing multiple data subscriptions
 */
export const useMultiDataSync = () => {
  const [subscriptions, setSubscriptions] = useState<Map<string, {
    data: any;
    lastUpdated: Date;
    version: number;
    error?: string;
  }>>(new Map());

  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {return;}

    socketRef.current = socket;

    // Listen for all data sync events
    const handleDataSync = (syncData: SyncData) => {
      setSubscriptions(prev => {
        const updated = new Map(prev);
        updated.set(syncData.type, {
          data: syncData.data,
          lastUpdated: syncData.timestamp,
          version: syncData.version,
        });
        return updated;
      });
    };

    socket.on('data:sync', handleDataSync);

    return () => {
      if (socket) {
        socket.off('data:sync', handleDataSync);
      }
    };
  }, []);

  const subscribe = useCallback((dataType: string, filters?: any) => {
    const socket = getSocket();
    if (!socket) {return Promise.resolve(false);}

    subscribeToData(dataType, filters);

    return new Promise<boolean>((resolve) => {
      socket.emit('data:request', { type: dataType, filters }, (success: boolean, initialData: any) => {
        if (success) {
          setSubscriptions(prev => {
            const updated = new Map(prev);
            updated.set(dataType, {
              data: initialData.data || null,
              lastUpdated: initialData.timestamp ? new Date(initialData.timestamp) : new Date(),
              version: initialData.version || 0,
            });
            return updated;
          });
        } else {
          setSubscriptions(prev => {
            const updated = new Map(prev);
            updated.set(dataType, {
              data: null,
              lastUpdated: new Date(),
              version: 0,
              error: 'Failed to load data',
            });
            return updated;
          });
        }
        resolve(success);
      });
    });
  }, []);

  const unsubscribe = useCallback((dataType: string) => {
    unsubscribeFromData(dataType);
    setSubscriptions(prev => {
      const updated = new Map(prev);
      updated.delete(dataType);
      return updated;
    });
  }, []);

  const getData = useCallback((dataType: string) => {
    return subscriptions.get(dataType) || null;
  }, [subscriptions]);

  return {
    subscriptions: Array.from(subscriptions.entries()).map(([type, data]) => ({ type, ...data })),
    subscribe,
    unsubscribe,
    getData,
  };
};

/**
 * Hook for data synchronization with optimistic updates
 */
export const useOptimisticDataSync = <T = any>(dataType: string, filters?: any) => {
  const {
    data: serverData,
    lastUpdated,
    version,
    isLoading,
    error,
    refreshData,
    updateData: serverUpdateData
  } = useDataSync<T>(dataType, filters);

  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  // Use optimistic data if available, otherwise server data
  const data = optimisticData !== null ? optimisticData : serverData;

  // Reset optimistic data when server data changes
  useEffect(() => {
    if (serverData !== null && optimisticData === null) {
      // First server data load
      return;
    }

    if (serverData !== null && pendingUpdates.size === 0) {
      // Server data updated and no pending operations
      setOptimisticData(null);
    }
  }, [serverData, optimisticData, pendingUpdates.size]);

  const updateData = useCallback(async (newData: Partial<T>, updateId?: string) => {
    const id = updateId || `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Apply optimistic update
    setOptimisticData(prev => {
      const base = prev !== null ? prev : serverData;
      return base ? { ...base, ...newData } : newData as T;
    });

    // Track pending update
    setPendingUpdates(prev => new Set([...prev, id]));

    try {
      // Send to server
      const success = await serverUpdateData(newData);

      if (!success) {
        // Revert optimistic update on failure
        setOptimisticData(null);
        return false;
      }

      return true;
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticData(null);
      return false;
    } finally {
      // Remove from pending updates
      setPendingUpdates(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  }, [serverData, serverUpdateData]);

  const revertOptimisticUpdates = useCallback(() => {
    setOptimisticData(null);
    setPendingUpdates(new Set());
  }, []);

  return {
    data,
    serverData,
    lastUpdated,
    version,
    isLoading,
    error,
    refreshData,
    updateData,
    revertOptimisticUpdates,
    hasPendingUpdates: pendingUpdates.size > 0,
    pendingUpdatesCount: pendingUpdates.size,
  };
};