// Location: src/helpers/pushNotificationHelper.js
// Push notification setup for silent background fetch with optional local notifications

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get Expo push token
 * @returns {Promise<string|null>} Expo push token or null if registration fails
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Save push token to user's profile in Supabase
 * @param {string} userId - User ID
 * @param {string} pushToken - Expo push token
 */
export async function savePushTokenToProfile(userId, pushToken) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: pushToken })
      .eq('id', userId);

    if (error) throw error;
    console.log('Push token saved successfully');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Schedule a local notification (shown to user)
 * @param {object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {object} options.data - Additional data payload
 */
export async function scheduleLocalNotification({ title, body, data = {} }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error scheduling local notification:', error);
  }
}

/**
 * Handle background notification received (silent or with banner)
 * This is called when a push notification is received
 * @param {object} notification - The notification object
 * @param {function} onDataReceived - Callback to handle data updates
 */
export function setupNotificationListeners(onDataReceived) {
  // Listener for notifications received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
    
    const { data } = notification.request.content;
    
    // Trigger data refresh
    if (onDataReceived && data) {
      onDataReceived(data);
    }
  });

  // Listener for notification responses (user tapped notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    
    const { data } = response.notification.request.content;
    
    // Handle navigation or actions based on notification data
    if (onDataReceived && data) {
      onDataReceived(data);
    }
  });

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Setup background fetch for silent data updates
 * Note: This requires additional configuration in app.json
 * 
 * Example app.json configuration:
 * {
 *   "expo": {
 *     "ios": {
 *       "infoPlist": {
 *         "UIBackgroundModes": ["fetch", "remote-notification"]
 *       }
 *     },
 *     "android": {
 *       "useNextNotificationsApi": true
 *     }
 *   }
 * }
 */

/**
 * Send a silent push notification (server-side function example)
 * This should be called from your backend/Supabase Edge Function
 * 
 * Example Supabase Edge Function:
 * 
 * ```typescript
 * import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
 * 
 * serve(async (req) => {
 *   const { pushToken, data } = await req.json()
 *   
 *   const message = {
 *     to: pushToken,
 *     sound: null, // Silent notification
 *     title: null, // No banner
 *     body: null,  // No banner
 *     data: data,  // Custom data payload
 *     priority: 'high',
 *     channelId: 'default',
 *   }
 *   
 *   const response = await fetch('https://exp.host/--/api/v2/push/send', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *     },
 *     body: JSON.stringify(message),
 *   })
 *   
 *   return new Response(JSON.stringify({ success: true }), {
 *     headers: { 'Content-Type': 'application/json' },
 *   })
 * })
 * ```
 */

/**
 * Trigger notification for specific events
 * @param {string} eventType - Type of event (session_created, group_updated, etc.)
 * @param {object} eventData - Event data
 */
export async function triggerEventNotification(eventType, eventData) {
  try {
    // Determine notification content based on event type
    let title, body;
    
    switch (eventType) {
      case 'session_created':
        title = 'New Study Session';
        body = `${eventData.title} scheduled`;
        break;
      case 'session_updated':
        title = 'Session Updated';
        body = `${eventData.title} has been updated`;
        break;
      case 'group_member_added':
        title = 'New Group Member';
        body = `${eventData.memberName} joined ${eventData.groupName}`;
        break;
      case 'calendar_update':
        title = 'Calendar Updated';
        body = 'Your calendar has new changes';
        break;
      default:
        title = 'Update';
        body = 'New activity in StudyBuddy';
    }
    
    // Schedule local notification
    await scheduleLocalNotification({
      title,
      body,
      data: { eventType, ...eventData },
    });
  } catch (error) {
    console.error('Error triggering event notification:', error);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Get notification permissions status
 * @returns {Promise<string>} Permission status
 */
export async function getNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}