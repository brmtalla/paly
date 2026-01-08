import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });

    await Notifications.setNotificationChannelAsync('study-prompts', {
      name: 'Study Prompts',
      description: 'Daily study prompts from your companion',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('class-reminders', {
      name: 'Class Reminders',
      description: 'Reminders before your classes start',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
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

    try {
      // For Expo SDK 54, we need a valid EAS Project ID.
      // If you haven't run `eas project:init`, this will fail with "Invalid uuid".
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      
      if (!projectId || projectId === 'paly-study-companion') {
        console.warn('EAS Project ID is missing or invalid in app.json. Push notifications will not work.');
        return null;
      }

      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = pushToken.data;

      // Save token to database
      await savePushToken(userId, token);
    } catch (error) {
      console.warn('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const platform = Platform.OS as 'ios' | 'android' | 'web';

    // Upsert the token
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          is_active: true,
        },
        {
          onConflict: 'user_id,token',
        }
      );

    if (error) {
      console.error('Error saving push token:', error);
    }
  } catch (error) {
    console.error('Error in savePushToken:', error);
  }
}

export async function scheduleClassReminder(
  classId: string,
  className: string,
  startTime: Date,
  minutesBefore: number = 10
): Promise<string> {
  const triggerDate = new Date(startTime.getTime() - minutesBefore * 60 * 1000);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `📚 ${className} starts soon`,
      body: `Your class starts in ${minutesBefore} minutes. Ready to take notes?`,
      data: { type: 'class_reminder', classId },
      sound: 'default',
    },
    trigger: {
      date: triggerDate,
      channelId: 'class-reminders',
    },
  });

  return identifier;
}

export async function scheduleStudyPrompt(
  promptId: string,
  className: string,
  content: string,
  scheduledTime: Date
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💡 Time to study ${className}`,
      body: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
      data: { type: 'study_prompt', promptId },
      sound: 'default',
    },
    trigger: {
      date: scheduledTime,
      channelId: 'study-prompts',
    },
  });

  return identifier;
}

export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export async function getBadgeCountAsync(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

export async function setBadgeCountAsync(count: number): Promise<boolean> {
  return await Notifications.setBadgeCountAsync(count);
}

