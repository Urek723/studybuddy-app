import { useContext, useMemo, useCallback } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';
import { supabase } from '../config/supabase';

export default function useNotifications() {
  const { notifications, setNotifications } = useContext(NotificationContext);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  // FIX #16: persist is_read=true to Supabase, not just local state
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      console.error('Error marking notifications as read:', error);
      // Revert optimistic update on failure
      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: false } : n)
      );
    }
  }, [notifications, setNotifications]);

  return { notifications, unreadCount, markAllAsRead };
}