import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';

const RefreshContext = createContext(null);

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};

export const RefreshProvider = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const subscriptionsRef = useRef(new Map());

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const subscribeToTable = useCallback((tableName, filter, callback) => {
    const channelName = filter 
      ? `${tableName}_${JSON.stringify(filter)}`
      : tableName;

    if (subscriptionsRef.current.has(channelName)) {
      return () => {};
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(filter && { filter }),
        },
        (payload) => {
          callback(payload);
          triggerRefresh();
        }
      )
      .subscribe();

    subscriptionsRef.current.set(channelName, channel);

    return () => {
      const ch = subscriptionsRef.current.get(channelName);
      if (ch) {
        supabase.removeChannel(ch);
        subscriptionsRef.current.delete(channelName);
      }
    };
  }, [triggerRefresh]);

  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  const refreshHome = triggerRefresh;
  const refreshGroups = triggerRefresh;
  const refreshCalendar = triggerRefresh;
  const refreshQuizzes = triggerRefresh;
  const refreshProgress = triggerRefresh;
  const refreshAll = triggerRefresh;

  const value = {
    refreshKey,
    triggerRefresh,
    subscribeToTable,
    refreshHome,
    refreshGroups,
    refreshCalendar,
    refreshQuizzes,
    refreshProgress,
    refreshAll,
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};