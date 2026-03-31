import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../stores/authStore';
import {
  registerForPushNotificationsAsync,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from '../lib/notifications';

export function useNotifications() {
  const { user, profile } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (user?.id && profile?.onboarding_completed) {
      // Register for push notifications
      registerForPushNotificationsAsync(user.id);

      // Handle notifications received while app is foregrounded
      notificationListener.current = addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

      // Handle notification taps
      responseListener.current = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data;

        if (data.type === 'class_reminder' && data.classId) {
          router.push(`/notes/new?classId=${data.classId}`);
        } else if (data.type === 'study_prompt' && data.promptId) {
          router.push(`/prompt/${data.promptId}`);
        }
      });
    }

    return () => {
      // Use .remove() method on subscriptions (newer API)
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id, profile?.onboarding_completed]);
}
