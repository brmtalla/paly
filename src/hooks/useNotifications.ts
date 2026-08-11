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
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    if (user?.id && profile?.onboarding_completed) {
      // Register for push notifications
      registerForPushNotificationsAsync(user.id);

      // Keep a foreground listener registered so the notification handler runs
      // and the banner is shown while the app is open.
      notificationListener.current = addNotificationReceivedListener(() => {});

      // Handle notification taps
      responseListener.current = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data;

        if (data.type === 'class_reminder' && data.classId) {
          router.push(`/notes/new?classId=${data.classId}`);
        } else if (data.type === 'quiz_prompt' && data.synthesizedContentId) {
          router.push(`/study/quiz/${data.synthesizedContentId}`);
        } else if (data.type === 'study_prompt' && data.promptId) {
          // The chunk viewer — not /prompt/[id] — is what credits the reading
          // streak once the student scrolls to the bottom.
          router.push(`/study/chunk/${data.promptId}`);
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
