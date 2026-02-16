import { useContext, useMemo } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

export default function useNotifications() {
  const { notifications, setNotifications } = useContext(NotificationContext);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
  };

  return { notifications, unreadCount, markAllAsRead };
}
