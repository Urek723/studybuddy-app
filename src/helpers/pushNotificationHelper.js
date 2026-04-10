import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
      console.log('Push notification permission not granted.');
      return null;
    }

    // Fixed: pass projectId required for production EAS builds
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('No EAS projectId found in app config. Push token may not work in production.');
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log('Push token:', token);
  } else {
    console.log('Must use physical device for push notifications.');
  }

  return token;
}

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
      trigger: null,
    });
  } catch (error) {
    console.error('Error scheduling local notification:', error);
  }
}

export function setupNotificationListeners(onDataReceived) {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const { data } = notification.request.content;
      if (onDataReceived && data) {
        onDataReceived(data);
      }
    }
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const { data } = response.notification.request.content;
      if (onDataReceived && data) {
        onDataReceived(data);
      }
    }
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

export async function triggerEventNotification(eventType, eventData) {
  try {
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
    await scheduleLocalNotification({ title, body, data: { eventType, ...eventData } });
  } catch (error) {
    console.error('Error triggering event notification:', error);
  }
}

export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

export async function getNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}